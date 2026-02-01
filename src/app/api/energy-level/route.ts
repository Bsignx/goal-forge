import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get energy level for a specific date
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);

  const energyLevel = await prisma.dailyEnergyLevel.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date,
      },
    },
  });

  return NextResponse.json({ mode: energyLevel?.mode || "FULL" });
}

// Save energy level for a specific date
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { mode, date: dateParam } = body;

  if (!["FULL", "RECOVERY", "MINIMAL"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const date = dateParam ? new Date(dateParam) : new Date();
  date.setHours(0, 0, 0, 0);

  const energyLevel = await prisma.dailyEnergyLevel.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date,
      },
    },
    create: {
      userId: session.user.id,
      date,
      mode,
    },
    update: {
      mode,
    },
  });

  return NextResponse.json(energyLevel);
}
