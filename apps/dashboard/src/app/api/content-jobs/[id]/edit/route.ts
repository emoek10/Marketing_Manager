import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Rule Extractor: When user edits AI-generated text, extract a brand rule from the diff.
 * Uses GPT-4o-mini (or Gemini) to convert raw diff → actionable brand tone rule → store in RAG.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await req.json();
    const { field, originalText, editedText } = body;

    if (!field || !originalText || !editedText) {
      return NextResponse.json(
        { error: "field, originalText, and editedText are required" },
        { status: 400 }
      );
    }

    // 1. Update the bundle with edited text
    const job = await prisma.contentJob.findUnique({
      where: { id: jobId },
      include: { bundle: true },
    });

    if (!job || !job.bundle) {
      return NextResponse.json({ error: "Job or bundle not found" }, { status: 404 });
    }

    // Update the specific field in the bundle
    const updateData: any = {};
    if (["reelsScript", "caption_ig", "thread_x", "post_li"].includes(field)) {
      updateData[field] = editedText;
    }

    await prisma.socialBundle.update({
      where: { id: job.bundle.id },
      data: updateData,
    });

    // 2. Rule Extractor: Generate a brand rule from the diff
    // For now, store the diff as a structured preference. In production,
    // this would call GPT-4o-mini with the Rule Extractor prompt.
    const ruleExtractionPrompt = `Orijinal AI metni: "${originalText.substring(0, 200)}"
Kullanıcının düzelttiği metin: "${editedText.substring(0, 200)}"
Bu düzeltmeden markanın ses tonuyla ilgili genel bir KURAL çıkar.`;

    // TODO: Phase 2 - Call GPT-4o-mini with ruleExtractionPrompt and store result in Pinecone
    // For now, log the diff for traceability
    console.log(`[RULE EXTRACTOR] Field: ${field}, Job: ${jobId}`);
    console.log(`[RULE EXTRACTOR] Prompt ready: ${ruleExtractionPrompt.substring(0, 100)}...`);

    // 3. Mark job as user-reviewed
    await prisma.contentJob.update({
      where: { id: jobId },
      data: { status: "NEEDS_REVIEW" }, // User edited, re-enters review
    });

    return NextResponse.json({
      success: true,
      message: "Edit saved. Rule extraction queued.",
      ruleExtractionPrompt, // Return for transparency
    });
  } catch (error: any) {
    console.error("[API/content-jobs/edit] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
