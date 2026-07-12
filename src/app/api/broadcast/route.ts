import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { waClient } from "@/lib/wa-client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, messageBody, audienceLeadIds } = await req.json();
  if (!name || !messageBody || !audienceLeadIds?.length) {
    return NextResponse.json({ error: "name, messageBody, and audienceLeadIds required" }, { status: 400 });
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      name,
      messageBody,
      status: "SENDING",
      userId: session.user.id!,
    },
  });

  // Create audience entries
  for (const leadId of audienceLeadIds) {
    await prisma.broadcastAudience.create({
      data: { broadcastId: broadcast.id, leadId, status: "pending" },
    });
  }

  // Send async (fire-and-forget: return broadcast ID, send in background)
  sendBroadcast(broadcast.id, audienceLeadIds, messageBody, session.user.id!).catch(console.error);

  return NextResponse.json({ broadcastId: broadcast.id, recipientCount: audienceLeadIds.length }, { status: 201 });
}

async function sendBroadcast(broadcastId: string, leadIds: string[], message: string, userId: string) {
  const leads = await prisma.lead.findMany({ where: { id: { in: leadIds } } });
  let sent = 0, failed = 0;

  for (const lead of leads) {
    try {
      const msgRecord = await prisma.message.create({
        data: { leadId: lead.id, direction: "OUTBOUND", content: message, userId, broadcastId, status: "PENDING" },
      });

      const result = await waClient.sendText(lead.phone, message);
      await prisma.message.update({
        where: { id: msgRecord.id },
        data: { status: "SENT", waMessageId: result.messageId, sentAt: new Date() },
      });
      await prisma.broadcastAudience.updateMany({
        where: { broadcastId, leadId: lead.id },
        data: { status: "sent" },
      });
      sent++;
      // Rate limit: 3s delay
      await new Promise((r) => setTimeout(r, 3000));
    } catch {
      failed++;
    }
  }

  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: "COMPLETED", sentCount: sent, failedCount: failed },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const broadcasts = await prisma.broadcast.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(broadcasts);
}