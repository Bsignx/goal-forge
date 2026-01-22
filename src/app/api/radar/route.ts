import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { RadarStatus } from "@/generated/prisma";

// Helper to get the Monday of the current week
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// GET current week's radar (or create default if not exists)
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = getWeekStart();

  // Try to find existing radar for this week
  const radar = await prisma.lifeRadar.findUnique({
    where: {
      userId_weekStart: {
        userId: session.user.id,
        weekStart,
      },
    },
  });

  // If not found, return default values (not saved yet)
  if (!radar) {
    return NextResponse.json({
      id: null,
      weekStart,
      body: "GREEN",
      mind: "GREEN",
      profession: "GREEN",
      projects: "GREEN",
      environment: "GREEN",
      notes: null,
      isNew: true,
    });
  }

  return NextResponse.json({ ...radar, isNew: false });
}

// POST/PUT - Save or update this week's radar
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    body: bodyStatus,
    mind,
    profession,
    projects,
    environment,
    notes,
  } = body;

  // Validate status values
  const validStatuses: RadarStatus[] = ["RED", "YELLOW", "GREEN"];
  const statuses = [bodyStatus, mind, profession, projects, environment];

  for (const status of statuses) {
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 },
      );
    }
  }

  const weekStart = getWeekStart();

  const radar = await prisma.lifeRadar.upsert({
    where: {
      userId_weekStart: {
        userId: session.user.id,
        weekStart,
      },
    },
    create: {
      userId: session.user.id,
      weekStart,
      body: bodyStatus || "GREEN",
      mind: mind || "GREEN",
      profession: profession || "GREEN",
      projects: projects || "GREEN",
      environment: environment || "GREEN",
      notes: notes || null,
    },
    update: {
      ...(bodyStatus && { body: bodyStatus }),
      ...(mind && { mind }),
      ...(profession && { profession }),
      ...(projects && { projects }),
      ...(environment && { environment }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  return NextResponse.json(radar);
}
