"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  targetAudience: string | null;
  platforms: string[];
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
  totalJobs: number;
  approvedJobs: number;
  createdAt: string;
}

const PLATFORM_OPTIONS = [
  { value: "IG", label: "Instagram", icon: "📸" },
  { value: "LinkedIn", label: "LinkedIn", icon: "💼" },
  { value: "TikTok", label: "TikTok", icon: "🎵" },
  { value: "X", label: "X / Twitter", icon: "𝕏" },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Taslak", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  GENERATING: { label: "Üretiliyor…", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  ACTIVE: { label: "Aktif", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  COMPLETED: { label: "Tamamlandı", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formObjective, setFormObjective] = useState("");
  const [formAudience, setFormAudience] = useState("");
  const [formPlatforms, setFormPlatforms] = useState<string[]>(["IG", "LinkedIn"]);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState("");

  useEffect(() => {
    fetchCampaigns();
    // Set default dates
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);
    setFormStartDate(today.toISOString().split("T")[0]);
    setFormEndDate(twoWeeksLater.toISOString().split("T")[0]);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch (e) {
      console.error("Failed to fetch campaigns:", e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (val: string) => {
    setFormPlatforms((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formObjective.trim()) {
      setToast("❌ Kampanya adı ve hedef zorunludur");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          objective: formObjective,
          targetAudience: formAudience || null,
          platforms: formPlatforms,
          startDate: formStartDate,
          endDate: formEndDate,
          budget: formBudget || null,
        }),
      });

      if (!res.ok) throw new Error("Oluşturma başarısız");

      setToast("✅ Kampanya oluşturuldu!");
      setTimeout(() => setToast(null), 3000);
      setShowForm(false);
      setFormName("");
      setFormObjective("");
      setFormAudience("");
      setFormBudget("");
      await fetchCampaigns();
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getDurationDays = (start: string, end: string) => {
    return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎯</div>
          <p style={{ color: "var(--text-secondary)" }}>Yükleniyor…</p>
        </div>
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
      <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "2px" }}>Kampanyalar</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            {campaigns.length} kampanya · Operasyonel reklam planlama
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ fontSize: "0.85rem", padding: "10px 20px" }}
        >
          {showForm ? "✕ Kapat" : "➕ Yeni Kampanya"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass fade-up" style={{
          padding: "1.5rem", marginBottom: "1.5rem",
          borderTop: "3px solid var(--orange)",
        }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "var(--orange)" }}>
            🎯 Yeni Kampanya Oluştur
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Kampanya Adı *</label>
              <input
                className="input-field"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder='örn. "AWR300 Lansman Kampanyası"'
              />
            </div>

            {/* Objective */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Hedef *</label>
              <textarea
                className="input-field"
                value={formObjective}
                onChange={(e) => setFormObjective(e.target.value)}
                placeholder='örn. "Yeni RFID okuyucunun tanıtımı, demo talepleri toplama"'
                style={{ minHeight: "70px", resize: "vertical" }}
              />
            </div>

            {/* Target Audience */}
            <div>
              <label style={labelStyle}>Hedef Kitle</label>
              <input
                className="input-field"
                value={formAudience}
                onChange={(e) => setFormAudience(e.target.value)}
                placeholder='örn. "Büyükbaş çiftlik sahipleri, 35-55 yaş"'
              />
            </div>

            {/* Budget */}
            <div>
              <label style={labelStyle}>Bütçe (TL)</label>
              <input
                className="input-field"
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="Opsiyonel — örn. 5000"
              />
            </div>

            {/* Date Range */}
            <div>
              <label style={labelStyle}>Başlangıç Tarihi *</label>
              <input
                className="input-field"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Bitiş Tarihi *</label>
              <input
                className="input-field"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>

            {/* Platforms */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Platformlar</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PLATFORM_OPTIONS.map((p) => {
                  const selected = formPlatforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => togglePlatform(p.value)}
                      style={{
                        background: selected ? "rgba(244,132,30,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${selected ? "var(--orange)" : "var(--border)"}`,
                        borderRadius: "10px",
                        padding: "8px 16px",
                        color: selected ? "var(--orange)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        fontWeight: selected ? 700 : 500,
                        fontFamily: "Inter",
                        transition: "all 0.2s",
                      }}
                    >
                      {p.icon} {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.2rem", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: "10px", padding: "10px 20px",
                color: "var(--text-secondary)", cursor: "pointer",
                fontFamily: "Inter", fontSize: "0.85rem",
              }}
            >
              İptal
            </button>
            <button
              className="btn-primary"
              onClick={handleCreate}
              disabled={saving}
              style={{ fontSize: "0.85rem", padding: "10px 24px" }}
            >
              {saving ? "Oluşturuluyor…" : "🚀 Kampanya Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="glass fade-up" style={{
          padding: "3rem", textAlign: "center", color: "var(--text-secondary)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎯</div>
          <h3 style={{ marginBottom: "8px", fontSize: "1.1rem", color: "var(--text-primary)" }}>Henüz kampanya yok</h3>
          <p style={{ fontSize: "0.85rem" }}>
            Bir ürün lansmanı, sektör etkinliği veya sezonsal teklif için kampanya oluşturun.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1rem" }}>
          {campaigns.map((c) => {
            const statusMeta = STATUS_META[c.status] || STATUS_META.DRAFT;
            const duration = getDurationDays(c.startDate, c.endDate);
            const progress = c.totalJobs > 0 ? Math.round((c.approvedJobs / c.totalJobs) * 100) : 0;

            return (
              <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  className="glass"
                  style={{
                    padding: "1.25rem",
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    borderLeft: "3px solid var(--orange)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Top badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{
                      fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
                      background: statusMeta.bg, color: statusMeta.color, textTransform: "uppercase",
                    }}>
                      {statusMeta.label}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      {duration} gün
                    </span>
                  </div>

                  {/* Name & objective */}
                  <h3 style={{ fontSize: "1.05rem", marginBottom: "4px", lineHeight: 1.3 }}>
                    {c.name}
                  </h3>
                  <p style={{
                    fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "12px",
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                  }}>
                    {c.objective}
                  </p>

                  {/* Platform icons */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {c.platforms.map((p) => {
                      const opt = PLATFORM_OPTIONS.find((o) => o.value === p);
                      return (
                        <span key={p} style={{
                          fontSize: "0.68rem", fontWeight: 600, padding: "2px 8px",
                          borderRadius: "6px", background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border)",
                        }}>
                          {opt?.icon || "📱"} {p}
                        </span>
                      );
                    })}
                  </div>

                  {/* Date range */}
                  <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                    📅 {new Date(c.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    {" — "}
                    {new Date(c.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    {c.budget && <span style={{ marginLeft: "12px" }}>💰 {c.budget.toLocaleString("tr-TR")} ₺</span>}
                  </div>

                  {/* Progress bar */}
                  {c.totalJobs > 0 && (
                    <div>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px",
                      }}>
                        <span>{c.approvedJobs}/{c.totalJobs} içerik onaylı</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{
                        height: "4px", borderRadius: "2px",
                        background: "rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%", borderRadius: "2px",
                          background: "linear-gradient(135deg, var(--orange), #e06b0c)",
                          width: `${progress}%`,
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
