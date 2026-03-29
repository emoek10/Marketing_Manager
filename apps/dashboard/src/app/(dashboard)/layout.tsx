import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: "230px",
          padding: "2rem 2.5rem",
          background: "var(--navy)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
