import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

  // Get all habits with today's completion status
  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          date: today,
        },
      },
      identity: true,
    },
    orderBy: { order: "asc" },
  });

  // Transform to include completed flag
  const habitsWithStatus = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji,
    order: habit.order,
    completed: habit.completions.length > 0,
    identityId: habit.identityId,
    identity: habit.identity,
  }));

  return NextResponse.json(habitsWithStatus);
}
