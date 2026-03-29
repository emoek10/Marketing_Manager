import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Single campaign with its content jobs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        contentJobs: {
          include: { bundle: true },
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
    }

    const formatted = {
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      targetAudience: campaign.targetAudience,
      platforms: JSON.parse(campaign.platforms),
      startDate: campaign.startDate.toISOString(),
      endDate: campaign.endDate.toISOString(),
      budget: campaign.budget,
      status: campaign.status,
      createdAt: campaign.createdAt.toISOString(),
      contentJobs: campaign.contentJobs.map((job) => ({
        id: job.id,
        topicId: job.topicId,
        strategy: job.strategy,
        status: job.status,
        contentType: job.contentType,
        funnelStage: job.funnelStage,
        contextPlatform: job.contextPlatform,
        scheduledFor: job.scheduledFor?.toISOString() || null,
        createdAt: job.createdAt.toISOString(),
        bundle: job.bundle
          ? {
              id: job.bundle.id,
              reelsScript: job.bundle.reelsScript,
              caption_ig: job.bundle.caption_ig,
              thread_x: job.bundle.thread_x,
              post_li: job.bundle.post_li,
              syntheticScore: job.bundle.syntheticScore,
              storySequence: job.bundle.storySequence ? JSON.parse(job.bundle.storySequence) : null,
              videoUrl: job.bundle.videoUrl,
            }
          : null,
      })),
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[API/campaigns/id] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
