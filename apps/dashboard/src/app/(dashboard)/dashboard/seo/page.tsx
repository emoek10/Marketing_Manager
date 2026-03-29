"use client";

import { useState, useEffect } from "react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  targetKeyword: string;
  secondaryKeys: string | null;
  seoScore: number | null;
  seoAnalysis: string | null;
  status: string;
  wordCount: number;
  readingTime: number;
  featuredImage: string | null;
  createdAt: string;
}

interface SEOAudit {
  overallScore: number;
  currentStatus: {
    titleTag: string;
    metaDescription: string;
    headingStructure: string;
    mobileReady: boolean;
    hasSchema?: boolean;
    contentDensity?: string;
    summary: string;
  };
  keywordStrategy: {
    keyword: string;
    searchVolume: string;
    competition: string;
    priority: string;
    suggestedTitle: string;
  }[];
  contentPlan: {
    postsPerWeek: number;
    categories: string[];
    formats: string[];
    seasonalTopics?: string[];
    weeklySchedule: string;
  };
  technicalFixes: {
    issue: string;
    severity: string;
    fix: string;
  }[];
  competitorInsights: string;
}

interface BrandProfile {
  websiteUrl?: string;
  logoUrl?: string;
  brandColors?: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Taslak", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  PUBLISHED: { label: "Yayında", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ARCHIVED: { label: "Arşiv", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const TONE_OPTIONS = [
  { value: "professional", label: "Kurumsal" },
  { value: "friendly", label: "Samimi" },
  { value: "bold", label: "Cesur" },
  { value: "educational", label: "Eğitici" },
  { value: "playful", label: "Yaratıcı" },
];

type Tab = "audit" | "blog";

export default function SEOBlogPage() {
  const [activeTab, setActiveTab] = useState<Tab>("audit");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<BrandProfile | null>(null);

  // SEO Audit state
  const [audit, setAudit] = useState<SEOAudit | null>(null);
  const [auditUrl, setAuditUrl] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);

  // Blog generation state
  const [generating, setGenerating] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [secondaryKw, setSecondaryKw] = useState("");
  const [wordTarget, setWordTarget] = useState(1500);
  const [tone, setTone] = useState("professional");
  const [genStep, setGenStep] = useState(0);

  // Detail modal
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTitle, setEditingTitle] = useState("");

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchBrand();
  }, []);

  const fetchBrand = async () => {
    try {
      const res = await fetch("/api/brand-profile");
      const data = await res.json();
      if (data.brand) {
        setBrand(data.brand);
        if (data.brand.websiteUrl) setAuditUrl(data.brand.websiteUrl);
      }
    } catch {}
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/blog");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {} finally { setLoading(false); }
  };

  const runAudit = async () => {
    if (!auditUrl.trim()) { showToast("Lütfen bir URL girin"); return; }
    setAuditing(true);
    setAuditStep(0);
    const iv = setInterval(() => setAuditStep(p => Math.min(p + 1, 4)), 5000);

    try {
      const res = await fetch("/api/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: auditUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAudit(data.analysis);
      showToast("SEO analizi tamamlandı!");
    } catch (e: any) {
      showToast(`Hata: ${e.message}`);
    } finally {
      clearInterval(iv);
      setAuditing(false);
    }
  };

  const generateBlog = async () => {
    if (!keyword.trim()) { showToast("Anahtar kelime girin"); return; }
    setGenerating(true);
    setGenStep(0);
    const iv = setInterval(() => setGenStep(p => Math.min(p + 1, 5)), 5000);

    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetKeyword: keyword.trim(), secondaryKeywords: secondaryKw.trim() || undefined, wordTarget, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Blog yazısı üretildi! Skor: ${data.post.seoScore}/100`);
      setKeyword("");
      setSecondaryKw("");
      await fetchPosts();
    } catch (e: any) {
      showToast(`Hata: ${e.message}`);
    } finally {
      clearInterval(iv);
      setGenerating(false);
    }
  };

  const updatePost = async (id: string, data: any) => {
    try {
      const res = await fetch("/api/blog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      showToast("Güncellendi!");
      await fetchPosts();
    } catch (e: any) { showToast(`Hata: ${e.message}`); }
  };

  const deletePost = async (id: string) => {
    try {
      await fetch(`/api/blog?id=${id}`, { method: "DELETE" });
      showToast("Blog silindi");
      setSelectedPost(null);
      await fetchPosts();
    } catch (e: any) { showToast(`Hata: ${e.message}`); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };
  const openEditor = (post: BlogPost) => { setSelectedPost(post); setEditingContent(post.content); setEditingTitle(post.title); };
  const getScoreColor = (s: number) => s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : s >= 40 ? "#fb923c" : "#ef4444";

  const AUDIT_STEPS = ["Site taranıyor...", "SEO kontrolleri...", "Anahtar kelime analizi...", "Strateji oluşturuluyor...", "Rapor hazırlanıyor..."];
  const GEN_STEPS = ["Anahtar kelime analizi...", "İçerik yapısı...", "Blog yazılıyor...", "SEO kontrolü...", "Görsel üretiliyor...", "Tamamlanıyor..."];

  const totalPosts = posts.length;
  const avgScore = totalPosts > 0 ? Math.round(posts.reduce((s, p) => s + (p.seoScore || 0), 0) / totalPosts) : 0;

  // Check if brand colors are light (to decide if logo should be white)
  const logoUrl = brand?.logoUrl || null;

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, background: "rgba(52,211,153,0.9)", color: "#fff", padding: "12px 24px", borderRadius: "50px", fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: "4px" }}>SEO & Blog</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          AI SEO danışmanı + otomatik blog üretimi
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="fade-up" style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "4px", border: "1px solid var(--border)" }}>
        {[
          { id: "audit" as Tab, label: "SEO Danışmanı", icon: "🎯" },
          { id: "blog" as Tab, label: "Blog Yazarı", icon: "✍️" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "10px 16px", borderRadius: "10px", border: "none", cursor: "pointer",
            background: activeTab === tab.id ? "rgba(244,132,30,0.15)" : "transparent",
            color: activeTab === tab.id ? "var(--orange)" : "var(--text-secondary)",
            fontWeight: 700, fontSize: "0.85rem", fontFamily: "Inter",
            transition: "all 0.2s",
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB: SEO DANIŞMANI ========== */}
      {activeTab === "audit" && (
        <div>
          {/* Audit Input */}
          <div className="glass fade-up" style={{ padding: "1.25rem", marginBottom: "1.5rem", borderTop: "3px solid var(--orange)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1.3rem" }}>🎯</span>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0, color: "var(--orange)" }}>SEO Danışmanı</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                  Web sitenizi analiz edelim, strateji çıkaralım
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input className="input-field" placeholder="https://example.com" value={auditUrl} onChange={e => setAuditUrl(e.target.value)} disabled={auditing} style={{ flex: 1 }} />
              <button className="btn-primary" onClick={runAudit} disabled={auditing || !auditUrl.trim()} style={{ padding: "10px 24px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {auditing ? "Analiz ediliyor..." : "Analiz Et"}
              </button>
            </div>
            {auditing && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {AUDIT_STEPS.map((step, i) => (
                    <span key={i} style={{ fontSize: "0.68rem", padding: "4px 10px", borderRadius: "16px", background: i <= auditStep ? "rgba(244,132,30,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${i <= auditStep ? "rgba(244,132,30,0.3)" : "var(--border)"}`, color: i <= auditStep ? "var(--orange)" : "var(--text-secondary)", fontWeight: i === auditStep ? 700 : 500, transition: "all 0.4s" }}>
                      {i < auditStep ? "✓" : ""} {step}
                    </span>
                  ))}
                </div>
                <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", marginTop: "8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "2px", background: "linear-gradient(135deg, var(--orange), #818cf8)", width: `${((auditStep + 1) / AUDIT_STEPS.length) * 100}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            )}
          </div>

          {/* Audit Results */}
          {audit && (
            <div className="fade-up">
              {/* Score + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "12px", marginBottom: "1.5rem" }}>
                {/* Score Circle */}
                <div className="glass" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                  <div style={{ width: "100px", height: "100px", borderRadius: "50%", border: `5px solid ${getScoreColor(audit.overallScore)}`, display: "flex", alignItems: "center", justifyContent: "center", background: `${getScoreColor(audit.overallScore)}10` }}>
                    <span style={{ fontSize: "2rem", fontWeight: 800, color: getScoreColor(audit.overallScore) }}>{audit.overallScore}</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", textAlign: "center" }}>SEO Sağlık Puanı</p>
                </div>

                {/* Current Status */}
                <div className="glass" style={{ padding: "16px" }}>
                  <h3 style={{ fontSize: "0.85rem", color: "#818cf8", marginBottom: "10px" }}>Mevcut Durum</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "10px" }}>{audit.currentStatus.summary}</p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <StatusBadge label="Title Tag" ok={audit.currentStatus.titleTag !== "Yok"} detail={audit.currentStatus.titleTag} />
                    <StatusBadge label="Meta Desc" ok={audit.currentStatus.metaDescription !== "Yok"} detail={audit.currentStatus.metaDescription} />
                    <StatusBadge label="Mobil" ok={audit.currentStatus.mobileReady} />
                    {audit.currentStatus.hasSchema !== undefined && <StatusBadge label="Schema" ok={audit.currentStatus.hasSchema} />}
                  </div>
                </div>
              </div>

              {/* Keyword Strategy */}
              <div className="glass" style={{ padding: "16px", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "0.85rem", color: "var(--orange)", marginBottom: "12px" }}>Anahtar Kelime Stratejisi</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {audit.keywordStrategy.map((kw, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: kw.priority === "Acil" ? "rgba(239,68,68,0.12)" : kw.priority === "Yüksek" ? "rgba(251,191,36,0.12)" : "rgba(129,140,248,0.12)", color: kw.priority === "Acil" ? "#ef4444" : kw.priority === "Yüksek" ? "#fbbf24" : "#818cf8" }}>
                        {kw.priority}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{kw.keyword}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{kw.suggestedTitle}</div>
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>Hacim: {kw.searchVolume}</span>
                      <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: kw.competition === "Düşük" ? "rgba(52,211,153,0.1)" : kw.competition === "Yüksek" ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)", color: kw.competition === "Düşük" ? "#34d399" : kw.competition === "Yüksek" ? "#ef4444" : "#fbbf24" }}>
                        {kw.competition}
                      </span>
                      <button onClick={() => { setKeyword(kw.keyword); setActiveTab("blog"); }} style={{ background: "rgba(244,132,30,0.1)", border: "1px solid rgba(244,132,30,0.2)", borderRadius: "6px", padding: "4px 10px", color: "var(--orange)", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600, fontFamily: "Inter" }}>
                        Blog Yaz
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Plan + Technical Fixes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Content Plan */}
                <div className="glass" style={{ padding: "16px" }}>
                  <h3 style={{ fontSize: "0.85rem", color: "#34d399", marginBottom: "10px" }}>İçerik Planı</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>{audit.contentPlan.postsPerWeek}</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>yazı / hafta önerisi</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "8px" }}>{audit.contentPlan.weeklySchedule}</p>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {audit.contentPlan.categories.map((cat, i) => (
                      <span key={i} style={{ fontSize: "0.62rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(52,211,153,0.08)", color: "#34d399", fontWeight: 600 }}>{cat}</span>
                    ))}
                  </div>
                </div>

                {/* Technical Fixes */}
                <div className="glass" style={{ padding: "16px" }}>
                  <h3 style={{ fontSize: "0.85rem", color: "#ef4444", marginBottom: "10px" }}>Teknik Düzeltmeler</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {audit.technicalFixes.slice(0, 5).map((fix, i) => (
                      <div key={i} style={{ padding: "8px", borderRadius: "6px", background: fix.severity === "Kritik" ? "rgba(239,68,68,0.06)" : "rgba(251,191,36,0.06)", borderLeft: `3px solid ${fix.severity === "Kritik" ? "#ef4444" : fix.severity === "Yüksek" ? "#fbbf24" : "#818cf8"}` }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>{fix.issue}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "2px" }}>{fix.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competitor Insights */}
              <div className="glass" style={{ padding: "16px" }}>
                <h3 style={{ fontSize: "0.85rem", color: "#818cf8", marginBottom: "8px" }}>Rakip Analizi</h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{audit.competitorInsights}</p>
              </div>
            </div>
          )}

          {!audit && !auditing && (
            <div className="glass fade-up" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎯</div>
              <h3 style={{ marginBottom: "8px" }}>SEO Danışmanınız Hazır</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Web sitenizin URL'sini girin, AI kapsamlı bir SEO analizi ve strateji raporu hazırlasın.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: BLOG YAZARI ========== */}
      {activeTab === "blog" && (
        <div>
          {/* Stats */}
          <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
            {[
              { icon: "📝", label: "Toplam Blog", value: totalPosts, color: "#818cf8" },
              { icon: "📊", label: "Ort. Skor", value: avgScore > 0 ? `${avgScore}/100` : "—", color: getScoreColor(avgScore) },
              { icon: "📖", label: "Toplam Kelime", value: posts.reduce((s, p) => s + p.wordCount, 0) > 0 ? `${(posts.reduce((s, p) => s + p.wordCount, 0) / 1000).toFixed(1)}K` : "—", color: "var(--orange)" },
            ].map((stat, i) => (
              <div key={i} className="glass" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "1rem" }}>{stat.icon}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Blog Generator */}
          <div className="glass fade-up" style={{ padding: "1.25rem", marginBottom: "1.5rem", borderTop: "3px solid #818cf8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1.3rem" }}>✍️</span>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0, color: "#818cf8" }}>AI Blog Yazarı</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>Anahtar kelime girin, AI blog yazısı + kapak görseli üretsin</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={labelStyle}>Ana Anahtar Kelime *</label>
                <input className="input-field" placeholder="hayvan kulak kupesi, RFID hayvancilik" value={keyword} onChange={e => setKeyword(e.target.value)} disabled={generating} />
              </div>
              <div>
                <label style={labelStyle}>İkincil Kelimeler</label>
                <input className="input-field" placeholder="kulak kupesi fiyat, buyukbas rfid" value={secondaryKw} onChange={e => setSecondaryKw(e.target.value)} disabled={generating} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ width: "130px" }}>
                <label style={labelStyle}>Kelime</label>
                <select className="input-field" value={wordTarget} onChange={e => setWordTarget(Number(e.target.value))} disabled={generating} style={{ appearance: "none", cursor: "pointer" }}>
                  <option value={800}>~800</option>
                  <option value={1200}>~1200</option>
                  <option value={1500}>~1500</option>
                  <option value={2000}>~2000</option>
                </select>
              </div>
              <div style={{ width: "130px" }}>
                <label style={labelStyle}>Ton</label>
                <select className="input-field" value={tone} onChange={e => setTone(e.target.value)} disabled={generating} style={{ appearance: "none", cursor: "pointer" }}>
                  {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={generateBlog} disabled={generating || !keyword.trim()} style={{ flex: 1, padding: "10px", fontSize: "0.9rem", opacity: !keyword.trim() ? 0.5 : 1 }}>
                {generating ? "Yazılıyor..." : "Blog Yaz"}
              </button>
            </div>
            {generating && (
              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {GEN_STEPS.map((step, i) => (
                    <span key={i} style={{ fontSize: "0.65rem", padding: "4px 8px", borderRadius: "16px", background: i <= genStep ? "rgba(129,140,248,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${i <= genStep ? "rgba(129,140,248,0.3)" : "var(--border)"}`, color: i <= genStep ? "#818cf8" : "var(--text-secondary)", fontWeight: i === genStep ? 700 : 500, transition: "all 0.4s" }}>
                      {i < genStep ? "✓" : ""} {step}
                    </span>
                  ))}
                </div>
                <div style={{ height: "3px", borderRadius: "2px", background: "rgba(255,255,255,0.06)", marginTop: "8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "2px", background: "linear-gradient(135deg, #818cf8, var(--orange))", width: `${((genStep + 1) / GEN_STEPS.length) * 100}%`, transition: "width 0.5s" }} />
                </div>
              </div>
            )}
          </div>

          {/* Blog List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}><p style={{ color: "var(--text-secondary)" }}>Yükleniyor...</p></div>
          ) : posts.length === 0 ? (
            <div className="glass fade-up" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>✍️</div>
              <h3 style={{ marginBottom: "8px" }}>Henüz blog yazısı yok</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Anahtar kelime girip ilk yazınızı AI ile üretin.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {posts.map(post => {
                const sm = STATUS_META[post.status] || STATUS_META.DRAFT;
                const sc = getScoreColor(post.seoScore || 0);
                return (
                  <div key={post.id} className="glass fade-up" onClick={() => openEditor(post)} style={{ cursor: "pointer", overflow: "hidden", borderLeft: `3px solid ${sc}`, transition: "transform 0.15s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; }}>
                    <div style={{ display: "flex" }}>
                      {/* Featured Image with Logo Overlay */}
                      {post.featuredImage && (
                        <div style={{ width: "120px", minHeight: "80px", position: "relative", flexShrink: 0 }}>
                          <img src={post.featuredImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          {logoUrl && (
                            <img src={logoUrl} alt="logo" style={{ position: "absolute", bottom: "6px", right: "6px", width: "28px", height: "28px", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />
                          )}
                        </div>
                      )}
                      <div style={{ padding: "12px 16px", flex: 1 }}>
                        <h3 style={{ fontSize: "0.9rem", margin: "0 0 4px" }}>{post.title}</h3>
                        {post.excerpt && <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.4 }}>{post.excerpt}</p>}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: sm.bg, color: sm.color }}>{sm.label}</span>
                          <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", background: "rgba(129,140,248,0.1)", color: "#818cf8" }}>{post.targetKeyword}</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{post.wordCount} kelime</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{new Date(post.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", border: `3px solid ${sc}`, display: "flex", alignItems: "center", justifyContent: "center", background: `${sc}10` }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: sc }}>{post.seoScore || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      {selectedPost && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedPost(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)", width: "920px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* Featured Image with Logo */}
            {selectedPost.featuredImage && (
              <div style={{ position: "relative", width: "100%", height: "200px", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
                <img src={selectedPost.featuredImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {logoUrl && (
                  <img src={logoUrl} alt="logo" style={{ position: "absolute", bottom: "12px", right: "16px", width: "48px", height: "48px", objectFit: "contain", filter: "brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.5))", opacity: 0.85 }} />
                )}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.6))" }} />
              </div>
            )}

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700, fontFamily: "Inter", width: "100%", outline: "none" }} />
                <button onClick={() => setSelectedPost(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: "rgba(129,140,248,0.1)", color: "#818cf8" }}>{selectedPost.targetKeyword}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", padding: "2px 8px" }}>{selectedPost.wordCount} kelime · {selectedPost.readingTime} dk · /{selectedPost.slug}</span>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "16px 20px" }}>
              <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)} style={{ width: "100%", minHeight: "350px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "14px", color: "var(--text-primary)", fontSize: "0.82rem", fontFamily: "Inter", lineHeight: 1.8, resize: "vertical", outline: "none", whiteSpace: "pre-wrap" }} />
            </div>

            {/* Actions */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
              <button className="btn-primary" onClick={() => updatePost(selectedPost.id, { title: editingTitle, content: editingContent })} style={{ flex: 1, padding: "10px", fontSize: "0.85rem" }}>
                Kaydet
              </button>
              {selectedPost.status === "DRAFT" && (
                <button onClick={() => updatePost(selectedPost.id, { status: "PUBLISHED" })} style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "10px", padding: "10px 16px", color: "#34d399", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, fontFamily: "Inter" }}>
                  Yayınla
                </button>
              )}
              <button onClick={() => { if (confirm("Silmek istediğinize emin misiniz?")) deletePost(selectedPost.id); }} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 16px", color: "#ef4444", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, fontFamily: "Inter" }}>
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <span title={detail} style={{ fontSize: "0.65rem", fontWeight: 600, padding: "3px 8px", borderRadius: "4px", background: ok ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", color: ok ? "#34d399" : "#ef4444" }}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" };
