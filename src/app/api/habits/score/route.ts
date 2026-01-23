import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { HabitFrequency } from "@prisma/client";

// Helper to get the Monday of the current week
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Get days elapsed in the current week (1-7)
function getDaysInWeekSoFar(): number {
  const now = new Date();
  const day = now.getUTCDay();
  // Sunday = 0, so we treat it as day 7
  return day === 0 ? 7 : day;
}

// Calculate expected completions for a habit based on frequency
function getExpectedCompletions(
  frequency: HabitFrequency,
  scheduledDays: number[],
  targetPerWeek: number | null,
  daysElapsed: number,
): number {
  const today = new Date();
  const weekStart = getWeekStart(today);

  switch (frequency) {
    case "DAILY":
      return daysElapsed;
    case "WEEKDAYS": {
      // Count weekdays (Mon-Fri) that have passed this week
      let count = 0;
      for (let i = 0; i < daysElapsed; i++) {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + i);
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) count++;
      }
      return count;
    }
    case "WEEKENDS": {
      // Count weekend days (Sat-Sun) that have passed this week
      let count = 0;
      for (let i = 0; i < daysElapsed; i++) {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + i);
        const dayOfWeek = d.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) count++;
      }
      return count;
    }
    case "SPECIFIC_DAYS": {
      // Count scheduled days that have passed this week
      let count = 0;
      for (let i = 0; i < daysElapsed; i++) {
        const d = new Date(weekStart);
        d.setUTCDate(d.getUTCDate() + i);
        const dayOfWeek = d.getUTCDay();
        if (scheduledDays.includes(dayOfWeek)) count++;
      }
      return count;
    }
    case "X_PER_WEEK":
      // For X per week, expected is proportional to days elapsed
      // But we cap it at targetPerWeek
      return targetPerWeek || 0;
    default:
      return daysElapsed;
  }
}

// GET weekly execution score
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getWeekStart();
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  const daysElapsed = getDaysInWeekSoFar();

  // Get all active habits for this user with their frequency settings
  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      id: true,
      frequency: true,
      scheduledDays: true,
      targetPerWeek: true,
    },
  });

  if (habits.length === 0) {
    return NextResponse.json({
      weeklyScore: 0,
      totalPossible: 0,
      totalCompleted: 0,
      daysElapsed,
    });
  }

  // Get all completions for this week grouped by habit
  const completions = await prisma.completion.findMany({
    where: {
      habit: {
        userId: session.user.id,
        isActive: true,
      },
      date: {
        gte: weekStart,
        lte: today,
      },
    },
  });

  // Calculate total expected completions based on each habit's frequency
  let totalPossible = 0;
  for (const habit of habits) {
    const expected = getExpectedCompletions(
      habit.frequency,
      habit.scheduledDays,
      habit.targetPerWeek,
      daysElapsed,
    );
    totalPossible += expected;
  }

  // Total completed = number of completions this week
  const totalCompleted = completions.length;

  // Weekly score as percentage (cap at 100%)
  const weeklyScore =
    totalPossible > 0
      ? Math.min(100, Math.round((totalCompleted / totalPossible) * 100))
      : 0;

  return NextResponse.json({
    weeklyScore,
    totalPossible,
    totalCompleted,
    daysElapsed,
    habitCount: habits.length,
  });
}
