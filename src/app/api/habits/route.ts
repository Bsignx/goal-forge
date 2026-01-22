import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get all habits for the current user
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const habits = await prisma.habit.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(habits);
}

// Create a new habit
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    emoji,
    identityId,
    fullDescription,
    recoveryDescription,
    minimalDescription,
  } = body;

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

  // Get the max order for this user
  const maxOrder = await prisma.habit.aggregate({
    where: { userId: session.user.id },
    _max: { order: true },
  });

  const habit = await prisma.habit.create({
    data: {
      name,
      emoji: emoji || "✅",
      order: (maxOrder._max.order ?? -1) + 1,
      userId: session.user.id,
      identityId: identityId || null,
      fullDescription: fullDescription || null,
      recoveryDescription: recoveryDescription || null,
      minimalDescription: minimalDescription || null,
    },
  });

  return NextResponse.json(habit, { status: 201 });
}
