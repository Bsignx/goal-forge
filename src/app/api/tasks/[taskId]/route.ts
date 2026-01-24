import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ taskId: string }> };

// Get a single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: session.user.id,
    },
    include: {
      identity: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// Update a task
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const body = await request.json();
  const { name, emoji, identityId, dueDate, completed } = body;

  // Verify task belongs to user
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId: session.user.id },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify identity belongs to user if provided
  if (identityId) {
    const identity = await prisma.identity.findFirst({
      where: { id: identityId, userId: session.user.id },
    });
    if (!identity) {
      return NextResponse.json(
        { error: "Identity not found" },
        { status: 404 },
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (emoji !== undefined) updateData.emoji = emoji;
  if (identityId !== undefined) updateData.identityId = identityId || null;
  if (dueDate !== undefined)
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (completed !== undefined) {
    updateData.completed = completed;
    updateData.completedAt = completed ? new Date() : null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      identity: true,
    },
  });

  return NextResponse.json(task);
}

// Delete a task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  await prisma.task.delete({
    where: { id: taskId },
  });

  return NextResponse.json({ success: true });
}
