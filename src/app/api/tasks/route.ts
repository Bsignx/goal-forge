import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get all incomplete tasks for the current user (for today's view)
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get today's date at midnight (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get all incomplete tasks OR tasks completed today
  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { completed: false },
        {
          completed: true,
          completedAt: {
            gte: today,
          },
        },
      ],
    },
    include: {
      identity: true,
    },
    orderBy: [{ completed: "asc" }, { order: "asc" }],
  });

  return NextResponse.json(tasks);
}

// Create a new task
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, emoji, identityId, dueDate } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
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

  // Get the max order for this user's tasks
  const maxOrder = await prisma.task.aggregate({
    where: { userId: session.user.id },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      name,
      emoji: emoji || "⚡",
      order: (maxOrder._max.order ?? -1) + 1,
      userId: session.user.id,
      identityId: identityId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      identity: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
