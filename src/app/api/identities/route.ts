import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Get all identities for the current user
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identities = await prisma.identity.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      habits: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(identities);
}

// Create a new identity
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, emoji } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const identity = await prisma.identity.create({
    data: {
      name,
      emoji: emoji || "🎯",
      userId: session.user.id,
    },
  });

  return NextResponse.json(identity, { status: 201 });
}
