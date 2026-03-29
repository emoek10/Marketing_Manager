import { z } from 'zod';
import { initGemini } from "@repo/database";
import { logger } from "@repo/core-logic";

export const DayStrategySchema = z.object({
    day: z.number(),
    funnelStage: z.enum(['ToF', 'MoF', 'BoF']),
    contentType: z.enum(['REELS', 'STATIC_IMAGE', 'CAROUSEL', 'TEXT_ONLY']),
    contextPlatform: z.enum(['IG', 'TikTok', 'LinkedIn', 'X']),
    strategy: z.enum(['Authority', 'Engagement']),
    topic: z.string(),
    syntheticScorePrediction: z.number(),
    draftText: z.string(),
    designPrompt: z.string()
});

export const WeekStrategySchema = z.object({
    weekPlan: z.array(DayStrategySchema)
});

export async function generateWeeklyStrategy(brandProfile: any) {
    const ai = initGemini();
    const systemPrompt = `
You are the Chief Marketing Officer (CMO) of an autonomous B2B Digital Marketing Agency operating strictly on VaynerMedia principles.

COMPANY STORY (Pillar): ${brandProfile?.companyStory || "B2B Agriculture and Livestock company"}
BRAND STRATEGY ANCHOR: ${brandProfile?.toneAnchor || "Professional yet accessible"}

VAYNERMEDIA RULES:
1. The Funnel: Balance the week with ToF (Top of Funnel: Awareness/Viral), MoF (Middle: Authority/Education), and BoF (Bottom: Conversion/Product Focus).
2. Context is Queen: Adapt 'draftText' style to 'contextPlatform' without breaking the tone anchor.
   - For LinkedIn: Never say "link in bio". Always end with "Link in the first comment." and keep text corporate.
   - For Instagram (IG): Ensure there are at least 3 paragraph breaks (empty lines) separating the main text from the #hashtag blocks.
3. Day Trading Attention: Predict 'syntheticScorePrediction' based on psychological hook strength.

Generate an array of 7 items (day 1 to 7). Output ONLY JSON.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\nProvide the 7-day VaynerMedia strategy in JSON." }] }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        weekPlan: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    day: { type: "INTEGER" },
                                    funnelStage: { type: "STRING", enum: ["ToF", "MoF", "BoF"] },
                                    contentType: { type: "STRING", enum: ["REELS", "STATIC_IMAGE", "CAROUSEL", "TEXT_ONLY"] },
                                    contextPlatform: { type: "STRING", enum: ["IG", "TikTok", "LinkedIn", "X"] },
                                    strategy: { type: "STRING", enum: ["Authority", "Engagement"] },
                                    topic: { type: "STRING" },
                                    syntheticScorePrediction: { type: "NUMBER" },
                                    draftText: { type: "STRING" },
                                    designPrompt: { type: "STRING" }
                                },
                                required: ["day", "funnelStage", "contentType", "contextPlatform", "strategy", "topic", "syntheticScorePrediction", "draftText", "designPrompt"]
                            }
                        }
                    },
                    required: ["weekPlan"]
                }
            }
        });

        const parsed = JSON.parse(response.text || "{}");
        return WeekStrategySchema.parse(parsed);

    } catch (error) {
        logger.error("BrandStrategyAgent", "Strategy Generation failed", { error });
        throw error;
    }
}
