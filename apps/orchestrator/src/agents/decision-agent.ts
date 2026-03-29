import { z } from "zod";
import { initGemini } from "@repo/database";
import { TrendTopic } from "@repo/database";
import { logger } from "@repo/core-logic";

// --- Schemas ---

export const HookVariantSchema = z.object({
  hookText: z.string(),
  angle: z.string(),
});

export const DecisionSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  strategy: z.enum(["Authority", "Engagement"]),
  hookVariants: z.array(HookVariantSchema).optional(),
  bundle: z.object({
    reelsScript: z.string().optional(),
    storySequence: z.array(z.string()).optional(),
    caption_ig: z.string().optional(),
    thread_x: z.string().optional(),
    post_li: z.string().optional(),
    miniBlog: z.string().optional(),
    searchKeywords: z.array(z.string()).optional(),
    visualPrompt: z.string().optional(),
  }).optional()
});

export type DecisionResult = z.infer<typeof DecisionSchema>;

// --- Critic Feedback Interface (for retry loop) ---
export interface CriticFeedbackForRetry {
  rejectionReason: string;
  feedback: string;
  hookStrength: number;
  valueScore: number;
  fomoUrgency: number;
  turn: number;
}

// --- System Prompt ---
const getSystemPrompt = (brandProfile: any, criticFeedback?: CriticFeedbackForRetry) => {
  let basePrompt = `Sen kıdemli bir Dijital Pazarlama Stratejisti ve SEO Uzmanısın.
Görevin sana verilen içerik/trend konusunu 0-100 arasında bir skorla puanlamak ve skora göre istenen içerikleri üretmektir.

COMPANY STORY (Pillar): ${brandProfile?.companyStory || "B2B Agriculture and Livestock company"}
BRAND STRATEGY ANCHOR: ${brandProfile?.toneAnchor || "Professional yet accessible"}
INDUSTRY: ${brandProfile?.industry || "Agriculture & Livestock"}

STRATEJİ MEKANİZMASI (Zorunlu Alan 'strategy'):
- Authority (Düşünce Lideri): Konu teknik, sektörel (TR-Local, Global-Tech) ise seçilir. Derin analiz içerir, LinkedIn'de parlar.
- Engagement (Etkileşim): Konu popüler kültür, trend, hızlı tüketilebilir veya kutlama (TR-Calendar) ise seçilir. Reels/TikTok'ta hızlı hook'larla parlar.

HOOK VARYASYONLARI (VaynerMedia "100 Hook Test" Metodu):
Her konu için 3 FARKLI "hookVariants" üret. Her biri farklı bir açı (angle) kullanmalı:
- Variant 1: Soru ile aç ("Biliyor muydunuz...?")
- Variant 2: Şok istatistikle aç ("Türkiye'de her yıl X...")
- Variant 3: Kişisel/hikaye ile aç ("Geçen hafta bir çiftçi bize...")

SKORLAMA EŞİKLERİ VE KURALLAR:
1. Skor < 55 (Gürültü): Konu marka için değersiz. 'bundle' objesini BOŞ bırak.
2. Skor 55 - 75 (Potansiyel): Sadece Mini-Blog ve LinkedIn Postu üret. (Authority stratejisi).
3. Skor 75 - 90 (Yüksek İlgi): Social Bundle (Reels, Story, tüm metinler) üret. (Engagement stratejisi).
4. Skor > 90 (Kritik/Viral): Tüm parçaları eksiksiz üret. Özel Gün ise skor > 95!

İÇERİK FORMATLARI (ZORUNLU SOCIAL BUNDLE):
- reelsScript: İlk 3 saniyede güçlü Hook. Max 60 sn.
- storySequence: 3-4 karelik görsel fikirleri.
- caption_ig: Kaydet/Paylaş çağrısı, hashtag ve emoji yoğun.
- thread_x: X karakter sınırına uygun, flood yapısı.
- post_li: B2B profesyonel ton, insightful.
- miniBlog: 300 kelimelik SEO özeti.

Çıktıyı SADECE belirtilen JSON formatında ver.`;

  // If critic gave feedback, append it as a corrective instruction
  if (criticFeedback) {
    basePrompt += `

⚠️ ÖNCEKİ DENEME ${criticFeedback.turn} KEZ REDDEDİLDİ. 
ELEŞTİRMEN GERİ BİLDİRİMİ:
- Red Nedeni: ${criticFeedback.rejectionReason}
- Detaylı Feedback: ${criticFeedback.feedback}
- Hook Gücü: ${criticFeedback.hookStrength}/100
- Değer Skoru: ${criticFeedback.valueScore}/100
- FOMO/Aciliyet: ${criticFeedback.fomoUrgency}/100

ZORUNLU DÜZELTMELERİN: Bu geri bildirimi dikkate alarak içeriği TAMAMEN YENİDEN yaz. Aynı hataları tekrarlama.`;
  }

  return basePrompt;
};

// --- Main Agent ---
export async function runDecisionAgent(
  topic: TrendTopic,
  brandProfile?: any,
  criticFeedback?: CriticFeedbackForRetry
): Promise<DecisionResult> {
  const moduleName = "DecisionAgent";
  const turnInfo = criticFeedback ? ` (Retry #${criticFeedback.turn})` : "";
  logger.info(moduleName, `Evaluating topic: ${topic.title}${turnInfo}`);

  try {
    const ai = initGemini();
    
    const userPrompt = `Lütfen şu trend konuyu bağlama uygun şekilde değerlendir ve içerik üret:
Başlık: ${topic.title}
Bağlam/Özet: ${topic.context}
Kaynak: ${topic.sourceUrl}`;

    const systemPrompt = getSystemPrompt(brandProfile, criticFeedback);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
             score: { type: "INTEGER" },
             reasoning: { type: "STRING" },
             strategy: { type: "STRING" },
             hookVariants: {
               type: "ARRAY",
               items: {
                 type: "OBJECT",
                 properties: {
                   hookText: { type: "STRING" },
                   angle: { type: "STRING" }
                 },
                 required: ["hookText", "angle"]
               }
             },
             bundle: {
                type: "OBJECT",
                properties: {
                  reelsScript: { type: "STRING" },
                  storySequence: { type: "ARRAY", items: { type: "STRING" } },
                  caption_ig: { type: "STRING" },
                  thread_x: { type: "STRING" },
                  post_li: { type: "STRING" },
                  miniBlog: { type: "STRING" },
                  searchKeywords: { type: "ARRAY", items: { type: "STRING" } },
                  visualPrompt: { type: "STRING" }
                }
             }
          },
          required: ["score", "reasoning", "strategy"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini");
    }

    const parsedJson = JSON.parse(responseText);
    const result = DecisionSchema.parse(parsedJson);

    logger.info(moduleName, `Decision complete. Score: ${result.score}`, { 
      reasoning: result.reasoning,
      hookCount: result.hookVariants?.length || 0
    });

    return result;

  } catch (error: any) {
    logger.error(moduleName, "Decision Agent failed", { error: error.message });
    throw error;
  }
}
