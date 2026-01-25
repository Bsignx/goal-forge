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

  // Get all habits with completion status for target date and this week's completions
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
            lte: targetDate,
          },
        },
      },
      identity: true,
    },
    orderBy: { order: "asc" },
  });

  // Transform to include completed flag, schedule info, and filter by schedule
  const habitsWithStatus = habits.map((habit) => {
    const targetDateCompletion = habit.completions.find(
      (c) => c.date.getTime() === targetDate.getTime(),
    );
    const completionsThisWeek = habit.completions.length;
    const isScheduledForDate = isHabitScheduledForDay(
      habit.frequency,
      habit.scheduledDays,
      habit.targetPerWeek,
      dayOfWeek,
      completionsThisWeek - (targetDateCompletion ? 1 : 0), // Don't count target date if already done
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
    };
  });

  return NextResponse.json(habitsWithStatus);
}
