import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Update an identity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ identityId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { identityId } = await params;

  // Verify the identity belongs to the user
  const identity = await prisma.identity.findFirst({
    where: {
      id: identityId,
      userId: session.user.id,
    },
  });

  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, emoji } = body;

  const updatedIdentity = await prisma.identity.update({
    where: { id: identityId },
    data: {
      ...(name && { name }),
      ...(emoji && { emoji }),
    },
  });

  return NextResponse.json(updatedIdentity);
}

// Delete an identity (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ identityId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { identityId } = await params;

  // Verify the identity belongs to the user
  const identity = await prisma.identity.findFirst({
    where: {
      id: identityId,
      userId: session.user.id,
    },
  });

  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  // Soft delete and unlink habits
  await prisma.$transaction([
    prisma.habit.updateMany({
      where: { identityId },
      data: { identityId: null },
    }),
    prisma.identity.update({
      where: { id: identityId },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ success: true });
}
