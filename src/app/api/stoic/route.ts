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
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus" },
  { text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", author: "Epictetus" },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
  { text: "It is the power of the mind to be unconquerable.", author: "Seneca" },
  { text: "True happiness is to enjoy the present, without anxious dependence upon the future.", author: "Seneca" },
  { text: "He who fears death will never do anything worthy of a man who is alive.", author: "Seneca" },
  { text: "Religion is regarded by the common people as true, by the wise as false, and by rulers as useful.", author: "Seneca" },
  { text: "Hang on to your youthful enthusiasms — you'll be able to use them better when you're older.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", author: "Marcus Aurelius" },
  { text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "The best answer to anger is silence.", author: "Marcus Aurelius" },
  { text: "Look back over the past, with its changing empires that rose and fell, and you can foresee the future too.", author: "Marcus Aurelius" },
  { text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", author: "Marcus Aurelius" },
  { text: "Loss is nothing else but change, and change is Nature's delight.", author: "Marcus Aurelius" },
  { text: "Receive without conceit, release without struggle.", author: "Marcus Aurelius" },
  { text: "What we do now echoes in eternity.", author: "Marcus Aurelius" },
  { text: "The universe is change; our life is what our thoughts make it.", author: "Marcus Aurelius" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius" },
  { text: "To be like the rock that the waves keep crashing over. It stands unmoved and the raging of the sea falls still around it.", author: "Marcus Aurelius" },
  { text: "Think of yourself as dead. You have lived your life. Now take what's left and live it properly.", author: "Marcus Aurelius" },
  { text: "The art of living is more like wrestling than dancing.", author: "Marcus Aurelius" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius" },
  { text: "Choose not to be harmed — and you won't feel harmed. Don't feel harmed — and you haven't been.", author: "Marcus Aurelius" },
  { text: "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it.", author: "Marcus Aurelius" },
  { text: "The only wealth which you will keep forever is the wealth you have given away.", author: "Marcus Aurelius" },
  { text: "Reject your sense of injury and the injury itself disappears.", author: "Marcus Aurelius" },
  { text: "Anger, if not restrained, is frequently more hurtful to us than the injury that provokes it.", author: "Seneca" },
  { text: "We are more often frightened than hurt; and we suffer more from imagination than from reality.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "Every new beginning comes from some other beginning's end.", author: "Seneca" },
  { text: "One of the most beautiful qualities of true friendship is to understand and to be understood.", author: "Seneca" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  { text: "While we wait for life, life passes.", author: "Seneca" },
  { text: "Only time can heal what reason cannot.", author: "Seneca" },
  { text: "Associate with people who are likely to improve you.", author: "Seneca" },
  { text: "All cruelty springs from weakness.", author: "Seneca" },
  { text: "He who is brave is free.", author: "Seneca" },
  { text: "Wherever there is a human being, there is an opportunity for kindness.", author: "Seneca" },
  { text: "If you really want to escape the things that harass you, what you're needing is not to be in a different place but to be a different person.", author: "Seneca" },
  { text: "We learn not in the school, but in life.", author: "Seneca" },
  { text: "Ignorance is the cause of fear.", author: "Seneca" },
  { text: "Throw me to the wolves and I will return leading the pack.", author: "Seneca" },
  { text: "There is no genius without a touch of madness.", author: "Seneca" },
  { text: "Freedom is not procured by a full enjoyment of what is desired, but by controlling the desire.", author: "Epictetus" },
  { text: "Other people's views and troubles can be contagious. Don't sabotage yourself by unwittingly adopting negative, unproductive attitudes.", author: "Epictetus" },
  { text: "If anyone tells you that a certain person speaks ill of you, do not make excuses about what is said of you but answer: He was ignorant of my other faults, else he would not have mentioned these alone.", author: "Epictetus" },
  { text: "Caretake this moment. Immerse yourself in its particulars.", author: "Epictetus" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "Any person capable of angering you becomes your master.", author: "Epictetus" },
  { text: "Circumstances don't make the man, they only reveal him to himself.", author: "Epictetus" },
  { text: "Progress is not achieved by luck or accident, but by working on yourself daily.", author: "Epictetus" },
  { text: "Know, first, who you are, and then adorn yourself accordingly.", author: "Epictetus" },
  { text: "Only the educated are free.", author: "Epictetus" },
  { text: "He who laughs at himself never runs out of things to laugh at.", author: "Epictetus" },
  { text: "Events do not just happen, but arrive by appointment.", author: "Epictetus" },
  { text: "Keep silence for the most part, and speak only when you must, and then briefly.", author: "Epictetus" },
  { text: "Seek not the good in external things; seek it in yourselves.", author: "Epictetus" },
  { text: "Nature hath given men one tongue but two ears, that we may hear from others twice as much as we speak.", author: "Epictetus" },
  { text: "The key is to keep company only with people who uplift you, whose presence calls forth your best.", author: "Epictetus" },
  { text: "To accuse others for one's own misfortunes is a sign of want of education.", author: "Epictetus" },
  { text: "Neither should a ship rely on one small anchor, nor should life rest on a single hope.", author: "Epictetus" },
  { text: "On the occasion of every accident that befalls you, remember to turn to yourself and inquire what power you have for turning it to use.", author: "Epictetus" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus" },
  { text: "Attach yourself to what is spiritually superior, regardless of what other people think or do.", author: "Epictetus" },
  { text: "Small-minded people blame others. Average people blame themselves. The wise see all blame as foolishness.", author: "Epictetus" },
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
