import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const StatsResponseSchema = z.object({
  totalJobs: z.number(),
  pendingReview: z.number(),
  approved: z.number(),
  processing: z.number(),
  thisWeekCount: z.number(),
  platformBreakdown: z.record(z.number()),
  funnelBreakdown: z.record(z.number()),
  strategyBreakdown: z.record(z.number()),
  averageCriticTurns: z.number(),
  isGeneratingStrategy: z.boolean(),
});

export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export async function GET() {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const allJobs = await prisma.contentJob.findMany({
      select: {
        status: true,
        contextPlatform: true,
        funnelStage: true,
        strategy: true,
        criticTurns: true,
        createdAt: true,
      },
    });

    // Status counts
    const totalJobs = allJobs.length;
    const pendingReview = allJobs.filter(
      (j) => j.status === "NEEDS_REVIEW" || j.status === "NEEDS_MANUAL_REVIEW"
    ).length;
    const approved = allJobs.filter(
      (j) => j.status === "APPROVED" || j.status === "COMPLETED"
    ).length;
    const processing = allJobs.filter(
      (j) => j.status === "PROCESSING"
    ).length;

    // This week
    const thisWeekCount = allJobs.filter(
      (j) => j.createdAt >= startOfWeek
    ).length;

    // Platform breakdown
    const platformBreakdown: Record<string, number> = {};
    for (const j of allJobs) {
      platformBreakdown[j.contextPlatform] =
        (platformBreakdown[j.contextPlatform] || 0) + 1;
    }

    // Funnel breakdown
    const funnelBreakdown: Record<string, number> = {};
    for (const j of allJobs) {
      funnelBreakdown[j.funnelStage] =
        (funnelBreakdown[j.funnelStage] || 0) + 1;
    }

    // Strategy breakdown
    const strategyBreakdown: Record<string, number> = {};
    for (const j of allJobs) {
      strategyBreakdown[j.strategy] =
        (strategyBreakdown[j.strategy] || 0) + 1;
    }

    // Average critic turns (only for those with turns > 0)
    const jobsWithTurns = allJobs.filter((j) => j.criticTurns > 0);
    const averageCriticTurns =
      jobsWithTurns.length > 0
        ? jobsWithTurns.reduce((sum, j) => sum + j.criticTurns, 0) /
          jobsWithTurns.length
        : 0;

    // Strategy generation status
    const tenant = await prisma.tenant.findFirst({
      select: { isGeneratingStrategy: true },
      orderBy: { createdAt: "desc" },
    });

    const stats: StatsResponse = {
      totalJobs,
      pendingReview,
      approved,
      processing,
      thisWeekCount,
      platformBreakdown,
      funnelBreakdown,
      strategyBreakdown,
      averageCriticTurns: Math.round(averageCriticTurns * 10) / 10,
      isGeneratingStrategy: tenant?.isGeneratingStrategy ?? false,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("[API/stats] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
