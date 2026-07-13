import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log("User count:", count);

  if (count === 0) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const user = await prisma.user.create({
      data: {
        email: "admin@cs-assistant.com",
        name: "Admin",
        passwordHash,
        role: "ADMIN",
      },
    });

    const pipeline = await prisma.pipeline.create({
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

    await prisma.lead.createMany({
      data: [
        { name: "Budi Santoso", phone: "+628123456789", company: "Toko Berkah", city: "Jakarta", source: "MANUAL", status: "NEW", pipelineId: pipeline.id, assignedToId: user.id },
        { name: "Siti Nurhaliza", phone: "+628987654321", company: "Salon Cantik", city: "Bandung", source: "MANUAL", status: "CONTACTED", pipelineId: pipeline.id, assignedToId: user.id },
        { name: "Ahmad Dahlan", phone: "+6281111222333", company: "CV Maju Jaya", city: "Surabaya", source: "GOOGLE_MAPS", status: "INTERESTED", pipelineId: pipeline.id, assignedToId: user.id },
        { name: "Rina Wijaya", phone: "+628555666777", company: "Bakery Manis", city: "Jakarta", source: "CSV_IMPORT", status: "NEW", pipelineId: pipeline.id, assignedToId: user.id },
      ],
    });

    console.log("Seed completed ✅");
  } else {
    console.log("Already seeded");
  }
  console.log("Login: admin@cs-assistant.com / admin123");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());