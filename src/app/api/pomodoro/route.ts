import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get pomodoro sessions (with optional filters)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const habitId = searchParams.get("habitId");
  const taskId = searchParams.get("taskId");

  // Build where clause
  const where: {
    userId: string;
    habitId?: string;
    taskId?: string;
    completedAt?: { gte: Date; lt: Date };
  } = {
    userId: session.user.id,
  };

  if (habitId) where.habitId = habitId;
  if (taskId) where.taskId = taskId;

  if (dateParam) {
    const date = new Date(dateParam);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    where.completedAt = { gte: date, lt: nextDay };
  }

  const sessions = await prisma.pomodoroSession.findMany({
    where,
    orderBy: { completedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(sessions);
}

// Create a new pomodoro session
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { mode, duration, habitId, taskId, taskName } = body;

  if (!mode || !duration) {
    return NextResponse.json(
      { error: "Mode and duration are required" },
      { status: 400 },
    );
  }

  const pomodoroSession = await prisma.pomodoroSession.create({
    data: {
      mode,
      duration,
      userId: session.user.id,
      habitId: habitId || null,
      taskId: taskId || null,
      taskName: taskName || null,
    },
  });

  return NextResponse.json(pomodoroSession);
}
