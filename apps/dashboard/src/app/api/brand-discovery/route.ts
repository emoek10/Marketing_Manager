import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return NextResponse.json({ error: "URL gereklidir" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY eksik" }, { status: 500 });
    }

    // 1. Fetch the website HTML
    let htmlContent = "";
    let fetchError = "";
    try {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
      });
      htmlContent = await response.text();
      // Truncate to ~40K chars to stay within token limits
      if (htmlContent.length > 40000) {
        htmlContent = htmlContent.substring(0, 40000);
      }
    } catch (e: any) {
      fetchError = e.message;
      console.warn("[brand-discovery] Could not fetch website:", fetchError);
    }

    // 2. Analyze with Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const analysisPrompt = `You are an expert Brand Strategist and UI/UX Designer. Analyze the following website and extract a complete brand identity profile.

${htmlContent ? `=== WEBSITE HTML (from ${websiteUrl}) ===
${htmlContent}
=== END HTML ===` : `=== NOTE: Could not fetch website at ${websiteUrl} (error: ${fetchError}). Analyze based on the domain name and any knowledge you have about this brand. ===`}

YOUR TASK: Extract the brand identity from this website. Analyze:
1. The CSS styles, inline styles, and meta tags for brand colors
2. The font-family declarations for typography
3. The content, tone, and messaging for brand voice
4. The about/company sections for company story
5. The overall industry and market positioning

RULES:
- Extract REAL colors from the CSS/HTML, not guesses. Look for background-color, color, --brand, --primary variables
- For fonts, look at font-family declarations in CSS
- Write the company story in TURKISH (Türkçe), 2-3 sentences
- Identify the DOMINANT 3-5 colors only (skip generic colors like pure black/white unless they're intentionally branded)
- For toneAnchor, choose ONE of: "professional", "friendly", "bold", "educational", "playful"

Return ONLY valid JSON, no markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            brandColors: {
              type: "ARRAY" as const,
              items: { type: "STRING" as const },
              description: "3-5 hex color codes extracted from the website CSS/design, ordered by dominance. Example: ['#f4841e', '#1a1a2e', '#ffffff']",
            },
            brandFonts: {
              type: "ARRAY" as const,
              items: { type: "STRING" as const },
              description: "1-3 font family names found in the website CSS. Example: ['Inter', 'Montserrat']",
            },
            toneAnchor: {
              type: "STRING" as const,
              enum: ["professional", "friendly", "bold", "educational", "playful"],
              description: "The overall communication tone of the brand",
            },
            companyStory: {
              type: "STRING" as const,
              description: "2-3 sentence company description in TURKISH (Türkçe). What does the company do, what makes them unique?",
            },
            industry: {
              type: "STRING" as const,
              description: "Industry/sector in Turkish. Example: 'Hayvancılık & Tarım Teknolojisi'",
            },
            brandValues: {
              type: "STRING" as const,
              description: "3-5 brand values as comma separated string in Turkish. Example: 'İnovasyon, Güvenilirlik, Kalite'",
            },
            logoDescription: {
              type: "STRING" as const,
              description: "Brief description of the logo if found (shape, colors, style). In Turkish.",
            },
            designStyle: {
              type: "STRING" as const,
              description: "Overall design style description in Turkish (e.g. 'Minimalist ve modern, koyu arka plan ağırlıklı, turuncu aksanlarla profesyonel B2B hissiyatı')",
            },
          },
          required: [
            "brandColors", "brandFonts", "toneAnchor",
            "companyStory", "industry", "brandValues",
            "logoDescription", "designStyle",
          ],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");

    return NextResponse.json({
      success: true,
      discovery: result,
      sourceUrl: websiteUrl,
      hadHtml: !!htmlContent,
    });
  } catch (error: any) {
    console.error("[API/brand-discovery] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
