import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: List all campaigns
export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        contentJobs: {
          select: { id: true, status: true, contentType: true, contextPlatform: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = campaigns.map((c) => {
      const totalJobs = c.contentJobs.length;
      const approvedJobs = c.contentJobs.filter((j) => j.status === "APPROVED" || j.status === "COMPLETED").length;
      return {
        id: c.id,
        name: c.name,
        objective: c.objective,
        targetAudience: c.targetAudience,
        platforms: JSON.parse(c.platforms),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        budget: c.budget,
        status: c.status,
        totalJobs,
        approvedJobs,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[API/campaigns] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new campaign
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, objective, targetAudience, platforms, startDate, endDate, budget } = body;

    if (!name || !objective || !startDate || !endDate) {
      return NextResponse.json(
        { error: "name, objective, startDate ve endDate zorunludur" },
        { status: 400 }
      );
    }

    // Get tenant
    const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "desc" } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        name,
        objective,
        targetAudience: targetAudience || null,
        platforms: JSON.stringify(platforms || []),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget: budget ? parseFloat(budget) : null,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error("[API/campaigns] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
