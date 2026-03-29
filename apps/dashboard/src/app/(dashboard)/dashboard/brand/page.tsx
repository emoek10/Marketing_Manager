"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface BrandData {
  tenantId: string;
  tenantName: string;
  plan: string;
  brand: {
    id: string;
    companyStory: string | null;
    industry: string | null;
    websiteUrl: string | null;
    toneAnchor: string | null;
    brandValues: string | null;
    designSpec: string | null;
    brandColors: string | null;
    brandFonts: string | null;
    logoUrl: string | null;
    newsFilters: string | null;
    competitorUrls: string | null;
  } | null;
}

interface DiscoveryResult {
  brandColors: string[];
  brandFonts: string[];
  toneAnchor: string;
  companyStory: string;
  industry: string;
  brandValues: string;
  logoDescription: string;
  designStyle: string;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Kurumsal & Güvenilir" },
  { value: "friendly", label: "Samimi & Yakın" },
  { value: "bold", label: "Cesur & Otoriter" },
  { value: "educational", label: "Eğitici & Bilgilendirici" },
  { value: "playful", label: "Eğlenceli & Yaratıcı" },
];

const FONT_OPTIONS = [
  "Inter", "Outfit", "Roboto", "Poppins", "Montserrat", "Lato",
  "Nunito", "Open Sans", "Playfair Display", "DM Sans",
];

const DEFAULT_COLORS = ["#f4841e", "#1a1a2e", "#ffffff", "#22c55e", "#3b82f6"];

const DISCOVERY_STEPS = [
  { icon: "🌐", text: "Website taranıyor…" },
  { icon: "🎨", text: "Renkler ve fontlar çıkarılıyor…" },
  { icon: "🎤", text: "Marka tonu analiz ediliyor…" },
  { icon: "📝", text: "Şirket hikayesi oluşturuluyor…" },
  { icon: "✨", text: "Marka kimliği tamamlanıyor…" },
];

export default function BrandPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  // Discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState(0);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);

  const { data, isLoading } = useQuery<BrandData>({
    queryKey: ["brand-profile"],
    queryFn: () => fetch("/api/brand-profile").then((r) => r.json()),
  });

  const [form, setForm] = useState({
    companyStory: "",
    industry: "",
    websiteUrl: "",
    toneAnchor: "",
    brandValues: "",
    designSpec: "",
    brandColors: "[]",
    brandFonts: "[]",
    logoUrl: "",
    newsFilters: "",
    competitorUrls: "",
  });

  const [colors, setColors] = useState<string[]>(["#f4841e", "#1a1a2e", "#ffffff"]);
  const [selectedFonts, setSelectedFonts] = useState<string[]>(["Inter"]);
  const [newColor, setNewColor] = useState("#f4841e");

  useEffect(() => {
    if (data?.brand) {
      setForm({
        companyStory: data.brand.companyStory || "",
        industry: data.brand.industry || "",
        websiteUrl: data.brand.websiteUrl || "",
        toneAnchor: data.brand.toneAnchor || "",
        brandValues: data.brand.brandValues || "",
        designSpec: data.brand.designSpec || "",
        brandColors: data.brand.brandColors || "[]",
        brandFonts: data.brand.brandFonts || "[]",
        logoUrl: data.brand.logoUrl || "",
        newsFilters: data.brand.newsFilters || "",
        competitorUrls: data.brand.competitorUrls || "",
      });
      try {
        const parsedColors = JSON.parse(data.brand.brandColors || "[]");
        if (parsedColors.length > 0) setColors(parsedColors);
      } catch {}
      try {
        const parsedFonts = JSON.parse(data.brand.brandFonts || "[]");
        if (parsedFonts.length > 0) setSelectedFonts(parsedFonts);
      } catch {}
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: typeof form) =>
      fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("Kaydetme başarısız");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
      setToast("✅ Marka profili kaydedildi!");
      setTimeout(() => setToast(null), 3000);
    },
    onError: () => {
      setToast("❌ Bir hata oluştu.");
      setTimeout(() => setToast(null), 3000);
    },
  });

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addColor = () => {
    if (colors.length < 6 && !colors.includes(newColor)) {
      setColors([...colors, newColor]);
    }
  };

  const removeColor = (color: string) => {
    setColors(colors.filter((c) => c !== color));
  };

  const toggleFont = (font: string) => {
    if (selectedFonts.includes(font)) {
      setSelectedFonts(selectedFonts.filter((f) => f !== font));
    } else if (selectedFonts.length < 3) {
      setSelectedFonts([...selectedFonts, font]);
    }
  };

  const handleSave = () => {
    mutation.mutate({
      ...form,
      brandColors: JSON.stringify(colors),
      brandFonts: JSON.stringify(selectedFonts),
    });
  };

  // --- AI BRAND DISCOVERY ---
  const discoverBrand = async () => {
    const url = form.websiteUrl.trim();
    if (!url) {
      setToast("❌ Lütfen önce bir web sitesi URL'si girin");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setDiscovering(true);
    setDiscoveryStep(0);
    setDiscoveryResult(null);

    // Step animation
    const stepInterval = setInterval(() => {
      setDiscoveryStep((prev) => {
        if (prev < DISCOVERY_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 3000);

    try {
      const res = await fetch("/api/brand-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Keşif başarısız");

      const discovery: DiscoveryResult = data.discovery;
      setDiscoveryResult(discovery);

      // Auto-fill form with discovered data
      if (discovery.companyStory) update("companyStory", discovery.companyStory);
      if (discovery.industry) update("industry", discovery.industry);
      if (discovery.toneAnchor) update("toneAnchor", discovery.toneAnchor);
      if (discovery.brandValues) update("brandValues", discovery.brandValues);
      if (discovery.designStyle) update("designSpec", discovery.designStyle);

      // Update colors
      if (discovery.brandColors && discovery.brandColors.length > 0) {
        setColors(discovery.brandColors.slice(0, 6));
      }

      // Update fonts — match discovered fonts to available options, or add custom
      if (discovery.brandFonts && discovery.brandFonts.length > 0) {
        const matchedFonts = discovery.brandFonts
          .map((f: string) => {
            // Try exact match first
            const exact = FONT_OPTIONS.find((opt) => opt.toLowerCase() === f.toLowerCase());
            if (exact) return exact;
            // Try partial match
            const partial = FONT_OPTIONS.find((opt) =>
              f.toLowerCase().includes(opt.toLowerCase()) ||
              opt.toLowerCase().includes(f.toLowerCase())
            );
            return partial || f;
          })
          .slice(0, 3);
        setSelectedFonts(matchedFonts);
      }

      setToast("✅ Marka kimliği başarıyla keşfedildi! Sonuçları inceleyin ve kaydedin.");
      setTimeout(() => setToast(null), 5000);
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      clearInterval(stepInterval);
      setDiscovering(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <p style={{ color: "var(--text-secondary)" }}>Marka profili yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!data?.brand) {
    return (
      <div className="glass" style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎨</div>
        <h3 style={{ marginBottom: "8px" }}>Marka profili bulunamadı</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Lütfen önce onboarding adımını tamamlayın.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
          background: toast.includes("✅") ? "rgba(52,211,153,0.9)" : "rgba(239,68,68,0.9)",
          color: "#fff", padding: "12px 24px", borderRadius: "50px",
          fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Marka Profili</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          {data.tenantName} · {data.plan} Plan
        </p>
      </div>

      {/* AI Brand Discovery Banner */}
      <div className="glass fade-up" style={{
        padding: "1.25rem 1.5rem", marginBottom: "1.5rem",
        background: "linear-gradient(135deg, rgba(129,140,248,0.08), rgba(244,132,30,0.08))",
        borderTop: "3px solid #818cf8",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <span style={{ fontSize: "1.3rem" }}>🧠</span>
          <div>
            <h3 style={{ fontSize: "0.95rem", margin: 0, color: "#818cf8" }}>
              AI Marka Keşfi
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
              Web sitenizi girin, AI marka kimliğinizi otomatik analiz etsin
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...labelStyle, marginBottom: "4px" }}>Web Sitesi URL</label>
            <input
              className="input-field"
              placeholder="https://example.com"
              value={form.websiteUrl}
              onChange={(e) => update("websiteUrl", e.target.value)}
              disabled={discovering}
              style={{ marginBottom: 0 }}
            />
          </div>
          <button
            onClick={discoverBrand}
            disabled={discovering || !form.websiteUrl.trim()}
            style={{
              background: discovering
                ? "rgba(129,140,248,0.1)"
                : "linear-gradient(135deg, #818cf8, #6366f1)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              color: "#fff",
              cursor: discovering ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "Inter",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              opacity: !form.websiteUrl.trim() ? 0.5 : 1,
              minHeight: "42px",
            }}
          >
            {discovering ? "🧠 Analiz ediliyor…" : "🔍 Markayı Keşfet"}
          </button>
        </div>

        {/* Discovery progress */}
        {discovering && (
          <div style={{ marginTop: "14px" }}>
            <div style={{
              display: "flex", gap: "6px", marginBottom: "8px",
              overflowX: "auto", paddingBottom: "4px",
            }}>
              {DISCOVERY_STEPS.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 12px", borderRadius: "20px",
                    background: i <= discoveryStep
                      ? "rgba(129,140,248,0.15)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i <= discoveryStep ? "rgba(129,140,248,0.3)" : "var(--border)"}`,
                    transition: "all 0.5s ease",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    fontSize: "0.8rem",
                    opacity: i <= discoveryStep ? 1 : 0.3,
                    transition: "opacity 0.5s",
                  }}>
                    {i < discoveryStep ? "✅" : step.icon}
                  </span>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: i === discoveryStep ? 700 : 500,
                    color: i <= discoveryStep ? "#818cf8" : "var(--text-secondary)",
                    transition: "all 0.5s",
                  }}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{
              height: "4px", borderRadius: "2px",
              background: "rgba(255,255,255,0.06)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                background: "linear-gradient(135deg, #818cf8, var(--orange))",
                width: `${((discoveryStep + 1) / DISCOVERY_STEPS.length) * 100}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        )}

        {/* Discovery result summary */}
        {discoveryResult && !discovering && (
          <div style={{
            marginTop: "14px", padding: "12px 14px", borderRadius: "10px",
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.9rem" }}>✨</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399" }}>
                Marka Kimliği Keşfedildi
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.75rem" }}>
              {/* Discovered colors preview */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Renkler:</span>
                {discoveryResult.brandColors.map((c, i) => (
                  <div key={i} style={{
                    width: "18px", height: "18px", borderRadius: "4px",
                    background: c, border: "1px solid rgba(255,255,255,0.15)",
                  }} />
                ))}
              </div>

              {/* Discovered fonts */}
              <div style={{ color: "var(--text-secondary)" }}>
                Fontlar: <span style={{ color: "#818cf8", fontWeight: 600 }}>
                  {discoveryResult.brandFonts.join(", ")}
                </span>
              </div>

              {/* Tone */}
              <div style={{ color: "var(--text-secondary)" }}>
                Ton: <span style={{ color: "var(--orange)", fontWeight: 600 }}>
                  {TONE_OPTIONS.find((t) => t.value === discoveryResult!.toneAnchor)?.label || discoveryResult.toneAnchor}
                </span>
              </div>
            </div>

            {/* Design style note */}
            {discoveryResult.designStyle && (
              <p style={{
                fontSize: "0.75rem", color: "var(--text-secondary)",
                fontStyle: "italic", margin: "8px 0 0",
              }}>
                🎨 {discoveryResult.designStyle}
              </p>
            )}

            <p style={{
              fontSize: "0.72rem", color: "var(--text-secondary)",
              margin: "8px 0 0",
            }}>
              ⬇️ Aşağıdaki form alanları otomatik dolduruldu. İnceleyin, düzenleyin ve kaydedin.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass fade-up fade-up-delay-1" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              🏢 Şirket Bilgileri
            </h3>
            <label style={labelStyle}>Şirket Hikayesi & Misyon</label>
            <textarea
              className="input-field" rows={4}
              placeholder="Biz kimiz, ne yapıyoruz, neden farklıyız?"
              value={form.companyStory}
              onChange={(e) => update("companyStory", e.target.value)}
              style={{ resize: "vertical", marginBottom: "14px" }}
            />
            <label style={labelStyle}>Sektör</label>
            <input className="input-field" placeholder="Hayvancılık & Tarım"
              value={form.industry} onChange={(e) => update("industry", e.target.value)}
              style={{ marginBottom: "14px" }}
            />
            <label style={labelStyle}>Marka Değerleri</label>
            <input className="input-field" placeholder="Kalite, Güven, İnovasyon…"
              value={form.brandValues} onChange={(e) => update("brandValues", e.target.value)}
            />
          </div>

          {/* Brand Colors */}
          <div className="glass fade-up fade-up-delay-2" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              🎨 Marka Renkleri
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              {colors.map((color) => (
                <div key={color} style={{ position: "relative", cursor: "pointer" }}
                  onClick={() => removeColor(color)}
                  title="Kaldırmak için tıkla"
                >
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "10px",
                    background: color, border: "2px solid rgba(255,255,255,0.15)",
                    transition: "transform 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }} />
                  <span style={{
                    position: "absolute", top: "-4px", right: "-4px",
                    background: "rgba(239,68,68,0.9)", color: "#fff",
                    width: "16px", height: "16px", borderRadius: "50%",
                    fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700,
                  }}>✕</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", textAlign: "center", display: "block", marginTop: "2px" }}>
                    {color}
                  </span>
                </div>
              ))}
              {colors.length < 6 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="color" value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: "44px", height: "44px", borderRadius: "10px",
                      border: "2px dashed rgba(255,255,255,0.2)", cursor: "pointer",
                      background: "transparent", padding: "2px",
                    }}
                  />
                  <button onClick={addColor}
                    style={{
                      background: "rgba(244,132,30,0.12)", border: "1px solid rgba(244,132,30,0.3)",
                      borderRadius: "8px", padding: "8px 12px", color: "var(--orange)",
                      cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "Inter",
                    }}
                  >+ Ekle</button>
                </div>
              )}
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>
              AI bu renkleri tasarım brieflerinde ve görsel üretiminde kullanacak. Max 6.
            </p>
          </div>

          {/* Competitor */}
          <div className="glass fade-up fade-up-delay-3" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              🔍 Rakip Analizi
            </h3>
            <label style={labelStyle}>Rakip Web Siteleri (virgülle ayırın)</label>
            <textarea className="input-field" rows={3}
              placeholder="https://rakip1.com, https://rakip2.com"
              value={form.competitorUrls}
              onChange={(e) => update("competitorUrls", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass fade-up fade-up-delay-1" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              🎤 Marka Sesi & Ton
            </h3>
            <label style={labelStyle}>İletişim Tonu</label>
            <select className="input-field" value={form.toneAnchor}
              onChange={(e) => update("toneAnchor", e.target.value)}
              style={{ appearance: "none", cursor: "pointer", marginBottom: "14px" }}
            >
              <option value="" disabled>Ton seçin…</option>
              {TONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {/* Design style - new field */}
            <label style={labelStyle}>Tasarım Stili</label>
            <textarea className="input-field" rows={2}
              placeholder="AI tarafından keşfedilen tasarım stili açıklaması…"
              value={form.designSpec}
              onChange={(e) => update("designSpec", e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Fonts */}
          <div className="glass fade-up fade-up-delay-2" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              🔤 Tipografi
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
              Max 3 font seçin. AI tasarım brieflerinde bu fontları önerecek.
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {FONT_OPTIONS.map((font) => {
                const isSelected = selectedFonts.includes(font);
                return (
                  <button
                    key={font}
                    onClick={() => toggleFont(font)}
                    style={{
                      background: isSelected ? "rgba(244,132,30,0.15)" : "rgba(255,255,255,0.04)",
                      border: isSelected ? "1px solid var(--orange)" : "1px solid var(--border)",
                      borderRadius: "8px", padding: "6px 12px",
                      color: isSelected ? "var(--orange)" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                      fontFamily: font + ", sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {font} {isSelected ? "✓" : ""}
                  </button>
                );
              })}
              {/* Show custom discovered fonts not in FONT_OPTIONS */}
              {selectedFonts
                .filter((f) => !FONT_OPTIONS.includes(f))
                .map((font) => (
                  <button
                    key={font}
                    onClick={() => setSelectedFonts(selectedFonts.filter((f) => f !== font))}
                    style={{
                      background: "rgba(129,140,248,0.15)",
                      border: "1px solid rgba(129,140,248,0.3)",
                      borderRadius: "8px", padding: "6px 12px",
                      color: "#818cf8",
                      cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                      fontFamily: font + ", sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {font} ✓ (keşfedilen)
                  </button>
                ))}
            </div>
          </div>

          {/* Content engine config */}
          <div className="glass fade-up fade-up-delay-3" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
              ⚙️ İçerik Motoru Ayarları
            </h3>
            <label style={labelStyle}>Haber Filtreleri (takip edilecek konular)</label>
            <input className="input-field" placeholder="Canlı hayvan ithalatı, AB tarım, gümrük"
              value={form.newsFilters} onChange={(e) => update("newsFilters", e.target.value)}
              style={{ marginBottom: "14px" }}
            />
            <label style={labelStyle}>Logo URL (opsiyonel)</label>
            <input className="input-field" placeholder="https://example.com/logo.png"
              value={form.logoUrl} onChange={(e) => update("logoUrl", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Color preview strip */}
      {colors.length > 0 && (
        <div className="glass fade-up fade-up-delay-3" style={{ padding: "14px 18px", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Marka Paleti Önizleme:
            </span>
            <div style={{ display: "flex", flex: 1, height: "28px", borderRadius: "8px", overflow: "hidden" }}>
              {colors.map((c) => (
                <div key={c} style={{ flex: 1, background: c }} />
              ))}
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {selectedFonts.join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="fade-up fade-up-delay-3" style={{ marginTop: "1.5rem" }}>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={mutation.isPending}
          style={{ width: "100%", padding: "14px", fontSize: "0.95rem" }}
        >
          {mutation.isPending ? "Kaydediliyor…" : "💾 Marka Profilini Kaydet"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 600,
  marginBottom: "6px",
  color: "var(--text-secondary)",
};
