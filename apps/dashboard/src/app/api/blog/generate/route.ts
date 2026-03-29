import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { targetKeyword, secondaryKeywords, wordTarget, tone } = await req.json();

    if (!targetKeyword) {
      return NextResponse.json({ error: "Anahtar kelime gerekli" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY eksik" }, { status: 500 });
    }

    const tenant = await prisma.tenant.findFirst({
      include: { brandProfile: true },
      orderBy: { createdAt: "desc" },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const bp = tenant.brandProfile;
    const targetWords = wordTarget || 1500;
    const brandTone = tone || bp?.toneAnchor || "professional";

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Parse brand info
    let brandColors: string[] = [];
    let brandFonts: string[] = [];
    try { brandColors = JSON.parse(bp?.brandColors || "[]"); } catch {}
    try { brandFonts = JSON.parse(bp?.brandFonts || "[]"); } catch {}

    // Generate SEO-optimized blog post
    const blogPrompt = `Sen deneyimli bir Türk editör ve SEO uzmanısın. Bir B2B şirket için blog yazısı yazacaksın.

=== MARKA ===
ŞİRKET: ${tenant.name}
SEKTÖR: ${bp?.industry || "B2B Teknoloji"}
HİKAYE: ${bp?.companyStory || ""}
DEĞERLER: ${bp?.brandValues || ""}
WEB SİTESİ: ${bp?.websiteUrl || ""}
TON: ${brandTone === "professional" ? "Kurumsal, güvenilir, bilgilendirici — bir sektör dergisinde yayımlanan makale gibi" : brandTone === "friendly" ? "Samimi, yakın, sohbet tarzında — bir kahve sohbetinde anlatır gibi" : brandTone === "bold" ? "Cesur, otoriter, sektör lideri tarzında — TED konuşması gibi" : brandTone === "educational" ? "Eğitici, detaylı — bir ders kitabındaki gibi ama sıkıcı olmadan" : "Yaratıcı, eğlenceli, akılda kalıcı"}

=== YAZI GEREKSİNİMLERİ ===
ANAHTAR KELİME: "${targetKeyword}"
${secondaryKeywords ? `İKİNCİL KELİMELER: ${secondaryKeywords}` : ""}
HEDEF KELİME SAYISI: ~${targetWords}
DİL: Türkçe

=== KRİTİK YAZIM KURALLARI ===

KESINLIKLE KULLANMAYACAĞIN ŞEYLER:
- Yıldız işareti (*) veya çift yıldız (**) KULLANMA — ne kalın yazı ne italik için
- Tire (-) ile madde işareti listesi YAPMA
- Hashtag (#) KULLANMA — ne başlık için ne içerikte
- Markdown formatı KULLANMA — bu düz metin olacak
- Numara ile sıralı liste YAPMA (1. 2. 3. gibi)
- Emoji KULLANMA
- [INTERNAL_LINK] gibi teknik etiketler KULLANMA

=== PARAGRAF ve FORMATLAMA KURALLARI (ÇOK ÖNEMLİ) ===

Her paragraf arasında mutlaka BİR BOŞ SATIR bırak. Yani iki paragraf arasında "\\n\\n" olmalı.

Yazı formatı şöyle olmalı:

Giriş paragrafı burada. İki üç cümlelik kısa bir paragraf.

Alt Başlık Burada

Bu bölümün ilk paragrafı. Kısa ve öz, 2-3 cümle.

Bu bölümün ikinci paragrafı. Farklı bir açıdan devam ediyor.

Bir Sonraki Alt Başlık

Yeni bölümün paragrafı burada başlıyor.

Yani:
- Her alt başlık kendi satırında, tek başına, başında ve sonunda boş satır
- Her paragraf kendi başına, aralarında boş satır
- Hiçbir paragraf birbirine yapışık olmamalı
- BU ÇOK ÖNEMLİ: İki cümle grubu arasında MUTLAKA boş satır bırak

YAZIM TARZI:
- Sanki bu yazıyı deneyimli bir sektör editörü kendi eliyle yazmış gibi olmalı
- Doğal, akıcı, sohbet havasında ama profesyonel
- Okuyucuya "siz" diye hitap et
- Kısa paragraflar (2-4 cümle max), kolay okunur
- Her bölüm arasında doğal geçiş cümleleri kullan
- Listeler yerine akıcı paragraflar yaz. "Birincisi... İkincisi..." gibi doğal geçişler
- Gerçek veriler, somut örnekler ve sektörel bilgiler ekle
- Yazının sonunda doğal bir kapanış yap

SEO KURALLARI (ama doğal olsun):
- Başlık: Anahtar kelimeyi içersin, 50-60 karakter, merak uyandırıcı
- İlk paragrafta anahtar kelimeyi doğal şekilde geçir
- 5-8 alt başlık kullan
- Anahtar kelime yoğunluğu %1-2
- Yazının sonuna "Sıkça Sorulan Sorular" bölümü ekle (3-5 soru-cevap, her soru alt başlık)
- Meta açıklaması (excerpt): 140-160 karakter

Yazıyı oluştur. SADECE JSON döndür.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: blogPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as const,
          properties: {
            title: { type: "STRING" as const, description: "SEO-optimized blog title in Turkish" },
            excerpt: { type: "STRING" as const, description: "Meta description, 140-160 chars, Turkish" },
            content: { type: "STRING" as const, description: "Full blog post in PLAIN TEXT. NO markdown. Paragraphs separated by blank lines (double newline). Headings on own line with blank lines around them." },
            secondaryKeywords: {
              type: "ARRAY" as const,
              items: { type: "STRING" as const },
              description: "5-8 secondary/LSI keywords discovered during writing",
            },
            faqQuestions: {
              type: "ARRAY" as const,
              items: { type: "STRING" as const },
              description: "3-5 FAQ questions that were included in the blog",
            },
          },
          required: ["title", "excerpt", "content", "secondaryKeywords", "faqQuestions"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");

    // Post-process content: ensure paragraphs are properly separated
    let processedContent = result.content || "";
    // Remove any remaining markdown artifacts
    processedContent = processedContent
      .replace(/\*\*/g, "")       // Remove bold **
      .replace(/\*/g, "")         // Remove italic *
      .replace(/^#{1,6}\s/gm, "") // Remove heading #
      .replace(/^[-•]\s/gm, "")   // Remove bullet points
      .replace(/\[INTERNAL_LINK[^\]]*\]/g, "") // Remove internal link tags
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines to double
      .trim();

    // Calculate metrics
    const wordCount = processedContent.split(/\s+/).filter(Boolean).length || 0;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // SEO Analysis
    const seoAnalysis = analyzeSEO(result, targetKeyword, wordCount, processedContent);

    // Generate slug
    const slug = result.title
      .toLowerCase()
      .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) + "-" + Date.now().toString(36);

    // Generate featured image for the blog post
    let featuredImageUrl: string | null = null;
    try {
      const primaryColor = brandColors[0] || "#f4841e";
      const darkColor = brandColors[1] || "#1a1a2e";

      const imagePrompt = `Create a professional, premium blog header image for a B2B company blog post.

BLOG TOPIC: "${result.title}"
INDUSTRY: ${bp?.industry || "Technology"}
BRAND COLORS: Primary ${primaryColor}, Dark ${darkColor}

REQUIREMENTS:
- Modern, clean, professional blog header illustration
- Abstract or semi-realistic visual that represents the topic
- Color palette: primarily ${darkColor} background with ${primaryColor} accent highlights
- Wide landscape format (1200x630 — Open Graph standard)
- NO text, NO words, NO letters on the image — purely visual/graphic
- Professional B2B feel, not cartoonish
- Subtle geometric or organic patterns
- Clean negative space
- The image should feel like a premium editorial photograph or a tasteful abstract graphic

STYLE: Premium editorial, modern B2B, clean gradients, subtle depth
DO NOT add any text, watermarks, or logos to the image.`;

      const imgResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
        config: { responseModalities: ["IMAGE", "TEXT"] },
      });

      if (imgResponse.candidates?.[0]?.content?.parts) {
        for (const part of imgResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            const imgBuffer = Buffer.from(part.inlineData.data!, "base64");
            const ext = part.inlineData.mimeType?.includes("png") ? "png" : "jpg";
            const imgFilename = `blog-${slug.slice(0, 30)}-${Date.now()}.${ext}`;
            const dir = path.join(process.cwd(), "public", "generated");
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(dir, imgFilename), imgBuffer);
            featuredImageUrl = `/generated/${imgFilename}`;
            break;
          }
        }
      }
    } catch (imgError: any) {
      console.error("[blog/generate] Image generation failed:", imgError.message);
      // Continue without image — blog content is more important
    }

    // Save to database
    const blogPost = await prisma.blogPost.create({
      data: {
        tenantId: tenant.id,
        title: result.title,
        slug,
        content: processedContent,
        excerpt: result.excerpt,
        targetKeyword,
        secondaryKeys: JSON.stringify(result.secondaryKeywords || []),
        seoScore: seoAnalysis.score,
        seoAnalysis: JSON.stringify(seoAnalysis),
        status: "DRAFT",
        wordCount,
        readingTime,
        featuredImage: featuredImageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      post: blogPost,
      seoAnalysis,
    });
  } catch (error: any) {
    console.error("[API/blog/generate] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// SEO Analysis function
function analyzeSEO(result: any, targetKeyword: string, wordCount: number, processedContent: string) {
  const checks: { name: string; status: "pass" | "warn" | "fail"; detail: string }[] = [];
  let totalScore = 0;

  const content = processedContent.toLowerCase();

  // 1. Title length (10 points)
  const titleLen = result.title?.length || 0;
  if (titleLen >= 30 && titleLen <= 65) {
    checks.push({ name: "Başlık Uzunluğu", status: "pass", detail: `${titleLen} karakter (ideal: 30-65)` });
    totalScore += 10;
  } else if (titleLen > 0) {
    checks.push({ name: "Başlık Uzunluğu", status: "warn", detail: `${titleLen} karakter (ideal: 30-65)` });
    totalScore += 5;
  } else {
    checks.push({ name: "Başlık Uzunluğu", status: "fail", detail: "Başlık bulunamadı" });
  }

  // 2. Title contains keyword (15 points)
  if (result.title?.toLowerCase().includes(targetKeyword.toLowerCase())) {
    checks.push({ name: "Başlıkta Anahtar Kelime", status: "pass", detail: "Mevcut" });
    totalScore += 15;
  } else {
    checks.push({ name: "Başlıkta Anahtar Kelime", status: "fail", detail: "Başlıkta anahtar kelime yok" });
  }

  // 3. Meta description (10 points)
  const excerptLen = result.excerpt?.length || 0;
  if (excerptLen >= 120 && excerptLen <= 165) {
    checks.push({ name: "Meta Açıklama", status: "pass", detail: `${excerptLen} karakter (ideal: 120-165)` });
    totalScore += 10;
  } else if (excerptLen > 0) {
    checks.push({ name: "Meta Açıklama", status: "warn", detail: `${excerptLen} karakter (ideal: 120-165)` });
    totalScore += 5;
  } else {
    checks.push({ name: "Meta Açıklama", status: "fail", detail: "Meta açıklama bulunamadı" });
  }

  // 4. Word count (10 points)
  if (wordCount >= 1000) {
    checks.push({ name: "Kelime Sayısı", status: "pass", detail: `${wordCount} kelime (min: 1000)` });
    totalScore += 10;
  } else if (wordCount >= 500) {
    checks.push({ name: "Kelime Sayısı", status: "warn", detail: `${wordCount} kelime (min: 1000 önerilir)` });
    totalScore += 5;
  } else {
    checks.push({ name: "Kelime Sayısı", status: "fail", detail: `${wordCount} kelime (çok kısa)` });
  }

  // 5. Keyword density (15 points)
  const keywordCount = (content.match(new RegExp(targetKeyword.toLowerCase(), "g")) || []).length;
  const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
  if (density >= 0.5 && density <= 3) {
    checks.push({ name: "Anahtar Kelime Yoğunluğu", status: "pass", detail: `${density.toFixed(1)}% (ideal: 0.5-3%)` });
    totalScore += 15;
  } else if (density > 0) {
    checks.push({ name: "Anahtar Kelime Yoğunluğu", status: "warn", detail: `${density.toFixed(1)}% (ideal: 0.5-3%)` });
    totalScore += 8;
  } else {
    checks.push({ name: "Anahtar Kelime Yoğunluğu", status: "fail", detail: "İçerikte anahtar kelime bulunamadı" });
  }

  // 6. Paragraph count (15 points) — good content should have many well-separated paragraphs
  const paragraphs = processedContent.split(/\n\n+/).filter(p => p.trim().length > 20);
  if (paragraphs.length >= 10) {
    checks.push({ name: "Paragraf Yapısı", status: "pass", detail: `${paragraphs.length} paragraf (iyi ayrılmış)` });
    totalScore += 15;
  } else if (paragraphs.length >= 5) {
    checks.push({ name: "Paragraf Yapısı", status: "warn", detail: `${paragraphs.length} paragraf (daha fazla olabilir)` });
    totalScore += 8;
  } else {
    checks.push({ name: "Paragraf Yapısı", status: "fail", detail: `${paragraphs.length} paragraf (yetersiz)` });
  }

  // 7. First paragraph keyword (10 points)
  const firstParagraph = content.split("\n\n")[0] || "";
  if (firstParagraph.includes(targetKeyword.toLowerCase())) {
    checks.push({ name: "İlk Paragrafta Anahtar Kelime", status: "pass", detail: "Mevcut" });
    totalScore += 10;
  } else {
    checks.push({ name: "İlk Paragrafta Anahtar Kelime", status: "warn", detail: "İlk paragrafta anahtar kelime bulunamadı" });
    totalScore += 3;
  }

  // 8. FAQ section (10 points)
  const hasFAQ = content.includes("sss") || content.includes("sıkça sorulan") || content.includes("sıkca sorulan") || (result.faqQuestions?.length > 0);
  if (hasFAQ) {
    checks.push({ name: "SSS Bölümü", status: "pass", detail: `${result.faqQuestions?.length || 0} soru` });
    totalScore += 10;
  } else {
    checks.push({ name: "SSS Bölümü", status: "fail", detail: "SSS bölümü bulunamadı" });
  }

  // 9. Content length satisfaction (5 points)
  const lengthRatio = wordCount / (result.wordTarget || 1500);
  if (lengthRatio >= 0.8) {
    checks.push({ name: "Hedef Uzunluk", status: "pass", detail: `Hedefe ulaşıldı` });
    totalScore += 5;
  } else {
    checks.push({ name: "Hedef Uzunluk", status: "warn", detail: `Hedefin ${Math.round(lengthRatio * 100)}%'ine ulaşıldı` });
    totalScore += 2;
  }

  return {
    score: Math.min(totalScore, 100),
    checks,
    keywordCount,
    density: parseFloat(density.toFixed(1)),
    paragraphCount: paragraphs.length,
    wordCount,
  };
}
