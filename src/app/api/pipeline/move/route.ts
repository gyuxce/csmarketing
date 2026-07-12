import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stageToStatus: Record<string, string> = {
  "New": "NEW",
  "Contacted": "CONTACTED",
  "Interested": "INTERESTED",
  "Negotiation": "NEGOTIATION",
  "Won": "WON",
  "Lost": "LOST",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, newStageId } = await req.json();
  if (!leadId || !newStageId) return NextResponse.json({ error: "leadId and newStageId required" }, { status: 400 });

  const stage = await prisma.pipelineStage.findUnique({ where: { id: newStageId } });
  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const newStatus = stageToStatus[stage.name] || "NEW";

  const lead = await prisma.lead.update({
    where: { id: leadId, assignedToId: session.user.id },
    data: { status: newStatus },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: "status_change",
      description: `Moved to ${stage.name}`,
    },
  });

  return NextResponse.json(lead);
}