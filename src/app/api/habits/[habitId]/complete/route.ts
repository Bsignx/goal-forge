import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Toggle completion for a habit on today's date
export async function POST(
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

  // Get today's date at midnight (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Check if completion exists
  const existingCompletion = await prisma.completion.findUnique({
    where: {
      habitId_date: {
        habitId,
        date: today,
      },
    },
  });

  if (existingCompletion) {
    // Remove completion (toggle off)
    await prisma.completion.delete({
      where: { id: existingCompletion.id },
    });
    return NextResponse.json({ completed: false });
  } else {
    // Add completion (toggle on)
    await prisma.completion.create({
      data: {
        habitId,
        date: today,
      },
    });
    return NextResponse.json({ completed: true });
  }
}
