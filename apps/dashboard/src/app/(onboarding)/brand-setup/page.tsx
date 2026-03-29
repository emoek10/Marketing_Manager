"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, title: "Marka Adı" },
  { id: 2, title: "Sektör & Web Sitesi" },
  { id: 3, title: "Marka Kimliği" },
  { id: 4, title: "Rakipler" },
];

export default function BrandSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tenantName: "",
    industry: "",
    websiteUrl: "",
    companyStory: "",
    brandValues: "",
    toneAnchor: "",
    competitorUrls: "",
  });

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Bir hata oluştu.");
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      {/* Background orb */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(244,132,30,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="glass fade-up" style={{ width: "100%", maxWidth: "520px", padding: "2.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #f4841e, #e06b0c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}
            >
              🚀
            </div>
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>
              Agency OS
            </span>
          </div>

          <h1 style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>
            Markanızı Kuralım
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Dijital pazarlama asistanınız hazır. Birkaç adımda kuruluma başlayalım.
          </p>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "2rem" }}>
          {STEPS.map((s) => (
            <div key={s.id} className={`step-dot ${step >= s.id ? "active" : ""}`} />
          ))}
        </div>

        {/* Step label */}
        <p style={{ color: "var(--orange)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2rem" }}>
          Adım {step} / {STEPS.length} — {STEPS[step - 1].title}
        </p>

        {/* Step content */}
        {step === 1 && (
          <div className="fade-up">
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
              Şirket / Marka Adı
            </label>
            <input
              className="input-field"
              placeholder="Örn: Ayvet Global"
              value={form.tenantName}
              onChange={(e) => update("tenantName", e.target.value)}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "8px" }}>
              Bu ad, içerik takvimleriniz ve raporlarınızda görünecek.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>Sektör</label>
              <select
                className="input-field"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                style={{ appearance: "none", cursor: "pointer" }}
              >
                <option value="" disabled>Sektörünüzü seçin…</option>
                <option>Hayvancılık & Tarım</option>
                <option>Teknoloji & SaaS</option>
                <option>Sağlık & Wellness</option>
                <option>E-Ticaret & Perakende</option>
                <option>Finans & Yatırım</option>
                <option>Eğitim & EdTech</option>
                <option>Gıda & İçecek</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>Web Sitesi URL</label>
              <input
                className="input-field"
                placeholder="https://ayvetglobal.com"
                value={form.websiteUrl}
                onChange={(e) => update("websiteUrl", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>Şirket Hikayesi & Misyon</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Biz kimiz, ne yapıyoruz, neden farklıyız?"
                value={form.companyStory}
                onChange={(e) => update("companyStory", e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>İletişim Tonu (Tone of Voice)</label>
              <select
                className="input-field"
                value={form.toneAnchor}
                onChange={(e) => update("toneAnchor", e.target.value)}
                style={{ appearance: "none", cursor: "pointer" }}
              >
                <option value="" disabled>Ton seçin…</option>
                <option value="professional">Kurumsal & Güvenilir</option>
                <option value="friendly">Samimi & Yakın</option>
                <option value="bold">Cesur & Otoriter</option>
                <option value="educational">Eğitici & Bilgilendirici</option>
                <option value="playful">Eğlenceli & Yaratıcı</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>Marka Değerleri</label>
              <input
                className="input-field"
                placeholder="Kalite, Güven, İnovasyon…"
                value={form.brandValues}
                onChange={(e) => update("brandValues", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-up">
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
              Rakip Web Siteleri <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(opsiyonel)</span>
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="https://rakip1.com, https://rakip2.com"
              value={form.competitorUrls}
              onChange={(e) => update("competitorUrls", e.target.value)}
              style={{ resize: "vertical" }}
            />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "8px" }}>
              Virgül ile ayırın. Sistem rakiplerinizi analiz ederek size özel içerik fırsatları üretecek.
            </p>

            {error && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "10px",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444", fontSize: "0.85rem",
              }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
          <button
            onClick={back}
            disabled={step === 1}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "11px 22px",
              color: step === 1 ? "var(--text-secondary)" : "var(--text-primary)",
              cursor: step === 1 ? "default" : "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
              transition: "border-color 0.2s",
            }}
          >
            ← Geri
          </button>

          {step < STEPS.length ? (
            <button
              className="btn-primary"
              onClick={next}
              disabled={
                (step === 1 && !form.tenantName.trim()) ||
                (step === 2 && !form.industry)
              }
            >
              Devam →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Oluşturuluyor…" : "🚀 Kurulumu Tamamla"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
