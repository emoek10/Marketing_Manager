"use client";

import { useState, useEffect } from "react";

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
    storySequence: { designPrompt?: string; scheduledHour?: number } | null;
    videoUrl: string | null;
  } | null;
}

const PLATFORM_META: Record<string, { icon: string; color: string; bg: string }> = {
  IG: { icon: "📸", color: "#e1306c", bg: "rgba(225,48,108,0.12)" },
  Instagram: { icon: "📸", color: "#e1306c", bg: "rgba(225,48,108,0.12)" },
  TikTok: { icon: "🎵", color: "#69c9d0", bg: "rgba(105,201,208,0.12)" },
  LinkedIn: { icon: "💼", color: "#0077b5", bg: "rgba(0,119,181,0.12)" },
  X: { icon: "𝕏", color: "#a0aec0", bg: "rgba(160,174,192,0.12)" },
};

const CONTENT_ICONS: Record<string, string> = {
  REELS: "🎬", STATIC_IMAGE: "🖼️", CAROUSEL: "📑", TEXT_ONLY: "✍️",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  NEEDS_REVIEW: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  APPROVED: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  REJECTED: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  PROCESSING: { bg: "rgba(129,140,248,0.15)", color: "#818cf8" },
  COMPLETED: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  NEEDS_MANUAL_REVIEW: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DAY_NAMES_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function CalendarPage() {
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ContentJob | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [visualLoading, setVisualLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/content-jobs");
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally { setLoading(false); }
  };

  const updateStatus = async (jobId: string, status: string) => {
    setActionLoading(jobId);
    try {
      await fetch("/api/content-jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status }),
      });
      await fetchJobs();
      setSelectedJob(null);
    } finally { setActionLoading(null); }
  };

  const generateVisual = async (jobId: string) => {
    setVisualLoading(jobId);
    try {
      const res = await fetch(`/api/content-jobs/${jobId}/generate-visual`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast("✅ Görsel oluşturuldu!");
      setTimeout(() => setToast(null), 3000);
      await fetchJobs();
    } catch (e: any) {
      setToast(`❌ ${e.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally { setVisualLoading(null); }
  };

  // Week calculation
  const getWeekDays = (offset: number) => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(weekOffset);
  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const getJobsForDay = (date: Date): ContentJob[] => {
    return jobs.filter((job) => {
      if (!job.scheduledFor) return false;
      const sd = new Date(job.scheduledFor);
      return sd.getDate() === date.getDate() && sd.getMonth() === date.getMonth() && sd.getFullYear() === date.getFullYear();
    });
  };

  const topicToTitle = (topicId: string) => {
    const parts = topicId.split("|");
    return parts.length > 1 ? parts[1] : parts[0];
  };

  const getHour = (job: ContentJob): number => {
    if (job.bundle?.storySequence?.scheduledHour) return job.bundle.storySequence.scheduledHour;
    if (job.scheduledFor) return new Date(job.scheduledFor).getHours();
    return 12;
  };

  const getMainText = (job: ContentJob): string => {
    if (!job.bundle) return "";
    return job.bundle.reelsScript || job.bundle.caption_ig || job.bundle.post_li || job.bundle.thread_x || "";
  };

  const weekLabel = () => {
    const s = weekDays[0];
    const e = weekDays[6];
    const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    return `${fmt(s)} — ${fmt(e)}`;
  };

  // Count unscheduled jobs
  const unscheduledJobs = jobs.filter((j) => !j.scheduledFor);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📅</div>
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
      <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "2px" }}>İçerik Takvimi</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
            {jobs.length} içerik · {jobs.filter((j) => j.status === "NEEDS_REVIEW").length} onay bekliyor
          </p>
        </div>
        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>←</button>
          <button onClick={() => setWeekOffset(0)} style={{
            ...navBtnStyle,
            background: weekOffset === 0 ? "rgba(244,132,30,0.15)" : navBtnStyle.background,
            color: weekOffset === 0 ? "var(--orange)" : navBtnStyle.color,
            minWidth: "140px",
          }}>
            {weekOffset === 0 ? "Bu Hafta" : weekLabel()}
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} style={navBtnStyle}>→</button>
        </div>
      </div>

      {/* Week Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px",
        minHeight: "500px",
      }}>
        {weekDays.map((day, i) => {
          const dayJobs = getJobsForDay(day);
          const today = isToday(day);

          return (
            <div key={i} style={{
              background: today ? "rgba(244,132,30,0.06)" : "var(--surface)",
              borderRadius: "12px",
              border: today ? "1px solid rgba(244,132,30,0.3)" : "1px solid var(--border)",
              overflow: "hidden",
              display: "flex", flexDirection: "column",
              transition: "border-color 0.2s",
            }}>
              {/* Day header */}
              <div style={{
                padding: "10px 10px 8px",
                borderBottom: "1px solid var(--border)",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: "0.7rem", fontWeight: 700,
                  color: today ? "var(--orange)" : "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {DAY_NAMES_SHORT[day.getDay()]}
                </div>
                <div style={{
                  fontSize: "1.3rem", fontWeight: 800, fontFamily: "Outfit",
                  color: today ? "var(--orange)" : "var(--text-primary)",
                  lineHeight: 1.2,
                }}>
                  {day.getDate()}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>
                  {day.toLocaleDateString("tr-TR", { month: "short" })}
                </div>
              </div>

              {/* Content cards for this day */}
              <div style={{ flex: 1, padding: "6px", display: "flex", flexDirection: "column", gap: "5px", overflow: "auto" }}>
                {dayJobs.length === 0 && (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-secondary)", fontSize: "0.65rem", opacity: 0.5,
                  }}>
                    —
                  </div>
                )}
                {dayJobs.sort((a, b) => getHour(a) - getHour(b)).map((job) => {
                  const plat = PLATFORM_META[job.contextPlatform] || { icon: "📱", color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
                  const statusCol = STATUS_COLORS[job.status] || { bg: "rgba(255,255,255,0.06)", color: "#ccc" };

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        background: plat.bg,
                        borderRadius: "8px",
                        padding: "7px 8px",
                        cursor: "pointer",
                        borderLeft: `3px solid ${plat.color}`,
                        transition: "transform 0.15s, box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* Time + Platform */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, color: plat.color }}>
                          {String(getHour(job)).padStart(2, "0")}:00 {plat.icon}
                        </span>
                        <span style={{
                          fontSize: "0.55rem", fontWeight: 700,
                          padding: "1px 5px", borderRadius: "4px",
                          background: statusCol.bg, color: statusCol.color,
                        }}>
                          {job.status === "NEEDS_REVIEW" ? "⏳" : job.status === "APPROVED" ? "✓" : "!"}
                        </span>
                      </div>
                      {/* Title */}
                      <div style={{
                        fontSize: "0.68rem", fontWeight: 600, lineHeight: 1.25,
                        color: "var(--text-primary)",
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>
                        {topicToTitle(job.topicId)}
                      </div>
                      {/* Type badge */}
                      <div style={{ fontSize: "0.55rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {CONTENT_ICONS[job.contentType]} {job.contentType}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled items */}
      {unscheduledJobs.length > 0 && (
        <div className="glass fade-up" style={{ padding: "14px 18px", marginTop: "1rem" }}>
          <h3 style={{ fontSize: "0.85rem", marginBottom: "8px", color: "var(--text-secondary)" }}>
            📌 Planlanmamış İçerikler ({unscheduledJobs.length})
          </h3>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {unscheduledJobs.map((job) => {
              const plat = PLATFORM_META[job.contextPlatform] || { icon: "📱", color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
              return (
                <div key={job.id} onClick={() => setSelectedJob(job)}
                  style={{
                    background: plat.bg, borderRadius: "8px",
                    padding: "6px 10px", cursor: "pointer",
                    borderLeft: `3px solid ${plat.color}`,
                    fontSize: "0.72rem", fontWeight: 600,
                  }}
                >
                  {plat.icon} {topicToTitle(job.topicId).slice(0, 30)}
                </div>
              );
            })}
          </div>
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
                <h2 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>
                  {topicToTitle(selectedJob.topicId)}
                </h2>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(() => {
                    const plat = PLATFORM_META[selectedJob.contextPlatform] || { icon: "📱", color: "#818cf8", bg: "rgba(129,140,248,0.12)" };
                    return (
                      <>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: plat.bg, color: plat.color }}>
                          {plat.icon} {selectedJob.contextPlatform}
                        </span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(129,140,248,0.12)", color: "#818cf8" }}>
                          {CONTENT_ICONS[selectedJob.contentType]} {selectedJob.contentType}
                        </span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(244,132,30,0.12)", color: "var(--orange)" }}>
                          {selectedJob.funnelStage} · {selectedJob.strategy}
                        </span>
                        {selectedJob.scheduledFor && (
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
                            🕐 {String(getHour(selectedJob)).padStart(2, "0")}:00
                          </span>
                        )}
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

            {/* Visual preview — responsive to content type */}
            {selectedJob.bundle?.videoUrl && (
              <div style={{
                padding: "14px 20px 0",
                background: "rgba(0,0,0,0.15)",
                margin: "0",
                display: "flex", justifyContent: "center",
              }}>
                <img src={selectedJob.bundle.videoUrl} alt="Mockup"
                  style={{
                    maxWidth: "100%",
                    maxHeight: selectedJob.contentType === "REELS" ? "400px" : "320px",
                    objectFit: "contain",
                    borderRadius: "10px",
                    display: "block",
                  }}
                />
              </div>
            )}

            {/* Design brief */}
            {selectedJob.bundle?.storySequence?.designPrompt && (
              <div style={{
                margin: "14px 20px 0", padding: "12px 14px", borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(244,132,30,0.06), rgba(129,140,248,0.06))",
                border: "1px solid rgba(244,132,30,0.15)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--orange)", textTransform: "uppercase" }}>
                    🎨 Tasarım Briefingi
                  </span>
                  <button
                    onClick={() => generateVisual(selectedJob.id)}
                    disabled={visualLoading === selectedJob.id}
                    style={{
                      background: "rgba(244,132,30,0.12)", border: "1px solid rgba(244,132,30,0.3)",
                      borderRadius: "6px", padding: "3px 10px", color: "var(--orange)",
                      cursor: "pointer", fontSize: "0.68rem", fontWeight: 600, fontFamily: "Inter",
                    }}
                  >
                    {visualLoading === selectedJob.id ? "⏳…" : selectedJob.bundle?.videoUrl ? "🔄 Yeniden Üret" : "🖼️ Görsel Üret"}
                  </button>
                </div>
                <p style={{ fontSize: "0.82rem", lineHeight: 1.5, fontStyle: "italic", margin: 0 }}>
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

const navBtnStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "6px 12px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 600,
  fontFamily: "Inter",
  transition: "all 0.2s",
};
