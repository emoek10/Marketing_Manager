import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL gerekli" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY eksik" }, { status: 500 });
    }

    const tenant = await prisma.tenant.findFirst({
      include: { brandProfile: true },
      orderBy: { createdAt: "desc" },
    });

    const bp = tenant?.brandProfile;

    // Fetch website HTML
    let html = "";
    try {
      const cleanUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      const res = await fetch(cleanUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyOS-SEO-Bot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      html = await res.text();
      // Truncate to ~15K chars
      html = html.slice(0, 15000);
    } catch (e: any) {
      console.error("Fetch error:", e.message);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Sen uzman bir SEO danışmanısın. Bir B2B şirketin web sitesini analiz et ve kapsamlı bir SEO strateji raporu hazırla.

=== ŞİRKET BİLGİLERİ ===
İSİM: ${tenant?.name || "Bilinmiyor"}
SEKTÖR: ${bp?.industry || "B2B"}
WEB SİTESİ: ${websiteUrl}
TARİFÇE: ${bp?.companyStory || ""}

=== WEB SİTESİ HTML (Kısaltılmış) ===
${html || "(Erişilemedi)"}

=== ANALİZ GÖREVLERİN ===

1. WEB SİTESİ SEO DURUMU: HTML'den çıkardığın bilgilere göre mevcut SEO durumunu değerlendir.
   - Title tag var mı ve optimize mi?
   - Meta description var mı?
   - H1-H6 hiyerarşisi doğru mu?
   - Sayfadaki metin yoğunluğu yeterli mi?
   - Mobil uyumluluk ipuçları (viewport meta)
   - Yükleme hızı ipuçları (büyük dosyalar, inline styles)
   - Yapısal veri (schema.org) var mı?

2. ANAHTAR KELİME STRATEJİSİ: Bu sektördeki en önemli anahtar kelimeleri belirle.
   - Ana anahtar kelimeler (head terms)
   - Uzun kuyruk anahtar kelimeler (long-tail)
   - Sıralanması en kolay olanlardan başla
   - Her anahtar kelime için tahmini rekabet seviyesi

3. İÇERİK STRATEJİSİ: Ne tür blog yazıları yazılmalı, ne sıklıkta?
   - Haftalık yayın planı önerisi (kaç yazı/hafta)
   - Konu kategorileri
   - İçerik formatları (rehber, karşılaştırma, nasıl yapılır, SSS)
   - Mevsimsel içerik fırsatları

4. TEKNİK SEO ÖNERİLERİ: Acil yapılması gerekenler
   - Kritik düzeltmeler (en önemliden başla)
   - Sayfa hızı önerileri
   - Mobil optimizasyon
   - İç link yapısı

5. RAKIP ANALİZİ: Bu sektördeki muhtemel rakiplerin SEO stratejileri

Her bölümü detaylı ve aksiyon alınabilir şekilde yaz. Türkçe olarak yaz.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            overallScore: { type: "INTEGER" as const, description: "Overall SEO health score 0-100" },
            currentStatus: {
              type: "OBJECT" as const,
              properties: {
                titleTag: { type: "STRING" as const },
                metaDescription: { type: "STRING" as const },
                headingStructure: { type: "STRING" as const },
                mobileReady: { type: "BOOLEAN" as const },
                hasSchema: { type: "BOOLEAN" as const },
                contentDensity: { type: "STRING" as const },
                summary: { type: "STRING" as const },
              },
              required: ["titleTag", "metaDescription", "headingStructure", "mobileReady", "summary"],
            },
            keywordStrategy: {
              type: "ARRAY" as const,
              items: {
                type: "OBJECT" as const,
                properties: {
                  keyword: { type: "STRING" as const },
                  searchVolume: { type: "STRING" as const },
                  competition: { type: "STRING" as const, description: "Düşük, Orta, Yüksek" },
                  priority: { type: "STRING" as const, description: "Acil, Yüksek, Orta, Düşük" },
                  suggestedTitle: { type: "STRING" as const },
                },
                required: ["keyword", "searchVolume", "competition", "priority", "suggestedTitle"],
              },
            },
            contentPlan: {
              type: "OBJECT" as const,
              properties: {
                postsPerWeek: { type: "INTEGER" as const },
                categories: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                formats: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                seasonalTopics: { type: "ARRAY" as const, items: { type: "STRING" as const } },
                weeklySchedule: { type: "STRING" as const },
              },
              required: ["postsPerWeek", "categories", "formats", "weeklySchedule"],
            },
            technicalFixes: {
              type: "ARRAY" as const,
              items: {
                type: "OBJECT" as const,
                properties: {
                  issue: { type: "STRING" as const },
                  severity: { type: "STRING" as const, description: "Kritik, Yüksek, Orta, Düşük" },
                  fix: { type: "STRING" as const },
                },
                required: ["issue", "severity", "fix"],
              },
            },
            competitorInsights: { type: "STRING" as const },
          },
          required: ["overallScore", "currentStatus", "keywordStrategy", "contentPlan", "technicalFixes", "competitorInsights"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return NextResponse.json({ success: true, analysis: result });
  } catch (error: any) {
    console.error("[API/seo-audit] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
