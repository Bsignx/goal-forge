import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId } = await params;

  // Verify the habit belongs to the user
  const habit = await prisma.habit.findFirst({
    where: {
      id: habitId,
      userId: session.user.id,
    },
  });

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, emoji, identityId } = body;

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

  const updatedHabit = await prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(name && { name }),
      ...(emoji && { emoji }),
      ...(identityId !== undefined && { identityId: identityId || null }),
    },
  });

  return NextResponse.json(updatedHabit);
}

// Delete a habit (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId } = await params;

  // Verify the habit belongs to the user
  const habit = await prisma.habit.findFirst({
    where: {
      id: habitId,
      userId: session.user.id,
    },
  });

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  // Soft delete
  await prisma.habit.update({
    where: { id: habitId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
