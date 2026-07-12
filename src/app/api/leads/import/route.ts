import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return NextResponse.json({ error: "Empty or header-only CSV" }, { status: 400 });

  // Parse header
  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
  const nameIdx = headers.indexOf("name");
  const phoneIdx = headers.indexOf("phone");
  const emailIdx = headers.indexOf("email");
  const companyIdx = headers.indexOf("company");
  const cityIdx = headers.indexOf("city");
  const addressIdx = headers.indexOf("address");

  if (nameIdx === -1 || phoneIdx === -1) {
    return NextResponse.json({ error: "CSV must have 'name' and 'phone' columns" }, { status: 400 });
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { userId: session.user.id },
  });

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const name = cols[nameIdx];
    const phone = cols[phoneIdx];
    if (!name || !phone) { skipped++; continue; }

    try {
      await prisma.lead.create({
        data: {
          name,
          phone,
          email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
          company: companyIdx >= 0 ? cols[companyIdx] || "" : "",
          city: cityIdx >= 0 ? cols[cityIdx] || "" : "",
          address: addressIdx >= 0 ? cols[addressIdx] || "" : "",
          source: "CSV_IMPORT",
          pipelineId: pipeline?.id || null,
          assignedToId: session.user.id!,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, total: lines.length - 1 });
}