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

// Get the Monday of the current week
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Get today's completions for the current user
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get today's date at midnight (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = today.getUTCDay();
  const weekStart = getWeekStart(today);

  // Get all habits with today's completion status and this week's completions
  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          date: {
            gte: weekStart,
            lte: today,
          },
        },
      },
      identity: true,
    },
    orderBy: { order: "asc" },
  });

  // Transform to include completed flag, schedule info, and filter by schedule
  const habitsWithStatus = habits.map((habit) => {
    const todayCompletion = habit.completions.find(
      (c) => c.date.getTime() === today.getTime(),
    );
    const completionsThisWeek = habit.completions.length;
    const isScheduledToday = isHabitScheduledForDay(
      habit.frequency,
      habit.scheduledDays,
      habit.targetPerWeek,
      dayOfWeek,
      completionsThisWeek - (todayCompletion ? 1 : 0), // Don't count today if already done
    );

    return {
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      order: habit.order,
      completed: !!todayCompletion,
      completionMode: todayCompletion?.mode || null,
      identityId: habit.identityId,
      identity: habit.identity,
      fullDescription: habit.fullDescription,
      recoveryDescription: habit.recoveryDescription,
      minimalDescription: habit.minimalDescription,
      frequency: habit.frequency,
      scheduledDays: habit.scheduledDays,
      targetPerWeek: habit.targetPerWeek,
      completionsThisWeek,
      isScheduledToday,
    };
  });

  return NextResponse.json(habitsWithStatus);
}
