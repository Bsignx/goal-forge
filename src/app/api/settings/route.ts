import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get user settings
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create user settings
  let settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        userId: session.user.id,
        restDays: [],
        vacationMode: false,
      },
    });
  }

  return NextResponse.json(settings);
}

// Update user settings
export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { restDays, vacationMode, vacationStart, vacationEnd } = body;

  // Validate restDays if provided
  if (restDays !== undefined) {
    if (!Array.isArray(restDays)) {
      return NextResponse.json(
        { error: "restDays must be an array" },
        { status: 400 },
      );
    }
    // Ensure all values are valid day numbers (0-6)
    if (!restDays.every((d: number) => d >= 0 && d <= 6)) {
      return NextResponse.json(
        { error: "restDays must contain values 0-6" },
        { status: 400 },
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (restDays !== undefined) updateData.restDays = restDays;
  if (vacationMode !== undefined) updateData.vacationMode = vacationMode;
  if (vacationStart !== undefined) {
    updateData.vacationStart = vacationStart ? new Date(vacationStart) : null;
  }
  if (vacationEnd !== undefined) {
    updateData.vacationEnd = vacationEnd ? new Date(vacationEnd) : null;
  }

  // Upsert settings
  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      restDays: restDays || [],
      vacationMode: vacationMode || false,
      vacationStart: vacationStart ? new Date(vacationStart) : null,
      vacationEnd: vacationEnd ? new Date(vacationEnd) : null,
    },
    update: updateData,
  });

  return NextResponse.json(settings);
}
