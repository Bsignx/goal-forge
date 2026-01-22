import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// GET last 12 weeks of radar history
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.lifeRadar.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      weekStart: "desc",
    },
    take: 12,
  });

  return NextResponse.json(history);
}
