"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; icon: string; disabled: boolean; badge?: string }[] = [
  { href: "/dashboard",           label: "Genel Bakış",      icon: "📊", disabled: false },
  { href: "/dashboard/calendar",  label: "İçerik Takvimi",   icon: "📅", disabled: false },
  { href: "/dashboard/campaigns", label: "Kampanyalar",      icon: "🎯", disabled: false },
  { href: "/dashboard/brand",     label: "Marka Profili",    icon: "🎨", disabled: false },
  { href: "/dashboard/analytics", label: "Analitik",         icon: "📈", disabled: false },
  { href: "/dashboard/seo",       label: "SEO & Blog",       icon: "🔍", disabled: false },
  { href: "/dashboard/settings",  label: "Ayarlar",          icon: "⚙️", disabled: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "230px",
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1rem",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2rem", paddingLeft: "4px" }}>
        <div
          style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #f4841e, #e06b0c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", flexShrink: 0,
          }}
        >
          🚀
        </div>
        <div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>Agency OS</div>
          <div style={{ fontSize: "0.65rem", color: "var(--orange)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            NevoraMedia
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="nav-item"
                style={{ opacity: 0.45, cursor: "not-allowed", position: "relative" }}
              >
                <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      background: "rgba(244,132,30,0.15)",
                      color: "var(--orange)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}>
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <div
          style={{
            background: "rgba(244,132,30,0.08)",
            border: "1px solid rgba(244,132,30,0.2)",
            borderRadius: "10px",
            padding: "12px",
          }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--orange)", marginBottom: "4px" }}>⚡ Pro Plan</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Sınırsız içerik & Canva entegrasyonu</div>
        </div>
      </div>
    </aside>
  );
}
