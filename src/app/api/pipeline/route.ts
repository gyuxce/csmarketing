import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipeline = await prisma.pipeline.findFirst({
    where: { userId: session.user.id },
    include: {
      stages: { orderBy: { order: "asc" } },
      leads: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!pipeline) return NextResponse.json({ stages: [], leads: [] });

  // Group leads by stage
  const stagesWithLeads = pipeline.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    order: stage.order,
    color: stage.color || "#6b7280",
    leads: pipeline.leads
      .filter((l) => l.status === stage.name.toUpperCase().replace(/ /g, "_"))
      .map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        company: l.company,
        source: l.source,
        createdAt: l.createdAt,
      })),
  }));

  return NextResponse.json(stagesWithLeads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();

  const pipeline = await prisma.pipeline.findFirst({
    where: { userId: session.user.id },
  });
  if (!pipeline) return NextResponse.json({ error: "No pipeline found" }, { status: 404 });

  const stage = await prisma.pipelineStage.create({
    data: {
      name,
      order: 99,
      color: "#6b7280",
      pipelineId: pipeline.id,
    },
  });

  return NextResponse.json(stage, { status: 201 });
}