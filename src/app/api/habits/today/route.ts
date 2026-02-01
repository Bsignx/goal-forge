import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { HabitFrequency } from "@prisma/client";

// Check if a habit is scheduled for a given day
function isHabitScheduledForDay(
  frequency: HabitFrequency,
  scheduledDays: number[],
  targetPerWeek: number | null,
  dayOfWeek: number, // 0=Sun, 1=Mon, ..., 6=Sat
  completionsThisWeek: number,
): boolean {
  switch (frequency) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
    case "WEEKENDS":
      return dayOfWeek === 0 || dayOfWeek === 6; // Sat-Sun
    case "SPECIFIC_DAYS":
      return scheduledDays.includes(dayOfWeek);
    case "X_PER_WEEK":
      // Show if target not yet met this week
      return targetPerWeek ? completionsThisWeek < targetPerWeek : true;
    default:
      return true;
  }
}

// Check if a specific date should count for streak based on habit frequency
function shouldDateCountForStreak(
  frequency: HabitFrequency,
  scheduledDays: number[],
  date: Date,
): boolean {
  const dayOfWeek = date.getUTCDay();
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
      // For X_PER_WEEK, we don't track streaks in the traditional sense
      return false;
    default:
      return true;
  }
}

// Calculate current streak for a habit
function calculateStreak(
  completions: { date: Date }[],
  frequency: HabitFrequency,
  scheduledDays: number[],
  targetDate: Date,
): number {
  if (frequency === "X_PER_WEEK") {
    // X_PER_WEEK doesn't have a traditional streak
    return 0;
  }

  // Sort completions by date descending
  const sortedDates = completions
    .map((c) => c.date.getTime())
    .sort((a, b) => b - a);

  if (sortedDates.length === 0) return 0;

  let streak = 0;
  const checkDate = new Date(targetDate);
  checkDate.setUTCHours(0, 0, 0, 0);

  // If today is not a scheduled day, start from the last scheduled day
  while (!shouldDateCountForStreak(frequency, scheduledDays, checkDate)) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  // Check if the most recent scheduled day was completed
  const checkDateMs = checkDate.getTime();
  if (!sortedDates.includes(checkDateMs)) {
    // If today (or last scheduled day) isn't completed, check if we're still in grace
    // For now, if today isn't done, streak is 0
    return 0;
  }

  // Count consecutive scheduled days that were completed
  while (true) {
    const dateMs = checkDate.getTime();

    if (shouldDateCountForStreak(frequency, scheduledDays, checkDate)) {
      if (sortedDates.includes(dateMs)) {
        streak++;
      } else {
        // Missed a scheduled day - streak ends
        break;
      }
    }

    // Move to previous day
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);

    // Safety: don't go back more than 365 days
    if (streak > 365) break;
  }

  return streak;
}

// Get the Monday of the current week
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Get habits with completion status for a specific date
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get date from query param or default to today
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");

  let targetDate: Date;
  if (dateParam) {
    targetDate = new Date(dateParam + "T00:00:00.000Z");
  } else {
    targetDate = new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
  }

  const dayOfWeek = targetDate.getUTCDay();
  const weekStart = getWeekStart(targetDate);

  // Get date 365 days ago for streak calculation
  const yearAgo = new Date(targetDate);
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 365);

  // Get all habits with completions for streak calculation
  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          date: {
            gte: yearAgo,
            lte: targetDate,
          },
        },
        orderBy: { date: "desc" },
      },
      identity: true,
    },
    orderBy: { order: "asc" },
  });

  // Transform to include completed flag, schedule info, streak, and filter by schedule
  const habitsWithStatus = habits.map((habit) => {
    const targetDateCompletion = habit.completions.find(
      (c) => c.date.getTime() === targetDate.getTime(),
    );

    // Count completions this week only
    const completionsThisWeek = habit.completions.filter(
      (c) =>
        c.date.getTime() >= weekStart.getTime() &&
        c.date.getTime() <= targetDate.getTime(),
    ).length;

    const isScheduledForDate = isHabitScheduledForDay(
      habit.frequency,
      habit.scheduledDays,
      habit.targetPerWeek,
      dayOfWeek,
      completionsThisWeek - (targetDateCompletion ? 1 : 0), // Don't count target date if already done
    );

    // Calculate streak
    const currentStreak = calculateStreak(
      habit.completions,
      habit.frequency,
      habit.scheduledDays,
      targetDate,
    );

    return {
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      order: habit.order,
      completed: !!targetDateCompletion,
      completionMode: targetDateCompletion?.mode || null,
      identityId: habit.identityId,
      identity: habit.identity,
      fullDescription: habit.fullDescription,
      recoveryDescription: habit.recoveryDescription,
      minimalDescription: habit.minimalDescription,
      frequency: habit.frequency,
      scheduledDays: habit.scheduledDays,
      targetPerWeek: habit.targetPerWeek,
      completionsThisWeek,
      isScheduledToday: isScheduledForDate,
      currentStreak,
    };
  });

  return NextResponse.json(habitsWithStatus);
}
