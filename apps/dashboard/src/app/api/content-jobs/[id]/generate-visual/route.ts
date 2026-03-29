import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY eksik" },
        { status: 500 }
      );
    }

    // 1. Get the job + bundle + campaign
    const job = await prisma.contentJob.findUnique({
      where: { id: jobId },
      include: {
        bundle: true,
        campaign: true,
        tenant: { include: { brandProfile: true } },
      },
    });

    if (!job || !job.bundle) {
      return NextResponse.json(
        { error: "İçerik bulunamadı" },
        { status: 404 }
      );
    }

    // 2. Extract designPrompt + campaignPhase from storySequence
    let designPrompt = "";
    let campaignPhase = "";
    if (job.bundle.storySequence) {
      try {
        const parsed = JSON.parse(job.bundle.storySequence);
        designPrompt = parsed.designPrompt || "";
        campaignPhase = parsed.campaignPhase || "";
      } catch {}
    }

    if (!designPrompt) {
      return NextResponse.json(
        { error: "Tasarım brief'i bulunamadı" },
        { status: 400 }
      );
    }

    // 2b. Build full brand identity context
    const bp = job.tenant?.brandProfile;
    const tenantName = job.tenant?.name || "Brand";

    let brandColors: string[] = ["#f4841e", "#1a1a2e", "#ffffff"];
    let brandFonts: string[] = ["Montserrat", "Inter"];
    try {
      if (bp?.brandColors) brandColors = JSON.parse(bp.brandColors);
      if (bp?.brandFonts) brandFonts = JSON.parse(bp.brandFonts);
    } catch {}

    const primaryColor = brandColors[0] || "#f4841e";
    const darkColor = brandColors[1] || "#1a1a2e";
    const lightColor = brandColors[2] || "#ffffff";
    const headlineFont = brandFonts[0] || "Montserrat";
    const bodyFont = brandFonts[1] || "Inter";

    // Campaign context
    const campaignName = job.campaign?.name || "";
    const campaignObjective = job.campaign?.objective || "";

    // Topic title
    const topicTitle = job.topicId.includes("|")
      ? job.topicId.split("|")[1]
      : job.topicId;

    // 3. Build platform-specific format instructions
    let formatInstruction = "";
    let dimensionInstruction = "";

    if (job.contentType === "CAROUSEL") {
      formatInstruction = `FORMAT: CAROUSEL post — Create a SINGLE composite image showing ALL slides side by side in a horizontal grid layout.
Each slide should be clearly separated with thin ${primaryColor}-accent dividers. Number each slide (1, 2, 3...) with a small circular badge in the ${primaryColor} brand accent color.
Show the full narrative flow. Aspect ratio: wide landscape to fit all slides (3200×1080 or similar).`;
      dimensionInstruction = "Landscape composite, each slide 1080×1080";
    } else if (job.contentType === "REELS") {
      formatInstruction = `FORMAT: REELS/VIDEO storyboard — Create a VERTICAL storyboard showing 3-4 key frames arranged top to bottom.
Each frame represents a different scene/moment. Add subtle scene transition indicators between frames.
Include a timeline bar on the left edge showing scene progression. Aspect ratio: 9:16 portrait (1080×1920).`;
      dimensionInstruction = "1080×1920 vertical portrait";
    } else if (job.contentType === "STATIC_IMAGE") {
      if (job.contextPlatform === "LinkedIn") {
        formatInstruction = `FORMAT: SINGLE static LinkedIn post — Create one complete professional social media post design.
LinkedIn-optimized aspect ratio: 4:5 portrait (1080×1350) for maximum feed presence.`;
        dimensionInstruction = "1080×1350 portrait";
      } else {
        formatInstruction = `FORMAT: SINGLE static Instagram post — Create one complete social media post design.
Aspect ratio: 1:1 square (1080×1080).`;
        dimensionInstruction = "1080×1080 square";
      }
    } else {
      formatInstruction = `FORMAT: Typography-focused post — Create a clean, bold typographic design with the key message as the visual hero.
Aspect ratio: 1:1 square (1080×1080).`;
      dimensionInstruction = "1080×1080 square";
    }

    // Phase-specific mood
    let phaseMood = "";
    if (campaignPhase === "TEASER") {
      phaseMood = `CAMPAIGN PHASE: TEASER — The mood is mysterious, intriguing, curiosity-driven. Use dramatic lighting, shadows, partial reveals. Think "something big is coming." Dark moody tones with ${primaryColor} accent highlights breaking through.`;
    } else if (campaignPhase === "LAUNCH") {
      phaseMood = `CAMPAIGN PHASE: LAUNCH — The mood is bold, confident, energetic. Full product reveal. Bright ${primaryColor} accents, clean white typography on ${darkColor} backgrounds. Maximum visual impact and clarity.`;
    } else if (campaignPhase === "CONVERSION") {
      phaseMood = `CAMPAIGN PHASE: CONVERSION — The mood is urgent, action-driven. Use strong CTA elements, countdown aesthetics, limited-time visual cues. Pair ${primaryColor} CTA buttons/badges with clean ${darkColor} backgrounds.`;
    }

    // 4. Build the premium design prompt
    const enhancedPrompt = `You are a world-class B2B social media graphic designer at a premium digital agency. Create a PRODUCTION-READY social media visual.

=== BRAND IDENTITY (CRITICAL — FOLLOW EXACTLY) ===
BRAND NAME: ${tenantName}
INDUSTRY: ${bp?.industry || "B2B Agriculture & Livestock Technology"}
COMPANY: ${bp?.companyStory || "RFID-based animal identification and management technology company"}
BRAND VALUES: ${bp?.brandValues || "Innovation, Reliability, Quality"}
${bp?.designSpec ? `DESIGN STYLE REFERENCE: ${bp.designSpec}` : ""}

COLOR SYSTEM (Use these EXACT hex colors, no substitutions):
  - Primary Accent: ${primaryColor} (used for headlines, CTAs, highlights, icons, key visual accents)
  - Dark Base: ${darkColor} (used for backgrounds, contrast panels, footer)
  - Light: ${lightColor} (used for body text on dark backgrounds, clean whitespace)
  - Additional brand colors: ${brandColors.slice(3).join(", ") || "none"}
  - Gradient: Subtle gradient from ${darkColor} to a 15% lighter variant for depth

TYPOGRAPHY (CRITICAL — text rendering quality is paramount):
  - Headlines: ${headlineFont} ExtraBold/Black, ALL CAPS, letter-spacing -1%, size 48-72pt equivalent
  - Body text: ${bodyFont} SemiBold, sentence case, line-height 1.5x, size 16-20pt equivalent
  - ALL visible text must be in TURKISH (Türkçe)
  - Text must be SHARP, CRISP, and PERFECTLY READABLE — no blurry, warped, or overlapping letters
  - Limit text to maximum 8-10 words on screen. Less text = more impact
  - Use BOLD CONTRAST: large white headlines on solid ${darkColor} background panels

BRANDING FOOTER (required on every visual):
  - Solid ${darkColor} bar at absolute bottom, 80px tall, 100% opacity
  - Left side: "${tenantName.toUpperCase()}" in ${lightColor}, ${headlineFont} Bold, 14pt
  - Right side: "${bp?.websiteUrl?.replace('https://', '') || tenantName.toLowerCase() + '.com'}" in ${lightColor}, ${bodyFont} Regular, 12pt
  - NEVER invent or hallucinate brand names — use ONLY "${tenantName}"

${phaseMood}

=== PLATFORM-NATIVE STYLE ===
${job.contextPlatform === "LinkedIn" ? `LINKEDIN STYLE: Professional, corporate, trustworthy. Clean layouts, generous whitespace, data-driven visuals. Infographic style when possible. Muted backgrounds with sharp accent colors. Think: McKinsey meets Apple keynote.` : ""}
${job.contextPlatform === "IG" ? `INSTAGRAM STYLE: Bold, visually striking, scroll-stopping. High contrast, dynamic compositions, vibrant accent colors punching through dark backgrounds. Think: premium tech brand on Instagram, not generic social media.` : ""}
${job.contextPlatform === "TikTok" ? `TIKTOK STYLE: Energetic, fast-paced visual feel. Bold typography, dynamic angles, behind-the-scenes authenticity mixed with polished brand elements.` : ""}
${job.contextPlatform === "X" ? `X/TWITTER STYLE: Clean, minimal, statement-driven. Focus on one powerful visual element with punchy text. Sharp contrast.` : ""}

=== DESIGN BRIEF ===
${formatInstruction}
Dimensions: ${dimensionInstruction}
Platform: ${job.contextPlatform}
Content Type: ${job.contentType}
Topic: "${topicTitle}"
${campaignName ? `Campaign: "${campaignName}" — ${campaignObjective}` : ""}
Funnel Stage: ${job.funnelStage} (${job.funnelStage === "ToF" ? "Awareness" : job.funnelStage === "MoF" ? "Consideration" : "Conversion"})
Strategy: ${job.strategy}

CREATIVE DIRECTION:
${designPrompt}

=== DESIGN SYSTEM V7.2 RULES ===
1. LAYOUT: One dominant focal element (product/hero image/key text). Supporting elements at 40% visual weight. Clear Z-pattern or F-pattern reading flow
2. SAFE ZONE: All text within 70% canvas width. 60px minimum padding. No text touching edges
3. COLOR RATIO: 60% ${darkColor} (background/base), 25% ${lightColor} (text/space), 15% ${primaryColor} (accents/CTAs)
4. IMAGERY: Photorealistic product renders with rim lighting. Clean cutouts on gradient backgrounds. NO cartoons, NO illustrations, NO flat vector art
5. CONTRAST: WCAG AAA contrast minimum. ${lightColor} text on ${darkColor} only. ${primaryColor} for accents on ${darkColor} only. NEVER place ${primaryColor} text on ${lightColor} backgrounds
6. DEPTH: Floating elements get subtle shadow (0 12px 40px rgba(0,0,0,0.35)). Background elements at 5-10% opacity for layered depth
7. COMPOSITION: Rule of thirds. Asymmetric balance preferred. One clear focal point with breathing room

=== NEGATIVE PROMPT (DO NOT include these) ===
- NO blurry or illegible text
- NO cartoon/illustration/flat vector style — photorealistic ONLY for products
- NO generic stock photo people with fake smiles
- NO clipart icons
- NO rainbow or multicolor gradients — stick to brand palette ONLY
- NO busy/cluttered compositions — embrace negative space
- NO device frames, browser mockups, or phone bezels
- NO watermarks, AI artifacts, or distorted faces/hands
- NO text in languages other than Turkish
- DO NOT hallucinate brand names or logos — if unsure, omit text rather than guess

OUTPUT: Generate ONLY the final production-ready image. Pure visual, no explanations.`;

    // 5. Generate image via Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    // 6. Extract image from response
    let imageData: Buffer | null = null;
    let mimeType = "image/png";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageData = Buffer.from(part.inlineData.data!, "base64");
          mimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Görsel üretilemedi — model metin döndürdü" },
        { status: 500 }
      );
    }

    // 7. Save image to public/generated/
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const filename = `visual-${jobId.slice(0, 8)}-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "generated");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), imageData);

    const imageUrl = `/generated/${filename}`;

    // 8. Update bundle with image URL
    await prisma.socialBundle.update({
      where: { id: job.bundle.id },
      data: { videoUrl: imageUrl },
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("[API/generate-visual] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
