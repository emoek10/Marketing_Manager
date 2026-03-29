"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface SettingsData {
  tenant: {
    id: string;
    name: string;
    plan: string;
    createdAt: string;
  } | null;
  apiStatus: {
    gemini: boolean;
    serper: boolean;
    canva: boolean;
    pinecone: boolean;
    redis: boolean;
  };
  environment: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings/reset", { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Reset failed");
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setShowResetModal(false);
      setToast(`✅ ${data.deleted.contentJobs} içerik ve ${data.deleted.socialBundles} bundle silindi.`);
      setTimeout(() => setToast(null), 4000);
    },
    onError: () => {
      setToast("❌ Sıfırlama başarısız.");
      setTimeout(() => setToast(null), 3000);
    },
  });

  if (isLoading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚙️</div>
          <p style={{ color: "var(--text-secondary)" }}>Ayarlar yükleniyor…</p>
        </div>
      </div>
    );
  }

  const apiEntries = [
    { key: "gemini", label: "Gemini AI", icon: "🤖" },
    { key: "serper", label: "Serper (Google News)", icon: "📰" },
    { key: "canva", label: "Canva API", icon: "🎨" },
    { key: "pinecone", label: "Pinecone (Vector DB)", icon: "🌲" },
    { key: "redis", label: "Redis (Queue)", icon: "🔴" },
  ] as const;

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
          }}
        >
          {toast}
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="glass"
            style={{
              padding: "2rem", maxWidth: "420px", width: "90%",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Tüm İçerikleri Sıfırla</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Bu işlem tüm içerik job'larını ve social bundle'ları kalıcı olarak silecek.
              Bu işlem geri alınamaz!
            </p>
            {data.environment === "production" && (
              <div style={{
                padding: "10px", borderRadius: "8px", marginBottom: "16px",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                fontSize: "0.8rem", color: "#ef4444",
              }}>
                🚫 Production ortamında bu işlem devre dışıdır.
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  background: "transparent", border: "1px solid var(--border)",
                  borderRadius: "8px", padding: "10px 20px",
                  color: "var(--text-primary)", cursor: "pointer",
                  fontFamily: "Inter", fontSize: "0.85rem",
                }}
              >
                İptal
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending || data.environment === "production"}
                style={{
                  background: "rgba(239,68,68,0.9)", border: "none",
                  borderRadius: "8px", padding: "10px 20px",
                  color: "#fff", cursor: "pointer",
                  fontFamily: "Inter", fontWeight: 600, fontSize: "0.85rem",
                  opacity: data.environment === "production" ? 0.4 : 1,
                }}
              >
                {resetMutation.isPending ? "Siliniyor…" : "🗑️ Evet, Sıfırla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>Ayarlar</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Sistem konfigürasyonu ve API bağlantı durumları.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Tenant Info */}
        <div className="glass fade-up fade-up-delay-1" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
            🏢 Hesap Bilgileri
          </h3>
          {data.tenant ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Şirket Adı", value: data.tenant.name },
                { label: "Plan", value: data.tenant.plan },
                { label: "Ortam", value: data.environment },
                { label: "Oluşturulma", value: new Date(data.tenant.createdAt).toLocaleDateString("tr-TR") },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{item.label}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Henüz hesap oluşturulmamış.
            </p>
          )}
        </div>

        {/* API Status */}
        <div className="glass fade-up fade-up-delay-1" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: "16px", color: "var(--orange)" }}>
            🔌 API Bağlantıları
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {apiEntries.map(({ key, label, icon }) => {
              const connected = data.apiStatus[key];
              return (
                <div
                  key={key}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${connected ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  <span style={{ fontSize: "0.85rem" }}>
                    {icon} {label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      padding: "3px 10px", borderRadius: "20px",
                      background: connected ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
                      color: connected ? "#34d399" : "#ef4444",
                    }}
                  >
                    {connected ? "BAĞLI" : "YOK"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger Zone */}
        <div
          className="glass fade-up fade-up-delay-2"
          style={{
            padding: "1.5rem", gridColumn: "1 / -1",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <h3 style={{ fontSize: "0.95rem", marginBottom: "8px", color: "#ef4444" }}>
            ⚠️ Tehlikeli Alan
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "16px" }}>
            Bu işlemler geri alınamaz. Dikkatli kullanın.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px", padding: "10px 20px", color: "#ef4444",
              cursor: "pointer", fontSize: "0.85rem", fontFamily: "Inter", fontWeight: 600,
            }}
          >
            🗑️ Tüm İçerikleri Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
