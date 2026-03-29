"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface ContentJob {
  id: string;
  topicId: string;
  strategy: string;
  status: string;
  contentType: string;
  funnelStage: string;
  contextPlatform: string;
  scheduledFor: string | null;
  createdAt: string;
  bundle: {
    id: string;
    reelsScript: string;
    caption_ig: string;
    thread_x: string;
    post_li: string;
    syntheticScore: number | null;
    storySequence: { designPrompt?: string; scheduledHour?: number; campaignPhase?: string } | null;
    videoUrl: string | null;
  } | null;
}

interface CampaignDetail {
  id: string;
  name: string;
  objective: string;
  targetAudience: string | null;
  platforms: string[];
  startDate: string;
  endDate: string;
  budget: number | null;
  status: string;
  createdAt: string;
  contentJobs: ContentJob[];
}

const PLATFORM_META: Record<string, { icon: string; color: string; bg: string }> = {
  IG: { icon: "📸", color: "#e1306c", bg: "rgba(225,48,108,0.12)" },
  TikTok: { icon: "🎵", color: "#69c9d0", bg: "rgba(105,201,208,0.12)" },
  LinkedIn: { icon: "💼", color: "#0077b5", bg: "rgba(0,119,181,0.12)" },
  X: { icon: "𝕏", color: "#a0aec0", bg: "rgba(160,174,192,0.12)" },
};

const PHASE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  TEASER: { label: "Teaser", color: "#818cf8", bg: "rgba(129,140,248,0.12)", icon: "👀" },
  LAUNCH: { label: "Lansman", color: "#f4841e", bg: "rgba(244,132,30,0.12)", icon: "🚀" },
  CONVERSION: { label: "Dönüşüm", color: "#34d399", bg: "rgba(52,211,153,0.12)", icon: "💰" },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEEDS_REVIEW: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  APPROVED: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  REJECTED: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  COMPLETED: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
};

const CONTENT_ICONS: Record<string, string> = {
  REELS: "🎬", STATIC_IMAGE: "🖼️", CAROUSEL: "📑", TEXT_ONLY: "✍️",
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ContentJob | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Visual generation state
  const [generatingVisualId, setGeneratingVisualId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const bulkAbortRef = useRef(false);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => { fetchCampaign(); }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      setCampaign(data);
    } catch (e) {
      console.error("Failed to fetch campaign:", e);
    } finally { setLoading(false); }
  };

  const generateStrategy = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast(`✅ ${data.count} içerik oluşturuldu!`);
      setTimeout(() => setToast(null), 4000);
      await fetchCampaign();
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally { setGenerating(false); }
  };

  const updateStatus = async (jobId: string, status: string) => {
    setActionLoading(jobId);
    try {
      await fetch("/api/content-jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });
      await fetchCampaign();
      setSelectedJob(null);
    } finally { setActionLoading(null); }
  };

  // --- VISUAL GENERATION ---
  const generateVisual = async (jobId: string) => {
    setGeneratingVisualId(jobId);
    try {
      const res = await fetch(`/api/content-jobs/${jobId}/generate-visual`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Görsel üretilemedi");
      setToast("✅ Görsel başarıyla üretildi!");
      setTimeout(() => setToast(null), 3000);
      await fetchCampaign();
      // Update selectedJob if open
      if (selectedJob?.id === jobId) {
        const updated = campaign?.contentJobs.find((j) => j.id === jobId);
        if (updated) setSelectedJob({ ...updated, bundle: { ...updated.bundle!, videoUrl: data.imageUrl } });
      }
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setGeneratingVisualId(null);
    }
  };

  const generateAllVisuals = async () => {
    if (!campaign) return;
    const jobsWithBrief = campaign.contentJobs.filter(
      (j) => j.bundle?.storySequence?.designPrompt && !j.bundle?.videoUrl
    );
    if (jobsWithBrief.length === 0) {
      setToast("⚠️ Tasarım brief'i olan yeni içerik yok");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setBulkGenerating(true);
    bulkAbortRef.current = false;
    setBulkProgress({ current: 0, total: jobsWithBrief.length });

    for (let i = 0; i < jobsWithBrief.length; i++) {
      if (bulkAbortRef.current) break;
      const job = jobsWithBrief[i];
      setBulkProgress({ current: i + 1, total: jobsWithBrief.length });
      setGeneratingVisualId(job.id);

      try {
        const res = await fetch(`/api/content-jobs/${job.id}/generate-visual`, {
          method: "POST",
        });
        if (!res.ok) {
          const err = await res.json();
          console.error(`Visual gen failed for ${job.id}:`, err.error);
        }
      } catch (e) {
        console.error(`Visual gen error for ${job.id}:`, e);
      }
    }

    setGeneratingVisualId(null);
    setBulkGenerating(false);
    setBulkProgress({ current: 0, total: 0 });
    setToast(`✅ Toplu görsel üretimi tamamlandı!`);
    setTimeout(() => setToast(null), 4000);
    await fetchCampaign();
  };

  const cancelBulkGeneration = () => {
    bulkAbortRef.current = true;
    setToast("⏹️ Toplu üretim iptal ediliyor…");
    setTimeout(() => setToast(null), 3000);
  };

  const topicToTitle = (topicId: string) => {
    const parts = topicId.split("|");
    return parts.length > 1 ? parts[1] : parts[0];
  };

  const getMainText = (job: ContentJob): string => {
    if (!job.bundle) return "";
    return job.bundle.reelsScript || job.bundle.caption_ig || job.bundle.post_li || job.bundle.thread_x || "";
  };

  const getHour = (job: ContentJob): number => {
    if (job.bundle?.storySequence?.scheduledHour) return job.bundle.storySequence.scheduledHour;
    if (job.scheduledFor) return new Date(job.scheduledFor).getHours();
    return 12;
  };

  const hasDesignBrief = (job: ContentJob): boolean => {
    return !!job.bundle?.storySequence?.designPrompt;
  };

  const visualCount = campaign?.contentJobs.filter((j) => j.bundle?.videoUrl).length || 0;
  const briefCount = campaign?.contentJobs.filter((j) => hasDesignBrief(j)).length || 0;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎯</div>
          <p style={{ color: "var(--text-secondary)" }}>Kampanya yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--text-secondary)" }}>Kampanya bulunamadı.</p>
        <Link href="/dashboard/campaigns" style={{ color: "var(--orange)", marginTop: "12px", display: "inline-block" }}>
          ← Kampanyalara Dön
        </Link>
      </div>
    );
  }

  const totalJobs = campaign.contentJobs.length;
  const approvedJobs = campaign.contentJobs.filter((j) => j.status === "APPROVED" || j.status === "COMPLETED").length;
  const progress = totalJobs > 0 ? Math.round((approvedJobs / totalJobs) * 100) : 0;

  // Group jobs by phase
  const jobsByPhase: Record<string, ContentJob[]> = { TEASER: [], LAUNCH: [], CONVERSION: [], OTHER: [] };
  campaign.contentJobs.forEach((job) => {
    const phase = job.bundle?.storySequence?.campaignPhase || "OTHER";
    if (jobsByPhase[phase]) {
      jobsByPhase[phase].push(job);
    } else {
      jobsByPhase.OTHER.push(job);
    }
  });

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
          background: toast.includes("✅") ? "rgba(52,211,153,0.9)" : toast.includes("⚠️") ? "rgba(251,191,36,0.9)" : "rgba(239,68,68,0.9)",
          color: "#fff", padding: "12px 24px", borderRadius: "50px",
          fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        }}>
          {toast}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 20000,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxUrl}
            alt="Görsel Önizleme"
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* Breadcrumb */}
      <div className="fade-up" style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard/campaigns" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.82rem" }}>
          ← Kampanyalar
        </Link>
      </div>

      {/* Campaign header */}
      <div className="glass fade-up" style={{
        padding: "1.5rem", marginBottom: "1.5rem",
        borderLeft: "4px solid var(--orange)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>{campaign.name}</h1>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
              {campaign.objective}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {/* Date range */}
              <span style={infoBadge}>
                📅 {new Date(campaign.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                {" — "}
                {new Date(campaign.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
              </span>

              {/* Target */}
              {campaign.targetAudience && (
                <span style={infoBadge}>🎯 {campaign.targetAudience}</span>
              )}

              {/* Budget */}
              {campaign.budget && (
                <span style={infoBadge}>💰 {campaign.budget.toLocaleString("tr-TR")} ₺</span>
              )}

              {/* Platforms */}
              {campaign.platforms.map((p) => {
                const plat = PLATFORM_META[p];
                return (
                  <span key={p} style={{ ...infoBadge, background: plat?.bg, color: plat?.color }}>
                    {plat?.icon} {p}
                  </span>
                );
              })}

              {/* Visual counter badge */}
              {totalJobs > 0 && (
                <span style={{
                  ...infoBadge,
                  background: visualCount > 0 ? "rgba(129,140,248,0.12)" : "rgba(255,255,255,0.06)",
                  color: visualCount > 0 ? "#818cf8" : "var(--text-secondary)",
                }}>
                  🖼️ {visualCount}/{briefCount} görsel üretildi
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={generateStrategy}
              disabled={generating || campaign.status === "GENERATING"}
              style={{ fontSize: "0.85rem", padding: "10px 20px" }}
            >
              {generating ? "🧠 Üretiliyor…" : totalJobs > 0 ? "🔄 Yeniden Üret" : "🧠 Strateji Üret"}
            </button>

            {/* Bulk visual generation button */}
            {totalJobs > 0 && briefCount > 0 && (
              bulkGenerating ? (
                <button
                  onClick={cancelBulkGeneration}
                  style={{
                    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "10px", padding: "10px 20px",
                    color: "#ef4444", cursor: "pointer", fontSize: "0.85rem",
                    fontFamily: "Inter", fontWeight: 600,
                  }}
                >
                  ⏹️ İptal ({bulkProgress.current}/{bulkProgress.total})
                </button>
              ) : (
                <button
                  onClick={generateAllVisuals}
                  style={{
                    background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(244,132,30,0.15))",
                    border: "1px solid rgba(129,140,248,0.3)",
                    borderRadius: "10px", padding: "10px 20px",
                    color: "#818cf8", cursor: "pointer", fontSize: "0.85rem",
                    fontFamily: "Inter", fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(129,140,248,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  🎨 Tüm Tasarımları Üret ({briefCount - visualCount} bekliyor)
                </button>
              )
            )}

            {totalJobs > 0 && (
              <div style={{ marginTop: "4px" }}>
                <div style={{
                  fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "4px",
                  textAlign: "right",
                }}>
                  {approvedJobs}/{totalJobs} onaylı ({progress}%)
                </div>
                <div style={{
                  height: "4px", borderRadius: "2px", width: "160px",
                  background: "rgba(255,255,255,0.06)", overflow: "hidden",
                  marginLeft: "auto",
                }}>
                  <div style={{
                    height: "100%", borderRadius: "2px",
                    background: "linear-gradient(135deg, var(--orange), #e06b0c)",
                    width: `${progress}%`, transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk generation progress banner */}
      {bulkGenerating && (
        <div className="fade-up" style={{
          background: "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(244,132,30,0.12))",
          border: "1px solid rgba(129,140,248,0.3)",
          borderRadius: "12px", padding: "14px 20px", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "1.4rem", animation: "pulse 2s infinite" }}>🎨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Görseller Üretiliyor…</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              {bulkProgress.current}/{bulkProgress.total} tamamlandı — Gemini AI ile premium tasarım üretiliyor
            </div>
            {/* Progress bar */}
            <div style={{
              marginTop: "8px", height: "6px", borderRadius: "3px",
              background: "rgba(255,255,255,0.06)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: "3px",
                background: "linear-gradient(135deg, #818cf8, var(--orange))",
                width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Generating strategy banner */}
      {(generating || campaign.status === "GENERATING") && !bulkGenerating && (
        <div className="fade-up" style={{
          background: "linear-gradient(135deg, rgba(244,132,30,0.12), rgba(129,140,248,0.12))",
          border: "1px solid rgba(244,132,30,0.3)",
          borderRadius: "12px", padding: "14px 20px", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "1.4rem", animation: "pulse 2s infinite" }}>🧠</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Kampanya Stratejisi Üretiliyor…</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              AI, kampanya hedefine göre aşamalı içerik planı hazırlıyor (Teaser → Lansman → Dönüşüm).
            </div>
          </div>
        </div>
      )}

      {/* Content by phase */}
      {totalJobs === 0 ? (
        <div className="glass fade-up" style={{
          padding: "3rem", textAlign: "center", color: "var(--text-secondary)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🧠</div>
          <h3 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>Henüz içerik üretilmedi</h3>
          <p style={{ fontSize: "0.85rem" }}>
            &quot;Strateji Üret&quot; butonuna basarak AI&apos;ın kampanyaya özel içerik planı oluşturmasını sağlayın.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {(["TEASER", "LAUNCH", "CONVERSION", "OTHER"] as const).map((phase) => {
            const phaseJobs = jobsByPhase[phase];
            if (phaseJobs.length === 0) return null;
            const meta = PHASE_META[phase] || { label: "Diğer", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "📄" };

            return (
              <div key={phase} className="fade-up">
                {/* Phase header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  marginBottom: "8px", paddingLeft: "4px",
                }}>
                  <span style={{ fontSize: "1.1rem" }}>{meta.icon}</span>
                  <span style={{
                    fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: meta.color,
                  }}>
                    {meta.label}
                  </span>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 600,
                    padding: "2px 8px", borderRadius: "10px",
                    background: meta.bg, color: meta.color,
                  }}>
                    {phaseJobs.length} içerik
                  </span>
                </div>

                {/* Phase content cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                  {phaseJobs.sort((a, b) => {
                    if (!a.scheduledFor || !b.scheduledFor) return 0;
                    return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
                  }).map((job) => {
                    const plat = PLATFORM_META[job.contextPlatform] || { icon: "📱", color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
                    const statusCol = STATUS_COLORS[job.status] || { bg: "rgba(255,255,255,0.06)", color: "#ccc" };
                    const isGeneratingThis = generatingVisualId === job.id;
                    const hasVisual = !!job.bundle?.videoUrl;

                    return (
                      <div
                        key={job.id}
                        className="glass"
                        onClick={() => setSelectedJob(job)}
                        style={{
                          padding: "12px 14px", cursor: "pointer",
                          borderLeft: `3px solid ${plat.color}`,
                          transition: "transform 0.15s, box-shadow 0.15s",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {/* Generating overlay */}
                        {isGeneratingThis && (
                          <div style={{
                            position: "absolute", inset: 0, zIndex: 2,
                            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "inherit",
                          }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "1.5rem", animation: "pulse 1.5s infinite" }}>🎨</div>
                              <div style={{ fontSize: "0.72rem", color: "#fff", fontWeight: 600, marginTop: "4px" }}>
                                Üretiliyor…
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: plat.color }}>
                              {plat.icon} {job.contextPlatform}
                            </span>
                            <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                              {CONTENT_ICONS[job.contentType]} {job.contentType}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            {hasVisual && (
                              <span style={{
                                fontSize: "0.58rem", fontWeight: 700,
                                padding: "2px 6px", borderRadius: "4px",
                                background: "rgba(129,140,248,0.15)", color: "#818cf8",
                              }}>
                                🖼️
                              </span>
                            )}
                            {job.scheduledFor && (
                              <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                                {new Date(job.scheduledFor).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                {" · "}
                                {String(getHour(job)).padStart(2, "0")}:00
                              </span>
                            )}
                            <span style={{
                              fontSize: "0.58rem", fontWeight: 700,
                              padding: "2px 6px", borderRadius: "4px",
                              background: statusCol.bg, color: statusCol.color,
                            }}>
                              {job.status === "NEEDS_REVIEW" ? "⏳" : job.status === "APPROVED" ? "✓" : "✕"}
                            </span>
                          </div>
                        </div>

                        {/* Content title + thumbnail row */}
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div style={{
                            flex: 1,
                            fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.3,
                            overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                          }}>
                            {topicToTitle(job.topicId)}
                          </div>

                          {/* Thumbnail */}
                          {hasVisual && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxUrl(job.bundle!.videoUrl!);
                              }}
                              style={{
                                width: "52px", height: "52px", borderRadius: "8px",
                                overflow: "hidden", flexShrink: 0,
                                border: "1px solid rgba(129,140,248,0.2)",
                                cursor: "zoom-in",
                                transition: "transform 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                            >
                              <img
                                src={job.bundle!.videoUrl!}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Quick generate button on card */}
                        {!hasVisual && hasDesignBrief(job) && !isGeneratingThis && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateVisual(job.id);
                            }}
                            style={{
                              marginTop: "8px", width: "100%",
                              background: "linear-gradient(135deg, rgba(129,140,248,0.08), rgba(244,132,30,0.08))",
                              border: "1px dashed rgba(129,140,248,0.25)",
                              borderRadius: "8px", padding: "6px",
                              color: "#818cf8", cursor: "pointer",
                              fontSize: "0.72rem", fontWeight: 600,
                              fontFamily: "Inter",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(244,132,30,0.15))";
                              e.currentTarget.style.borderStyle = "solid";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "linear-gradient(135deg, rgba(129,140,248,0.08), rgba(244,132,30,0.08))";
                              e.currentTarget.style.borderStyle = "dashed";
                            }}
                          >
                            🎨 Görsel Üret
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedJob && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)", borderRadius: "16px",
              border: "1px solid var(--border)",
              width: selectedJob.contentType === "CAROUSEL" ? "700px" : "540px",
              maxHeight: "85vh", overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "18px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>
                  {topicToTitle(selectedJob.topicId)}
                </h2>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(() => {
                    const plat = PLATFORM_META[selectedJob.contextPlatform] || { icon: "📱", color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
                    const phase = selectedJob.bundle?.storySequence?.campaignPhase;
                    const phaseMeta = phase ? PHASE_META[phase] : null;
                    return (
                      <>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: plat.bg, color: plat.color }}>
                          {plat.icon} {selectedJob.contextPlatform}
                        </span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(129,140,248,0.12)", color: "#818cf8" }}>
                          {CONTENT_ICONS[selectedJob.contentType]} {selectedJob.contentType}
                        </span>
                        {phaseMeta && (
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: phaseMeta.bg, color: phaseMeta.color }}>
                            {phaseMeta.icon} {phaseMeta.label}
                          </span>
                        )}
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(244,132,30,0.12)", color: "var(--orange)" }}>
                          {selectedJob.funnelStage} · {selectedJob.strategy}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setSelectedJob(null)} style={{
                background: "transparent", border: "none", color: "var(--text-secondary)",
                fontSize: "1.2rem", cursor: "pointer", padding: "4px",
              }}>✕</button>
            </div>

            {/* Generated visual preview in modal */}
            {selectedJob.bundle?.videoUrl && (
              <div style={{ padding: "14px 20px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>
                  🖼️ Üretilen Görsel
                </span>
                <div
                  onClick={() => setLightboxUrl(selectedJob.bundle!.videoUrl!)}
                  style={{
                    borderRadius: "10px", overflow: "hidden",
                    border: "1px solid rgba(129,140,248,0.2)",
                    cursor: "zoom-in",
                    transition: "transform 0.15s",
                    maxHeight: "300px",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.01)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <img
                    src={selectedJob.bundle.videoUrl}
                    alt="Üretilen görsel"
                    style={{ width: "100%", maxHeight: "300px", objectFit: "contain", display: "block" }}
                  />
                </div>
              </div>
            )}

            {/* Design brief */}
            {selectedJob.bundle?.storySequence?.designPrompt && (
              <div style={{
                margin: `${selectedJob.bundle?.videoUrl ? "0" : "14px"} 20px 0`, padding: "12px 14px", borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(244,132,30,0.06), rgba(129,140,248,0.06))",
                border: "1px solid rgba(244,132,30,0.15)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--orange)", textTransform: "uppercase" }}>
                    🎨 Tasarım Briefingi
                  </span>
                  {/* Generate visual button in modal */}
                  {!selectedJob.bundle?.videoUrl && (
                    <button
                      onClick={() => generateVisual(selectedJob.id)}
                      disabled={generatingVisualId === selectedJob.id}
                      style={{
                        background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(244,132,30,0.15))",
                        border: "1px solid rgba(129,140,248,0.3)",
                        borderRadius: "8px", padding: "5px 12px",
                        color: "#818cf8", cursor: "pointer",
                        fontSize: "0.72rem", fontWeight: 700,
                        fontFamily: "Inter",
                        transition: "all 0.2s",
                        opacity: generatingVisualId === selectedJob.id ? 0.6 : 1,
                      }}
                    >
                      {generatingVisualId === selectedJob.id ? "⏳ Üretiliyor…" : "🎨 Görsel Üret"}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: "0.82rem", lineHeight: 1.5, fontStyle: "italic", margin: "6px 0 0" }}>
                  {selectedJob.bundle.storySequence.designPrompt}
                </p>
              </div>
            )}

            {/* Content text */}
            {(() => {
              const text = getMainText(selectedJob);
              if (!text) return null;
              return (
                <div style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                    📝 İçerik Metni
                  </span>
                  <pre style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                    borderRadius: "8px", padding: "12px", fontSize: "0.82rem",
                    whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5,
                    color: "var(--text-primary)", fontFamily: "Inter, sans-serif",
                    maxHeight: "200px", overflow: "auto",
                  }}>
                    {text}
                  </pre>
                </div>
              );
            })()}

            {/* Actions */}
            {(selectedJob.status === "NEEDS_REVIEW" || selectedJob.status === "NEEDS_MANUAL_REVIEW") && (
              <div style={{
                display: "flex", gap: "10px", padding: "14px 20px",
                borderTop: "1px solid var(--border)",
              }}>
                <button className="btn-primary"
                  onClick={() => updateStatus(selectedJob.id, "APPROVED")}
                  disabled={actionLoading === selectedJob.id}
                  style={{ flex: 1, padding: "10px", fontSize: "0.85rem" }}
                >
                  {actionLoading === selectedJob.id ? "..." : "✅ Onayla"}
                </button>
                <button
                  onClick={() => updateStatus(selectedJob.id, "REJECTED")}
                  disabled={actionLoading === selectedJob.id}
                  style={{
                    flex: 1, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "10px", padding: "10px", color: "#ef4444",
                    cursor: "pointer", fontSize: "0.85rem", fontFamily: "Inter", fontWeight: 600,
                  }}
                >❌ Reddet</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const infoBadge: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
};
