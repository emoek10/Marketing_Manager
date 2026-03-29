"use client";

import { useQuery } from "@tanstack/react-query";

interface StatsData {
  totalJobs: number;
  pendingReview: number;
  approved: number;
  processing: number;
  thisWeekCount: number;
  platformBreakdown: Record<string, number>;
  funnelBreakdown: Record<string, number>;
  strategyBreakdown: Record<string, number>;
  averageCriticTurns: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  IG: "#e1306c",
  Instagram: "#e1306c",
  TikTok: "#69c9d0",
  LinkedIn: "#0077b5",
  X: "#f0f4f8",
};

const FUNNEL_COLORS: Record<string, string> = {
  ToF: "#818cf8",
  MoF: "#fbbf24",
  BoF: "#34d399",
};

const STRATEGY_COLORS: Record<string, string> = {
  Authority: "#3b82f6",
  Engagement: "#f4841e",
};

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
  });

  if (isLoading || !stats) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📊</div>
          <p style={{ color: "var(--text-secondary)" }}>Analitikler yükleniyor…</p>
        </div>
      </div>
    );
  }

  const maxPlatform = Math.max(...Object.values(stats.platformBreakdown), 1);
  const maxFunnel = Math.max(...Object.values(stats.funnelBreakdown), 1);
  const totalStrategy = Object.values(stats.strategyBreakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Analitik</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          İçerik üretim performansınızın özeti.
        </p>
      </div>

      {/* Top metric cards */}
      <div className="fade-up fade-up-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Toplam İçerik", value: stats.totalJobs, icon: "📊", color: "#818cf8" },
          { label: "Onay Bekleyen", value: stats.pendingReview, icon: "⏳", color: "#fbbf24" },
          { label: "Onaylanan", value: stats.approved, icon: "✅", color: "#34d399" },
          { label: "Ort. Critic Tur", value: stats.averageCriticTurns, icon: "🔄", color: "#f4841e" },
        ].map((m) => (
          <div key={m.label} className="glass" style={{ padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{m.icon}</div>
            <div style={{ fontSize: "1.8rem", fontFamily: "Outfit", fontWeight: 800, color: m.color }}>
              {m.value}
            </div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Platform Distribution */}
        <div className="glass fade-up fade-up-delay-2" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "20px" }}>📱 Platform Dağılımı</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
              <div key={platform}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>{platform}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{count}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "4px",
                      width: `${(count / maxPlatform) * 100}%`,
                      background: PLATFORM_COLORS[platform] || "#818cf8",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel Distribution */}
        <div className="glass fade-up fade-up-delay-2" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "20px" }}>🎯 Funnel Dağılımı</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(stats.funnelBreakdown).map(([stage, count]) => (
              <div key={stage}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                    {stage === "ToF" ? "🔝 Top of Funnel" : stage === "MoF" ? "📐 Middle of Funnel" : "💰 Bottom of Funnel"}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{count}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "4px",
                      width: `${(count / maxFunnel) * 100}%`,
                      background: FUNNEL_COLORS[stage] || "#818cf8",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Split */}
        <div className="glass fade-up fade-up-delay-3" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "20px" }}>⚡ Strateji Dağılımı</h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
            {Object.entries(stats.strategyBreakdown).map(([strategy, count]) => {
              const pct = Math.round((count / totalStrategy) * 100);
              return (
                <div key={strategy} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2.2rem",
                      fontFamily: "Outfit",
                      fontWeight: 800,
                      color: STRATEGY_COLORS[strategy] || "#818cf8",
                    }}
                  >
                    {pct}%
                  </div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 500, marginTop: "4px" }}>
                    {strategy}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    {count} içerik
                  </div>
                </div>
              );
            })}
          </div>
          {/* Stacked bar */}
          <div style={{ height: "12px", borderRadius: "6px", display: "flex", overflow: "hidden" }}>
            {Object.entries(stats.strategyBreakdown).map(([strategy, count]) => (
              <div
                key={strategy}
                style={{
                  width: `${(count / totalStrategy) * 100}%`,
                  background: STRATEGY_COLORS[strategy] || "#818cf8",
                  transition: "width 0.6s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="glass fade-up fade-up-delay-3" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "20px" }}>📋 Özet</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Bu hafta üretilen", value: stats.thisWeekCount, color: "#f4841e" },
              { label: "İşlenen", value: stats.processing, color: "#818cf8" },
              { label: "Toplam platform", value: Object.keys(stats.platformBreakdown).length, color: "#34d399" },
              { label: "Ort. AI düzeltme turu", value: stats.averageCriticTurns, color: "#fbbf24" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>{item.label}</span>
                <span
                  style={{
                    fontSize: "1.1rem",
                    fontFamily: "Outfit",
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
