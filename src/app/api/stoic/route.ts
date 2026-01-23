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

// Stoic quotes collection
const STOIC_QUOTES = [
  { text: "It is not things that disturb us, but our judgments about things.", author: "Epictetus" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "We cannot control external events, only our reactions to them.", author: "Epictetus" },
  { text: "It is not the man who has too little, but the man who craves more, that is poor.", author: "Seneca" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive.", author: "Marcus Aurelius" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "He who lives in harmony with himself lives in harmony with the universe.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "Difficulty shows what men are.", author: "Epictetus" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "If a man knows not to which port he sails, no wind is favorable.", author: "Seneca" },
  { text: "Sometimes even to live is an act of courage.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "As long as we live, as long as we are among human beings, let us cultivate our humanity.", author: "Seneca" },
  { text: "If it is not in your power to change something, do not waste your energy on it.", author: "Seneca" },
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Do not let the behavior of others destroy your inner peace.", author: "Dalai Lama" },
  { text: "Life is long enough, and a sufficiently generous amount has been given to us for the highest achievements.", author: "Seneca" },
  { text: "The more we value things outside our control, the less control we have.", author: "Epictetus" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },
  { text: "Execute every act of your life as if it were your last.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "If it is endurable, then endure it. Stop complaining.", author: "Marcus Aurelius" },
  { text: "We bear the ills we inflict on ourselves more lightly than those inflicted on us by others.", author: "Seneca" },
  { text: "No one can make you feel inferior without your consent.", author: "Eleanor Roosevelt" },
  { text: "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.", author: "Marcus Aurelius" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
];

// Get daily quote based on date (different each day)
function getDailyQuote(date: Date): { text: string; author: string } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return STOIC_QUOTES[dayOfYear % STOIC_QUOTES.length];
}

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
  const quote = getDailyQuote(today);

  return NextResponse.json({
    entry,
    question,
    quote,
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
