import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleMapsScraper } from "@/lib/scrapers/google-maps";
import { normalizeLeads, deduplicateLeads } from "@/lib/scrapers/normalize";

const scrapers: Record<string, { source: string; scrape(q: string, l?: string): Promise<any> }> = {
  GOOGLE_MAPS: new GoogleMapsScraper(),
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { source, query, location } = await req.json();

  if (!source || !query) {
    return NextResponse.json({ error: "source and query required" }, { status: 400 });
  }

  const scraper = scrapers[source];
  if (!scraper) {
    return NextResponse.json({ error: `Unsupported source: ${source}` }, { status: 400 });
  }

  // Create job record
  const job = await prisma.scrapeJob.create({
    data: {
      source,
      query,
      location: location || null,
      status: "RUNNING",
      userId: session.user.id!,
    },
  });

  try {
    // Run scraper
    const raw = await scraper.scrape(query, location);
    const normalized = normalizeLeads(raw);
    const deduped = deduplicateLeads(normalized);

    // Get user's default pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: { userId: session.user.id },
    });

    // Insert leads
    let inserted = 0;
    for (const lead of deduped) {
      try {
        await prisma.lead.create({
          data: {
            name: lead.name,
            phone: lead.phone,
            email: lead.email || "",
            company: lead.company || "",
            address: lead.address || "",
            city: lead.city || "",
            source,
            sourceUrl: lead.sourceUrl || "",
            sourceRaw: JSON.stringify(lead.sourceRaw || {}),
            pipelineId: pipeline?.id || null,
            assignedToId: session.user.id!,
          },
        });
        inserted++;
      } catch (e: any) {
        // Skip duplicate phones
        if (!e.code?.includes("UNIQUE")) throw e;
      }
    }

    // Update job
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", resultCount: inserted, completedAt: new Date() },
    });

    return NextResponse.json({ jobId: job.id, total: deduped.length, inserted });
  } catch (e: any) {
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: e.message },
    });
    return NextResponse.json({ error: e.message, jobId: job.id }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.scrapeJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(jobs);
}