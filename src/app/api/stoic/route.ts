import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Daily questions rotation
const STOIC_QUESTIONS = [
  "O que eu controlei hoje?",
  "Onde reagi mal?",
  "O que fiz apesar da vontade?",
];

// Get daily question based on date
function getDailyQuestion(date: Date): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return STOIC_QUESTIONS[dayOfYear % STOIC_QUESTIONS.length];
}

// GET today's stoic entry
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const entry = await prisma.stoicEntry.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
  });

  const question = getDailyQuestion(today);

  return NextResponse.json({
    entry,
    question,
  });
}

// POST/UPDATE today's stoic entry
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { answer } = await request.json();

  if (!answer || typeof answer !== "string") {
    return NextResponse.json({ error: "Answer is required" }, { status: 400 });
  }

  // Enforce 300 character limit
  if (answer.length > 300) {
    return NextResponse.json(
      { error: "Answer must be 300 characters or less" },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const question = getDailyQuestion(today);

  const entry = await prisma.stoicEntry.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date: today,
      },
    },
    create: {
      userId: session.user.id,
      date: today,
      question,
      answer,
    },
    update: {
      answer,
    },
  });

  return NextResponse.json(entry);
}
