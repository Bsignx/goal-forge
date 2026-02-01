import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET - Fetch aggregated statistics
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week"; // week, month, year

  // Calculate date ranges
  const now = new Date();
  let startDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;

  if (period === "week") {
    // This week (Mon-Sun)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(now);
    startDate.setDate(now.getDate() + mondayOffset);
    startDate.setHours(0, 0, 0, 0);

    // Previous week
    previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - 6);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Previous month
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    // year
    startDate = new Date(now.getFullYear(), 0, 1);

    // Previous year
    previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
    previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
  }

  try {
    // 1. Habit Completion Rates
    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true },
      include: {
        completions: {
          where: {
            date: { gte: startDate },
          },
        },
        identity: true,
      },
    });

    // Calculate completion rate per habit
    const habitStats = await Promise.all(
      habits.map(async (habit) => {
        // Count expected days based on frequency
        const expectedDays = countExpectedDays(
          habit.frequency,
          habit.scheduledDays,
          habit.targetPerWeek,
          startDate,
          now
        );

        const completedDays = habit.completions.length;
        const completionRate = expectedDays > 0 
          ? Math.round((completedDays / expectedDays) * 100)
          : 0;

        // Get previous period completions
        const prevCompletions = await prisma.completion.count({
          where: {
            habitId: habit.id,
            date: {
              gte: previousStartDate,
              lte: previousEndDate,
            },
          },
        });

        const prevExpected = countExpectedDays(
          habit.frequency,
          habit.scheduledDays,
          habit.targetPerWeek,
          previousStartDate,
          previousEndDate
        );

        const prevRate = prevExpected > 0
          ? Math.round((prevCompletions / prevExpected) * 100)
          : 0;

        return {
          id: habit.id,
          name: habit.name,
          emoji: habit.emoji,
          identity: habit.identity?.name,
          completedDays,
          expectedDays,
          completionRate,
          trend: completionRate - prevRate, // positive = improving
        };
      })
    );

    // Sort by completion rate (best performing first)
    habitStats.sort((a, b) => b.completionRate - a.completionRate);

    // Overall completion rate
    const totalExpected = habitStats.reduce((sum, h) => sum + h.expectedDays, 0);
    const totalCompleted = habitStats.reduce((sum, h) => sum + h.completedDays, 0);
    const overallRate = totalExpected > 0
      ? Math.round((totalCompleted / totalExpected) * 100)
      : 0;

    // 2. Daily Completion Data (for chart)
    const dailyData = await getDailyCompletionData(userId, startDate, now, period);

    // 3. Energy Level Patterns
    const energyLevels = await prisma.dailyEnergyLevel.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: "asc" },
    });

    const energyDistribution = {
      FULL: energyLevels.filter((e) => e.mode === "FULL").length,
      RECOVERY: energyLevels.filter((e) => e.mode === "RECOVERY").length,
      MINIMAL: energyLevels.filter((e) => e.mode === "MINIMAL").length,
    };

    // Energy by day of week
    const energyByDay = getEnergyByDayOfWeek(energyLevels);

    // 4. Focus Time Trends (Pomodoro)
    const pomodoroSessions = await prisma.pomodoroSession.findMany({
      where: {
        userId,
        completedAt: { gte: startDate },
        mode: "work",
      },
      orderBy: { completedAt: "asc" },
    });

    const totalFocusMinutes = pomodoroSessions.reduce(
      (sum, s) => sum + s.duration,
      0
    );

    const focusByDay = getFocusByDay(pomodoroSessions, startDate, now, period);

    // Get top activities by focus time
    const activityFocus = await prisma.pomodoroSession.groupBy({
      by: ["habitId", "taskId", "taskName"],
      where: {
        userId,
        completedAt: { gte: startDate },
        mode: "work",
      },
      _sum: { duration: true },
      _count: true,
    });

    // Fetch habit/task names for activities
    const topActivities = await Promise.all(
      activityFocus
        .filter((a) => a._sum.duration && a._sum.duration > 0)
        .sort((a, b) => (b._sum.duration || 0) - (a._sum.duration || 0))
        .slice(0, 5)
        .map(async (a) => {
          let name = a.taskName || "Unnamed";
          let emoji = "⏱️";
          let type = "custom";

          if (a.habitId) {
            const habit = await prisma.habit.findUnique({
              where: { id: a.habitId },
              select: { name: true, emoji: true },
            });
            if (habit) {
              name = habit.name;
              emoji = habit.emoji;
              type = "habit";
            }
          } else if (a.taskId) {
            const task = await prisma.task.findUnique({
              where: { id: a.taskId },
              select: { name: true, emoji: true },
            });
            if (task) {
              name = task.name;
              emoji = task.emoji;
              type = "task";
            }
          }

          return {
            name,
            emoji,
            type,
            totalMinutes: a._sum.duration || 0,
            sessions: a._count,
          };
        })
    );

    // 5. Life Radar Summary
    const radarEntries = await prisma.lifeRadar.findMany({
      where: {
        userId,
        weekStart: { gte: startDate },
      },
      orderBy: { weekStart: "desc" },
    });

    const radarSummary = getRadarSummary(radarEntries);

    // 6. Streak data
    const currentStreaks = await getCurrentStreaks(userId, habits);

    return NextResponse.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      habits: {
        overallRate,
        totalCompleted,
        totalExpected,
        byHabit: habitStats,
        dailyData,
      },
      energy: {
        distribution: energyDistribution,
        byDayOfWeek: energyByDay,
        totalDays: energyLevels.length,
      },
      focus: {
        totalMinutes: totalFocusMinutes,
        totalSessions: pomodoroSessions.length,
        avgMinutesPerDay: Math.round(
          totalFocusMinutes / Math.max(1, getDaysDiff(startDate, now))
        ),
        byDay: focusByDay,
        topActivities,
      },
      radar: radarSummary,
      streaks: currentStreaks,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

// Helper: Count expected days based on habit frequency
function countExpectedDays(
  frequency: string,
  scheduledDays: number[],
  targetPerWeek: number | null,
  start: Date,
  end: Date
): number {
  const days = getDaysDiff(start, end);
  
  switch (frequency) {
    case "DAILY":
      return days;
    case "WEEKDAYS":
      return countWeekdays(start, end);
    case "WEEKENDS":
      return countWeekends(start, end);
    case "SPECIFIC_DAYS":
      return countSpecificDays(start, end, scheduledDays);
    case "X_PER_WEEK":
      // For X per week, expected is targetPerWeek * number of weeks
      const weeks = Math.max(1, Math.ceil(days / 7));
      return weeks * (targetPerWeek || 1);
    default:
      return days;
  }
}

function getDaysDiff(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function countWeekends(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day === 0 || day === 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function countSpecificDays(start: Date, end: Date, days: number[]): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (days.includes(current.getDay())) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

async function getDailyCompletionData(
  userId: string,
  start: Date,
  end: Date,
  period: string
) {
  const completions = await prisma.completion.findMany({
    where: {
      habit: { userId },
      date: { gte: start, lte: end },
    },
    include: {
      habit: {
        select: { id: true },
      },
    },
    orderBy: { date: "asc" },
  });

  // Group by date
  const byDate = new Map<string, number>();
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    byDate.set(dateStr, 0);
    current.setDate(current.getDate() + 1);
  }

  completions.forEach((c) => {
    const dateStr = new Date(c.date).toISOString().split("T")[0];
    byDate.set(dateStr, (byDate.get(dateStr) || 0) + 1);
  });

  return Array.from(byDate.entries()).map(([date, count]) => ({
    date,
    count,
    label: formatDateLabel(date, period),
  }));
}

function formatDateLabel(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (period === "week") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  } else if (period === "month") {
    return date.getDate().toString();
  }
  return date.toLocaleDateString("en-US", { month: "short" });
}

function getEnergyByDayOfWeek(
  energyLevels: { date: Date; mode: string }[]
): Record<string, { FULL: number; RECOVERY: number; MINIMAL: number }> {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: Record<string, { FULL: number; RECOVERY: number; MINIMAL: number }> = {};

  days.forEach((day) => {
    result[day] = { FULL: 0, RECOVERY: 0, MINIMAL: 0 };
  });

  energyLevels.forEach((e) => {
    const dayName = days[new Date(e.date).getDay()];
    result[dayName][e.mode as keyof typeof result[typeof dayName]]++;
  });

  return result;
}

function getFocusByDay(
  sessions: { completedAt: Date; duration: number }[],
  start: Date,
  end: Date,
  period: string
) {
  const byDate = new Map<string, number>();
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    byDate.set(dateStr, 0);
    current.setDate(current.getDate() + 1);
  }

  sessions.forEach((s) => {
    const dateStr = new Date(s.completedAt).toISOString().split("T")[0];
    byDate.set(dateStr, (byDate.get(dateStr) || 0) + s.duration);
  });

  return Array.from(byDate.entries()).map(([date, minutes]) => ({
    date,
    minutes,
    label: formatDateLabel(date, period),
  }));
}

function getRadarSummary(entries: { body: string; mind: string; profession: string; projects: string; environment: string }[]) {
  if (entries.length === 0) return null;

  const areas = ["body", "mind", "profession", "projects", "environment"] as const;
  const statusValues = { GREEN: 3, YELLOW: 2, RED: 1 };

  const averages: Record<string, number> = {};
  const latest: Record<string, string> = {};

  areas.forEach((area) => {
    const sum = entries.reduce(
      (acc, e) => acc + statusValues[e[area] as keyof typeof statusValues],
      0
    );
    averages[area] = Math.round((sum / entries.length) * 100) / 100;
    latest[area] = entries[0][area];
  });

  return {
    weeksTracked: entries.length,
    averages,
    latest,
  };
}

async function getCurrentStreaks(
  userId: string,
  habits: { id: string; name: string; emoji: string; frequency: string; scheduledDays: number[] }[]
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streaks = await Promise.all(
    habits.slice(0, 5).map(async (habit) => {
      const completions = await prisma.completion.findMany({
        where: { habitId: habit.id },
        orderBy: { date: "desc" },
        take: 365,
      });

      let streak = 0;
      const checkDate = new Date(today);

      for (let i = 0; i < 365; i++) {
        const isScheduled = isDayScheduled(
          habit.frequency,
          habit.scheduledDays,
          checkDate
        );

        if (isScheduled) {
          const dateStr = checkDate.toISOString().split("T")[0];
          const hasCompletion = completions.some(
            (c) => new Date(c.date).toISOString().split("T")[0] === dateStr
          );

          if (hasCompletion) {
            streak++;
          } else if (i > 0) {
            // Allow today to be incomplete
            break;
          }
        }

        checkDate.setDate(checkDate.getDate() - 1);
      }

      return {
        id: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        streak,
      };
    })
  );

  return streaks.sort((a, b) => b.streak - a.streak);
}

function isDayScheduled(
  frequency: string,
  scheduledDays: number[],
  date: Date
): boolean {
  const dayOfWeek = date.getDay();

  switch (frequency) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "WEEKENDS":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "SPECIFIC_DAYS":
      return scheduledDays.includes(dayOfWeek);
    case "X_PER_WEEK":
      return true;
    default:
      return true;
  }
}
