import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ taskId: string }> };

// Toggle task completion
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  // Verify task belongs to user
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: session.user.id },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Toggle completion
  const newCompleted = !existingTask.completed;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : null,
    },
    include: {
      identity: true,
    },
  });

  return NextResponse.json(task);
}
