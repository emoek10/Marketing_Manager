"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

interface StatsData {
  totalJobs: number;
  pendingReview: number;
  approved: number;
  processing: number;
  thisWeekCount: number;
  platformBreakdown: Record<string, number>;
  isGeneratingStrategy: boolean;
}

interface ContentJob {
  id: string;
  topicId: string;
  strategy: string;
  status: string;
  contentType: string;
  funnelStage: string;
  contextPlatform: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; css: string }> = {
  NEEDS_REVIEW: { label: "⏳ Bekliyor", css: "pending" },
  NEEDS_MANUAL_REVIEW: { label: "🚩 Manuel", css: "failed" },
  APPROVED: { label: "✓ Onaylandı", css: "approved" },
  REJECTED: { label: "✕ Reddedildi", css: "failed" },
  PROCESSING: { label: "⚡ İşleniyor", css: "processing" },
  COMPLETED: { label: "✓ Tamamlandı", css: "approved" },
};

const PLATFORM_ICONS: Record<string, string> = {
  IG: "📸", Instagram: "📸", TikTok: "🎵", LinkedIn: "💼", X: "𝕏",
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<ContentJob[]>({
    queryKey: ["content-jobs"],
    queryFn: () => fetch("/api/content-jobs").then((r) => r.json()),
  });

  const strategyMutation = useMutation({
    mutationFn: () =>
      fetch("/api/strategy/generate", { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Strateji üretimi başarısız");
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["content-jobs"] });
      setToast(`✅ ${data.count} günlük strateji oluşturuldu!`);
      setTimeout(() => setToast(null), 4000);
    },
    onError: () => {
      setToast("❌ Strateji üretimi başarısız. GEMINI_API_KEY kontrol edin.");
      setTimeout(() => setToast(null), 4000);
    },
  });

  const recentJobs = jobs?.slice(0, 5) ?? [];

  const statCards = [
    {
      label: "Toplam İçerik",
      value: stats?.totalJobs ?? "—",
      sub: "Üretildi",
      icon: "📊",
      color: "#818cf8",
    },
    {
      label: "Onay Bekleyen",
      value: stats?.pendingReview ?? "—",
      sub: "İçerik",
      icon: "⏳",
      color: "#fbbf24",
    },
    {
      label: "Onaylanan",
      value: stats?.approved ?? "—",
      sub: "İçerik",
      icon: "✅",
      color: "#34d399",
    },
    {
      label: "Bu Hafta",
      value: stats?.thisWeekCount ?? "—",
      sub: "Yeni üretim",
      icon: "📅",
      color: "#f4841e",
    },
  ];

  const topicToTitle = (topicId: string) =>
    topicId.split("|")[0].substring(0, 55);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: "20px", right: "20px", zIndex: 9999,
            background: toast.includes("✅") ? "rgba(52,211,153,0.9)" : "rgba(239,68,68,0.9)",
            color: "#fff", padding: "12px 24px", borderRadius: "50px",
            fontWeight: 600, fontSize: "0.85rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            animation: "fadeUp 0.3s ease",
          }}
        >
          {toast}
        </div>
      )}

      {/* Strategy generation banner */}
      {(stats?.isGeneratingStrategy || strategyMutation.isPending) && (
        <div
          className="fade-up"
          style={{
            background: "linear-gradient(135deg, rgba(244,132,30,0.15), rgba(129,140,248,0.15))",
            border: "1px solid rgba(244,132,30,0.3)",
            borderRadius: "12px",
            padding: "14px 20px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "1.4rem", animation: "pulse 2s infinite" }}>🧠</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Strateji Üretiliyor...
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              AI ajanı haftalık içerik planı hazırlıyor. Tamamlanınca burada görünecek.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>Hoş geldiniz 👋</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Dijital Pazarlama Asistanınız hazır. İşte bugünün özeti.
        </p>
      </div>

      {/* Stats row */}
      <div
        className="fade-up fade-up-delay-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            className="glass"
            style={{
              padding: "1.25rem 1.5rem",
              transition: "transform 0.2s",
              opacity: statsLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            <div style={{ fontSize: "1.6rem", marginBottom: "8px" }}>
              {s.icon}
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 800,
                color: s.color,
              }}
            >
              {statsLoading ? "…" : s.value}
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {s.label}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Recent content jobs */}
      <div
        className="glass fade-up fade-up-delay-2"
        style={{ padding: "1.5rem" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem" }}>Son İçerik İşleri</h2>
          <Link
            href="/dashboard/calendar"
            style={{
              fontSize: "0.8rem",
              color: "var(--orange)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Tümünü Gör →
          </Link>
        </div>

        {jobsLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--text-secondary)",
            }}
          >
            Yükleniyor…
          </div>
        ) : recentJobs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--text-secondary)",
            }}
          >
            Henüz içerik yok. Strateji üretimi başlatarak başlayın.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {recentJobs.map((job) => {
              const statusInfo = STATUS_MAP[job.status] || {
                label: job.status,
                css: "pending",
              };
              return (
                <div
                  key={job.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.03)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>
                      {PLATFORM_ICONS[job.contextPlatform] || "📱"}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {topicToTitle(job.topicId)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                        }}
                      >
                        {job.contextPlatform} · {job.contentType} ·{" "}
                        {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`status-pill ${statusInfo.css}`}
                    style={{ marginLeft: "12px", flexShrink: 0 }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shortcut actions */}
      <div
        className="fade-up fade-up-delay-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {/* Strategy Generate */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🧠</div>
          <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>
            Haftalık Strateji Üret
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            AI ile 7 günlük VaynerMedia içerik planı oluştur.
          </p>
          <button
            className="btn-primary"
            onClick={() => strategyMutation.mutate()}
            disabled={strategyMutation.isPending || stats?.isGeneratingStrategy}
            style={{ fontSize: "0.85rem", padding: "9px 18px" }}
          >
            {strategyMutation.isPending ? "Üretiliyor…" : "🚀 Strateji Üret"}
          </button>
        </div>

        {/* Calendar */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>📅</div>
          <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>
            İçerik Takvimini Gör
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            AI tarafından üretilen tüm içerikleri incele ve onayla.
          </p>
          <Link href="/dashboard/calendar">
            <button
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "9px 18px" }}
            >
              Takvime Git
            </button>
          </Link>
        </div>

        {/* Brand Profile */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🎨</div>
          <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>
            Marka Profilini Düzenle
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            Markanızın hikayesini, tonunu ve tasarım kurallarını güncelleyin.
          </p>
          <Link href="/dashboard/brand">
            <button
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "9px 18px" }}
            >
              Profili Düzenle
            </button>
          </Link>
        </div>

        {/* Campaign */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🎯</div>
          <h3 style={{ fontSize: "1rem", marginBottom: "6px" }}>
            Kampanya Oluştur
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            Ürün lansmanı veya operasyonel reklam planı oluşturun.
          </p>
          <Link href="/dashboard/campaigns">
            <button
              className="btn-primary"
              style={{ fontSize: "0.85rem", padding: "9px 18px" }}
            >
              Kampanyalar
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
