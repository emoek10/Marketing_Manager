import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Get campaign + tenant + brand
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        tenant: {
          include: { brandProfile: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY eksik" }, { status: 500 });
    }

    // 2. Set generating status
    await prisma.campaign.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const bp = campaign.tenant.brandProfile;

      // Calculate campaign duration in days
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      // Cap at 14 days max to keep content count reasonable
      const contentDays = Math.min(durationDays, 14);

      // Parse brand identity
      let brandColors: string[] = [];
      let brandFonts: string[] = [];
      let platforms: string[] = [];
      try { brandColors = JSON.parse(bp?.brandColors || "[]"); } catch {}
      try { brandFonts = JSON.parse(bp?.brandFonts || "[]"); } catch {}
      try { platforms = JSON.parse(campaign.platforms || "[]"); } catch {}

      const platformList = platforms.length > 0 ? platforms.join(", ") : "IG, LinkedIn";

      const systemPrompt = `
You are a Campaign Strategist AI for an autonomous B2B Digital Marketing Agency.
You are creating a CAMPAIGN-SPECIFIC content plan, NOT a routine weekly plan.

=== CAMPAIGN BRIEFING ===
CAMPAIGN NAME: ${campaign.name}
OBJECTIVE: ${campaign.objective}
TARGET AUDIENCE: ${campaign.targetAudience || "Genel B2B kitle"}
PLATFORMS: ${platformList}
DURATION: ${contentDays} gün (${startDate.toLocaleDateString("tr-TR")} — ${endDate.toLocaleDateString("tr-TR")})
BUDGET: ${campaign.budget ? campaign.budget + " TL" : "Belirtilmedi"}

=== BRAND IDENTITY ===
COMPANY STORY: ${bp?.companyStory || "B2B company"}
TONE ANCHOR: ${bp?.toneAnchor || "Professional yet accessible"}
BRAND COLORS: ${brandColors.length > 0 ? brandColors.join(", ") : "#f4841e, #1a1a2e"}
BRAND FONTS: ${brandFonts.length > 0 ? brandFonts.join(", ") : "Inter"}

=== CAMPAIGN FUNNEL STRATEGY ===
Create a phased funnel strategy distributed across the campaign duration:

Phase 1 — TEASER (First ~25% of days): Create curiosity and anticipation. Use ToF content.
  - Use mysterious hooks, countdown posts, behind-the-scenes teasers
  - Focus on Engagement strategy
  
Phase 2 — LAUNCH (Middle ~50% of days): Main campaign push. Use MoF content.
  - Product reveals, feature highlights, educational content, testimonials
  - Use Authority strategy
  - This phase should have the HIGHEST syntheticScorePrediction values
  
Phase 3 — CONVERSION (Last ~25% of days): Drive action. Use BoF content.
  - Limited time offers, direct CTAs, comparison posts, social proof
  - Use Engagement strategy with urgency

=== PLATFORM RULES ===
- Only use platforms from this list: ${platformList}
- Distribute posts across the available platforms evenly
- For LinkedIn: Never say "link in bio". End with "Link in the first comment."
- For Instagram (IG): At least 3 paragraph breaks before #hashtag blocks

=== DESIGN BRIEF RULES ===
- Reference brand colors: ${brandColors.length > 0 ? brandColors.join(", ") : "#f4841e, #1a1a2e"}
- Use typography: ${brandFonts.length > 0 ? brandFonts.join(", ") : "Inter"}
- For CAROUSEL: describe EACH SLIDE individually
- For REELS: describe 3-4 KEY SCENES as storyboard
- For STATIC_IMAGE: describe full composition

CRITICAL: ALL content MUST be in TURKISH (Türkçe).
Generate ${contentDays} content items (one per day). Output ONLY JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nProvide the campaign content plan in JSON." }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as const,
            properties: {
              campaignPlan: {
                type: "ARRAY" as const,
                items: {
                  type: "OBJECT" as const,
                  properties: {
                    day: { type: "INTEGER" as const },
                    phase: { type: "STRING" as const, enum: ["TEASER", "LAUNCH", "CONVERSION"] },
                    funnelStage: { type: "STRING" as const, enum: ["ToF", "MoF", "BoF"] },
                    contentType: { type: "STRING" as const, enum: ["REELS", "STATIC_IMAGE", "CAROUSEL", "TEXT_ONLY"] },
                    contextPlatform: { type: "STRING" as const, enum: ["IG", "TikTok", "LinkedIn", "X"] },
                    strategy: { type: "STRING" as const, enum: ["Authority", "Engagement"] },
                    topic: { type: "STRING" as const },
                    syntheticScorePrediction: { type: "NUMBER" as const },
                    draftText: { type: "STRING" as const },
                    designPrompt: { type: "STRING" as const },
                    scheduledHour: { type: "INTEGER" as const },
                  },
                  required: [
                    "day", "phase", "funnelStage", "contentType", "contextPlatform",
                    "strategy", "topic", "syntheticScorePrediction", "draftText",
                    "designPrompt", "scheduledHour",
                  ],
                },
              },
            },
            required: ["campaignPlan"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      const campaignPlan = parsed.campaignPlan || [];

      // 3. Create ContentJobs for each day
      let createdCount = 0;
      for (const day of campaignPlan) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + (day.day - 1));
        if (day.scheduledHour) {
          scheduledDate.setHours(day.scheduledHour, 0, 0, 0);
        }

        await prisma.contentJob.create({
          data: {
            topicId: `campaign-${campaign.id}-day${day.day}|${day.topic}`,
            strategy: day.strategy,
            status: "NEEDS_REVIEW",
            contentType: day.contentType,
            funnelStage: day.funnelStage,
            contextPlatform: day.contextPlatform,
            scheduledFor: scheduledDate,
            tenantId: campaign.tenantId,
            campaignId: campaign.id,
            bundle: {
              create: {
                reelsScript: day.contentType === "REELS" ? day.draftText : "",
                caption_ig: day.contextPlatform === "IG" ? day.draftText : "",
                thread_x: day.contextPlatform === "X" ? day.draftText : "",
                post_li: day.contextPlatform === "LinkedIn" ? day.draftText : "",
                videoUrl: "",
                syntheticScore: day.syntheticScorePrediction,
                storySequence: JSON.stringify({
                  designPrompt: day.designPrompt,
                  scheduledHour: day.scheduledHour,
                  campaignPhase: day.phase,
                }),
              },
            },
          },
        });
        createdCount++;
      }

      // 4. Update campaign status
      await prisma.campaign.update({
        where: { id },
        data: { status: "ACTIVE" },
      });

      return NextResponse.json({
        success: true,
        message: `${createdCount} içerik kampanya planına eklendi`,
        count: createdCount,
      });
    } catch (error: any) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "DRAFT" },
      });
      throw error;
    }
  } catch (error: any) {
    console.error("[API/campaigns/id/generate] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
