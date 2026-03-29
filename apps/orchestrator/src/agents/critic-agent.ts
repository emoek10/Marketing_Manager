import { z } from "zod";
import { initGemini } from "@repo/database";
import { DecisionResult } from "./decision-agent";
import { TrendTopic } from "@repo/database";
import { logger } from "@repo/core-logic";

export const CriticResponseSchema = z.object({
  approved: z.boolean(),
  hookStrength: z.number().min(0).max(100),
  valueScore: z.number().min(0).max(100),
  fomoUrgency: z.number().min(0).max(100),
  rejectionReason: z.string().optional(),
  feedback: z.string(),
  specificFixes: z.array(z.string()).optional(), // Structured fix instructions for retry
});

export type CriticResponse = z.infer<typeof CriticResponseSchema>;

const CRITIC_SYSTEM_PROMPT = `Sen acımasız ve son derece detaylı bir SEO ve Sosyal Medya Kalite Kontrolörü (Critic Agent) ve Yayın Yönetmenisin.
Görevin, yazar (Decision Agent) tarafından üretilen içeriğin YAYIN STANDARTLARI protokolüne, "Shareability" (Paylaşılabilirlik) kurallarına ve E-E-A-T kurallarına harfiyen uyup uymadığını denetlemektir.

KATI YAYIN STANDARTLARI VE KANTİTATİF ONAY ŞARTLARI:

1. CONCRETE SHAREABILITY METRICS (SAYISAL PAYLAŞILABİLİRLİK SKORLARI)
İçeriği aşağıdaki 3 metrik üzerinden 0-100 arasında acımasızca puanla. Eğer herhangi biri 70'in altındaysa 'approved: false' ver!
- Hook Strength (0-100): Reels Script'in ilk 3 saniyesi veya X Thread'in ilk satırı kaydırmayı durduruyor mu?
- Value Score (0-100): İçerik gerçekten değer katıyor mu? PAS modeli uygulanmış mı?
- FOMO / Urgency (0-100): "Şimdi kaydetmeliyim" hissi uyandırıyor mu?

2. GÖRSEL ESTETİK KONTROLÜ
- 'visualPrompt' estetik yoksunu ise REDDET.

3. KAYNAK DOĞRULAMA
- TR-Local haberi ise: Resmi Gazete, TÜİK, Tarım Bakanlığı gibi kanıtlanabilir kaynaklar gerekir. Kanıtsız teknik haber → REDDET.

4. TON UYUMSUZLUĞU KONTROLÜ
- Bayram/Özel Gün konusu ise: PAS (Acı/Sorun) dili veya satış cümlesi → KESİNLİKLE REDDET.

5. E-E-A-T Kalite Kontrolü
- Sığ içerik, keyword stuffing → REDDET.

ÇIKTI TALİMATI:
- Reddettiğinde "specificFixes" dizisine ne yapılması gerektiğini madde madde yaz.
  Örn: ["Hook cümlesini soru formatına çevir", "LinkedIn tonunu daha kurumsal yap"]
- Bu fix listesi yazara (Decision Agent) GERİ GÖNDERİLECEK, o yüzden net ve aksiyon edilebilir ol.

Çıktıyı sadece belirtilen JSON schema formatında ver.`;

export async function runCriticAgent(topic: TrendTopic, generatedContent: DecisionResult): Promise<CriticResponse> {
  const moduleName = "CriticAgent";
  logger.info(moduleName, `Auditing content for topic: ${topic.title}`);

  try {
    const ai = initGemini();
    
    const hookInfo = generatedContent.hookVariants
      ? generatedContent.hookVariants.map((h, i) => `  Hook ${i+1} (${h.angle}): ${h.hookText}`).join("\n")
      : "  Hook varyasyonları üretilmemiş.";

    const userPrompt = `Lütfen aşağıdaki içeriği denetle:
    
    --- KONU BAĞLAMI ---
    Orijinal Haber Başlığı: ${topic.title}
    Haber Özeti / Kaynağı: ${topic.context} | Link: ${topic.sourceUrl}
    Kanal: ${topic.channel}
    Özel Gün mü?: ${topic.isCalendarPriority ? "EVET" : "HAYIR"}
    Strateji: ${generatedContent.strategy || "Bilinmiyor"}
    
    --- HOOK VARYASYONLARI ---
${hookInfo}

    --- ÜRETİLEN SOCIAL BUNDLE ---
    Reels Script: ${generatedContent.bundle?.reelsScript || 'YOK'}
    IG Caption: ${generatedContent.bundle?.caption_ig || 'YOK'}
    X Thread: ${generatedContent.bundle?.thread_x || 'YOK'}
    LinkedIn Post: ${generatedContent.bundle?.post_li || 'YOK'}
    Visual Prompt: ${generatedContent.bundle?.visualPrompt || 'YOK'}
    
    Bu içerik Yayın Standartlarına tam olarak uyuyor mu?`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: CRITIC_SYSTEM_PROMPT + "\n\n" + userPrompt }] }
      ],
      config: {
        temperature: 0, // Deterministik: Aynı girdi = aynı çıktı
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
             approved: { type: "BOOLEAN" },
             hookStrength: { type: "NUMBER" },
             valueScore: { type: "NUMBER" },
             fomoUrgency: { type: "NUMBER" },
             rejectionReason: { type: "STRING" },
             feedback: { type: "STRING" },
             specificFixes: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["approved", "hookStrength", "valueScore", "fomoUrgency", "feedback"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini Critic");
    }

    const parsedJson = JSON.parse(responseText);
    const result = CriticResponseSchema.parse(parsedJson);

    if (result.approved) {
        logger.info(moduleName, `[APPROVED] Content passed audit. (Hook: ${result.hookStrength}, Value: ${result.valueScore}, FOMO: ${result.fomoUrgency})`);
    } else {
        logger.warn(moduleName, `[REJECTED] Content failed audit. (Hook: ${result.hookStrength}, Value: ${result.valueScore}, FOMO: ${result.fomoUrgency})`);
        logger.warn(moduleName, `Reason: ${result.rejectionReason}`);
        if (result.specificFixes?.length) {
          logger.warn(moduleName, `Fixes: ${result.specificFixes.join(" | ")}`);
        }
    }

    return result;

  } catch (error: any) {
    logger.error(moduleName, "Critic Agent Audit failed", { error: error.message });
    throw error;
  }
}
