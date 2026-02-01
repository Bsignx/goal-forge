import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get pomodoro stats (time spent per activity)
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week"; // "day", "week", "month"

  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      // Today only
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setDate(startDate.getDate() - 30);
      break;
  }

  // Get all work sessions in the period
  const sessions = await prisma.pomodoroSession.findMany({
    where: {
      userId: session.user.id,
      mode: "work",
      completedAt: { gte: startDate, lte: now },
    },
    orderBy: { completedAt: "desc" },
  });

  // Get habits and tasks for names
  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, emoji: true },
  });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, emoji: true },
  });

  // Create lookup maps
  const habitMap = new Map(habits.map((h) => [h.id, h]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Aggregate time by activity
  const activityStats: Record<
    string,
    {
      id: string;
      name: string;
      emoji: string;
      type: "habit" | "task" | "unnamed";
      totalMinutes: number;
      sessionCount: number;
    }
  > = {};

  let totalMinutes = 0;
  let totalSessions = 0;

  sessions.forEach((s) => {
    totalMinutes += s.duration;
    totalSessions++;

    let key: string;
    let activity: {
      name: string;
      emoji: string;
      type: "habit" | "task" | "unnamed";
    };

    if (s.habitId && habitMap.has(s.habitId)) {
      const habit = habitMap.get(s.habitId)!;
      key = `habit:${s.habitId}`;
      activity = { name: habit.name, emoji: habit.emoji, type: "habit" };
    } else if (s.taskId && taskMap.has(s.taskId)) {
      const task = taskMap.get(s.taskId)!;
      key = `task:${s.taskId}`;
      activity = { name: task.name, emoji: task.emoji, type: "task" };
    } else if (s.taskName) {
      key = `unnamed:${s.taskName}`;
      activity = { name: s.taskName, emoji: "⏱️", type: "unnamed" };
    } else {
      key = "unnamed:Untracked";
      activity = { name: "Untracked", emoji: "⏱️", type: "unnamed" };
    }

    if (!activityStats[key]) {
      activityStats[key] = {
        id: key,
        name: activity.name,
        emoji: activity.emoji,
        type: activity.type,
        totalMinutes: 0,
        sessionCount: 0,
      };
    }

    activityStats[key].totalMinutes += s.duration;
    activityStats[key].sessionCount++;
  });

  // Sort by total time
  const sortedStats = Object.values(activityStats).sort(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );

  return NextResponse.json({
    period,
    totalMinutes,
    totalSessions,
    activities: sortedStats,
  });
}
