import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    // Create default pipeline for new user
    await prisma.pipeline.create({
      data: {
        name: "Sales Pipeline",
        userId: user.id,
        stages: {
          create: [
            { name: "New", order: 0, color: "#6b7280" },
            { name: "Contacted", order: 1, color: "#3b82f6" },
            { name: "Interested", order: 2, color: "#f59e0b" },
            { name: "Negotiation", order: 3, color: "#8b5cf6" },
            { name: "Won", order: 4, color: "#22c55e" },
            { name: "Lost", order: 5, color: "#ef4444" },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}