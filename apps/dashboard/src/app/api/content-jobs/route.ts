import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: List content jobs for the tenant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    const where = tenantId ? { tenantId } : {};

    const jobs = await prisma.contentJob.findMany({
      where,
      include: { bundle: true },
      orderBy: { createdAt: "desc" },
    });

    const formatted = jobs.map((job) => ({
      id: job.id,
      topicId: job.topicId,
      strategy: job.strategy,
      status: job.status,
      contentType: job.contentType,
      funnelStage: job.funnelStage,
      contextPlatform: job.contextPlatform,
      criticTurns: job.criticTurns,
      criticFlags: job.criticFlags ? JSON.parse(job.criticFlags) : null,
      scheduledFor: job.scheduledFor,
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
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[API/content-jobs] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update content job status (approve/reject)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status } = body;

    if (!jobId || !status) {
      return NextResponse.json(
        { error: "jobId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["APPROVED", "REJECTED", "NEEDS_REVIEW", "PROCESSING"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.contentJob.update({
      where: { id: jobId },
      data: { status },
    });

    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    console.error("[API/content-jobs] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
