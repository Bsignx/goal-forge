import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { LoadMode } from "@prisma/client";

// Toggle completion for a habit on a specific date (or today)
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

  // Get mode and date from request body (optional)
  let mode: LoadMode = "FULL";
  let dateParam: string | null = null;
  try {
    const body = await request.json();
    if (body.mode && ["FULL", "RECOVERY", "MINIMAL"].includes(body.mode)) {
      mode = body.mode as LoadMode;
    }
    if (body.date) {
      dateParam = body.date;
    }
  } catch {
    // No body or invalid JSON, use defaults
  }

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

  // Parse target date from param or use today (in user's local context via date string)
  let targetDate: Date;
  if (dateParam) {
    targetDate = new Date(dateParam + "T00:00:00.000Z");
  } else {
    targetDate = new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
  }

  // Use upsert pattern to handle race conditions
  const existingCompletion = await prisma.completion.findUnique({
    where: {
      habitId_date: {
        habitId,
        date: targetDate,
      },
    },
  });

  if (existingCompletion) {
    // Remove completion (toggle off) - use deleteMany to avoid "not found" errors
    await prisma.completion.deleteMany({
      where: {
        habitId,
        date: targetDate,
      },
    });
    return NextResponse.json({ completed: false, mode: null });
  } else {
    // Add completion (toggle on) - use upsert to handle race conditions
    await prisma.completion.upsert({
      where: {
        habitId_date: {
          habitId,
          date: targetDate,
        },
      },
      create: {
        habitId,
        date: targetDate,
        mode,
      },
      update: { mode },
    });
    return NextResponse.json({ completed: true, mode });
  }
}
