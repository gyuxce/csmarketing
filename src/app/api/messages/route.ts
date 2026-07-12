import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { waClient } from "@/lib/wa-client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, content } = await req.json();
  if (!leadId || !content) return NextResponse.json({ error: "leadId and content required" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Create pending message
  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: "OUTBOUND",
      status: "PENDING",
      content,
      userId: session.user.id,
    },
  });

  // Send via WA
  try {
    const result = await waClient.sendText(lead.phone, content);
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        waMessageId: result.messageId,
        sentAt: new Date(),
      },
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { lastContactAt: new Date() },
    });
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (e: any) {
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "FAILED", error: e.message },
    });
    return NextResponse.json({ error: e.message, messageId: message.id }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(messages);
}