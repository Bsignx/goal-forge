import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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

  // Get all active habits for this user
  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (habits.length === 0) {
    return NextResponse.json({
      weeklyScore: 0,
      totalPossible: 0,
      totalCompleted: 0,
      daysElapsed: getDaysInWeekSoFar(),
    });
  }

  // Get all completions for this week
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

  const daysElapsed = getDaysInWeekSoFar();
  const habitCount = habits.length;
  
  // Total possible = habits × days elapsed in the week
  const totalPossible = habitCount * daysElapsed;
  
  // Total completed = number of completions this week
  const totalCompleted = completions.length;
  
  // Weekly score as percentage
  const weeklyScore = totalPossible > 0 
    ? Math.round((totalCompleted / totalPossible) * 100) 
    : 0;

  return NextResponse.json({
    weeklyScore,
    totalPossible,
    totalCompleted,
    daysElapsed,
    habitCount,
  });
}
