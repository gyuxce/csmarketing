import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === (process.env.WA_VERIFY_TOKEN || "dev-token")) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ok" });
  }

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const messages = change.value?.messages;
      const statuses = change.value?.statuses;

      // Inbound messages
      if (messages) {
        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body;
          const lead = await prisma.lead.findFirst({
            where: { phone: { contains: from } },
          });
          if (lead) {
            await prisma.message.create({
              data: {
                leadId: lead.id,
                direction: "INBOUND",
                status: "RECEIVED",
                content: text || "",
                waMessageId: msg.id,
              },
            });
          }
        }
      }

      // Status updates
      if (statuses) {
        for (const st of statuses) {
          await prisma.message.updateMany({
            where: { waMessageId: st.id },
            data: {
              status: st.status?.toUpperCase() || "PENDING",
              deliveredAt: st.status === "delivered" ? new Date() : undefined,
              readAt: st.status === "read" ? new Date() : undefined,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}