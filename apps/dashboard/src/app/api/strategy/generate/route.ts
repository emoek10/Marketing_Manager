import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

export async function POST() {
  try {
    // 1. Get tenant + brand profile
    const tenant = await prisma.tenant.findFirst({
      include: { brandProfile: true },
      orderBy: { createdAt: "desc" },
    });

    if (!tenant || !tenant.brandProfile) {
      return NextResponse.json(
        { error: "Tenant veya marka profili bulunamadı" },
        { status: 404 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable eksik" },
        { status: 500 }
      );
    }

    // 2. Set generating flag
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { isGeneratingStrategy: true },
    });

    try {
      // 3. Call Gemini for strategy
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const bp = tenant.brandProfile;

      // Parse brand identity
      let brandColors: string[] = [];
      let brandFonts: string[] = [];
      try { brandColors = JSON.parse(bp.brandColors || "[]"); } catch {}
      try { brandFonts = JSON.parse(bp.brandFonts || "[]"); } catch {}

      const systemPrompt = `
You are the Chief Marketing Officer (CMO) of an autonomous B2B Digital Marketing Agency operating strictly on VaynerMedia principles.

=== BRAND IDENTITY ===
COMPANY STORY (Pillar): ${bp.companyStory || "B2B company"}
BRAND STRATEGY ANCHOR: ${bp.toneAnchor || "Professional yet accessible"}
INDUSTRY: ${bp.industry || "General"}
BRAND VALUES: ${bp.brandValues || "Quality, Trust, Innovation"}
BRAND COLORS: ${brandColors.length > 0 ? brandColors.join(", ") : "#f4841e, #1a1a2e, #ffffff"}
BRAND FONTS: ${brandFonts.length > 0 ? brandFonts.join(", ") : "Inter"}
${bp.logoUrl ? `LOGO URL: ${bp.logoUrl}` : ""}

=== VAYNERMEDIA RULES ===
1. The Funnel: Balance the week with ToF (Top of Funnel: Awareness/Viral), MoF (Middle: Authority/Education), and BoF (Bottom: Conversion/Product Focus).
2. Context is Queen: Adapt 'draftText' style to 'contextPlatform' without breaking the tone anchor.
   - For LinkedIn: Never say "link in bio". Always end with "Link in the first comment." and keep text corporate.
   - For Instagram (IG): Ensure there are at least 3 paragraph breaks separating the main text from the #hashtag blocks.
3. Day Trading Attention: Predict 'syntheticScorePrediction' based on psychological hook strength.

=== OPTIMAL POSTING SCHEDULE (Research-Based) ===
Use these peak engagement windows when assigning contextPlatform to specific days:
- Instagram: Wednesday & Friday, 11:00-13:00 TR time (lunch break engagement)
- LinkedIn: Tuesday & Thursday, 08:00-10:00 TR time (professional morning)
- TikTok: Friday & Saturday, 19:00-21:00 TR time (evening entertainment)
- X (Twitter): Monday & Wednesday, 12:00-15:00 TR time (midday news cycle)
Spread platforms across the week — DO NOT put all LinkedIn posts on same day. Each day should have ONE platform only.
Include a 'scheduledHour' field (24h format, e.g. 11) indicating the optimal posting hour.

=== DESIGN BRIEF RULES ===
The 'designPrompt' field is a visual brief for the graphic designer. It MUST:
- Reference the brand colors: ${brandColors.length > 0 ? brandColors.join(", ") : "#f4841e, #1a1a2e"}
- Specify the typography: ${brandFonts.length > 0 ? brandFonts.join(", ") : "Inter"}
- Describe the visual composition (layout, imagery, mood, atmosphere)
- Never say "use brand colors" — explicitly state which hex codes to use where (e.g. "arka plan ${brandColors[0] || '#1a1a2e'}, başlık ${brandColors[1] || '#f4841e'} ile")
- For CAROUSEL: describe EACH SLIDE individually. Example: "Slayt 1: Kapak — büyük başlık... Slayt 2: İstatistik... Slayt 3: ..." Include total slide count.
- For REELS: describe 3-4 KEY SCENES as storyboard frames. Example: "Sahne 1: Açılış hook... Sahne 2: Problem gösterimi..."
- For STATIC_IMAGE: describe the single composition in detail (background, foreground, text placement)

CRITICAL LANGUAGE RULE: ALL content MUST be written in TURKISH (Türkçe). This includes 'topic', 'draftText', and 'designPrompt' fields. Do NOT write any content in English.

Generate an array of 7 items (day 1 to 7). Output ONLY JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  systemPrompt +
                  "\n\nProvide the 7-day VaynerMedia strategy in JSON.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as const,
            properties: {
              weekPlan: {
                type: "ARRAY" as const,
                items: {
                  type: "OBJECT" as const,
                  properties: {
                    day: { type: "INTEGER" as const },
                    funnelStage: {
                      type: "STRING" as const,
                      enum: ["ToF", "MoF", "BoF"],
                    },
                    contentType: {
                      type: "STRING" as const,
                      enum: [
                        "REELS",
                        "STATIC_IMAGE",
                        "CAROUSEL",
                        "TEXT_ONLY",
                      ],
                    },
                    contextPlatform: {
                      type: "STRING" as const,
                      enum: ["IG", "TikTok", "LinkedIn", "X"],
                    },
                    strategy: {
                      type: "STRING" as const,
                      enum: ["Authority", "Engagement"],
                    },
                    topic: { type: "STRING" as const },
                    syntheticScorePrediction: { type: "NUMBER" as const },
                    draftText: { type: "STRING" as const },
                    designPrompt: { type: "STRING" as const },
                    scheduledHour: { type: "INTEGER" as const },
                  },
                  required: [
                    "day",
                    "funnelStage",
                    "contentType",
                    "contextPlatform",
                    "strategy",
                    "topic",
                    "syntheticScorePrediction",
                    "draftText",
                    "designPrompt",
                    "scheduledHour",
                  ],
                },
              },
            },
            required: ["weekPlan"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      const weekPlan = parsed.weekPlan || [];

      // 4. Create ContentJobs + SocialBundles for each day
      const today = new Date();
      let createdCount = 0;
      for (const day of weekPlan) {
        // Calculate scheduled date: today + day offset
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + (day.day - 1));
        if (day.scheduledHour) {
          scheduledDate.setHours(day.scheduledHour, 0, 0, 0);
        }

        await prisma.contentJob.create({
          data: {
            topicId: `strategy-${Date.now()}-day${day.day}|${day.topic}`,
            strategy: day.strategy,
            status: "NEEDS_REVIEW",
            contentType: day.contentType,
            funnelStage: day.funnelStage,
            contextPlatform: day.contextPlatform,
            scheduledFor: scheduledDate,
            tenantId: tenant.id,
            bundle: {
              create: {
                reelsScript: day.contentType === "REELS" ? day.draftText : "",
                caption_ig:
                  day.contextPlatform === "IG" ? day.draftText : "",
                thread_x: day.contextPlatform === "X" ? day.draftText : "",
                post_li:
                  day.contextPlatform === "LinkedIn" ? day.draftText : "",
                videoUrl: "",
                syntheticScore: day.syntheticScorePrediction,
                storySequence: JSON.stringify({
                  designPrompt: day.designPrompt,
                  scheduledHour: day.scheduledHour,
                }),
              },
            },
          },
        });
        createdCount++;
      }

      // 5. Clear flag
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { isGeneratingStrategy: false },
      });

      return NextResponse.json({
        success: true,
        message: `${createdCount} günlük strateji oluşturuldu`,
        count: createdCount,
      });
    } catch (error: any) {
      // Clear flag on error too
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { isGeneratingStrategy: false },
      });
      throw error;
    }
  } catch (error: any) {
    console.error("[API/strategy/generate] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
