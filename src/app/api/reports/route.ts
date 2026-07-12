import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id!;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";
  const days = parseInt(searchParams.get("days") || "30");

  switch (type) {
    case "overview": {
      const [total, newThisWeek, contacted, won, lost, messagesToday] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: userId } }),
        prisma.lead.count({ where: { assignedToId: userId, createdAt: { gte: daysAgo(7) } } }),
        prisma.lead.count({ where: { assignedToId: userId, status: "CONTACTED" } }),
        prisma.lead.count({ where: { assignedToId: userId, status: "WON" } }),
        prisma.lead.count({ where: { assignedToId: userId, status: "LOST" } }),
        prisma.message.count({ where: { userId, createdAt: { gte: daysAgo(1) } } }),
      ]);
      return NextResponse.json({
        total, newThisWeek, contacted, won, lost,
        conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
        messagesToday,
      });
    }

    case "lead-growth": {
      const leads = await prisma.lead.findMany({
        where: { assignedToId: userId, createdAt: { gte: daysAgo(days) } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const daily = groupByDay(leads as { createdAt: Date }[], days);
      return NextResponse.json(daily);
    }

    case "source-distribution": {
      const leads = await prisma.lead.groupBy({
        by: ["source"],
        where: { assignedToId: userId },
        _count: true,
      });
      return NextResponse.json(leads.map((l) => ({ source: l.source, count: l._count })));
    }

    case "funnel": {
      const stages = ["NEW", "CONTACTED", "INTERESTED", "NEGOTIATION", "WON", "LOST"];
      const counts = await Promise.all(
        stages.map((stage) => prisma.lead.count({ where: { assignedToId: userId, status: stage } }))
      );
      return NextResponse.json(stages.map((stage, i) => ({ stage, count: counts[i] })));
    }

    default:
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function groupByDay(items: { createdAt: Date }[], totalDays: number) {
  const map = new Map<string, number>();
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().split("T")[0], 0);
  }
  for (const item of items) {
    const key = new Date(item.createdAt).toISOString().split("T")[0];
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort()
    .map(([date, count]) => ({ date, count }));
}