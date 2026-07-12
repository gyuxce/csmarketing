import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const source = searchParams.get("source") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    assignedToId: session.user.id,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { company: { contains: search } },
    ];
  }
  if (status) where.status = status;
  if (source) where.source = source;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: where as any,
      include: { pipeline: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where: where as any }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      ...body,
      assignedToId: session.user.id,
      source: body.source || "MANUAL",
      status: body.status || "NEW",
      tags: body.tags ? JSON.stringify(body.tags) : "[]",
    },
  });

  return NextResponse.json(lead, { status: 201 });
}