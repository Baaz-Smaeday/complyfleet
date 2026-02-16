"use client";
import { useState } from "react";

const SCREENS = [
  {
    title: "TM Dashboard",
    desc: "Main compliance dashboard — risk overview across all operators",
    href: "/dashboard",
    icon: "\u{1F4CA}",
    role: "Transport Manager",
    color: "#2563EB",
  },
  {
    title: "Driver Walkaround",
    desc: "Mobile-first daily check form — accessed via QR code or magic link",
    href: "/walkaround",
    icon: "\u{1F4CB}",
    role: "Driver",
    color: "#059669",
  },
  {
    title: "Defect Management",
    desc: "Track, assign and resolve defects across all companies",
    href: "/defects",
    icon: "\u26A0\uFE0F",
    role: "Transport Manager",
    color: "#DC2626",
  },
  {
    title: "Vehicle Compliance",
    desc: "MOT, PMI, insurance, tacho and service dates for every vehicle",
    href: "/vehicles",
    icon: "\u{1F69B}",
    role: "Transport Manager",
    color: "#D97706",
  },
  {
    title: "QR Codes",
    desc: "Generate permanent QR codes — print and stick in each vehicle cab",
    href: "/qr-codes",
    icon: "\u{1F4F1}",
    role: "Transport Manager",
    color: "#7C3AED",
  },
  {
    title: "Company Detail",
    desc: "Full operator profile — fleet, contacts, compliance, recent checks",
    href: "/company",
    icon: "\u{1F3E2}",
    role: "Transport Manager",
    color: "#4F46E5",
  },
  {
    title: "Walkaround Checks",
    desc: "View all driver checks across every company — filter, export, download PDFs",
    href: "/checks",
    icon: "\u{1F4CB}",
    role: "Transport Manager",
    color: "#059669",
  },
  {
    title: "Super Admin",
    desc: "Platform owner panel — TMs, billing, MRR, revenue analytics",
    href: "/admin",
    icon: "\u{1F6E1}\uFE0F",
    role: "Platform Owner",
    color: "#EF4444",
  },
  {
    title: "Company Portal",
    desc: "Operator login — fleet management, checks, defects for your company",
    href: "/portal",
    icon: "\u{1F465}",
    role: "Operator",
    color: "#7C3AED",
  },
];

const ROLE_COLORS = {
  "Transport Manager": { bg: "#EFF6FF", text: "#2563EB" },
  "Driver": { bg: "#ECFDF5", text: "#059669" },
  "Platform Owner": { bg: "#FEF2F2", text: "#DC2626" },
  "Operator": { bg: "#F5F3FF", text: "#7C3AED" },
};

export default function HomePage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "48px 24px", textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", marginBottom: "16px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px",
          }}>{"\u{1F69B}"}</div>
          <h1 style={{ color: "white", fontWeight: 800, fontSize: "32px", letterSpacing: "-0.03em", margin: 0 }}>
            Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
          </h1>
        </div>
        <p style={{ color: "#94A3B8", fontSize: "15px", margin: 0, maxWidth: "500px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
          DVSA Compliance Management Platform for UK Transport Managers
        </p>
        <div style={{
          marginTop: "16px", display: "inline-flex", padding: "6px 16px", borderRadius: "20px",
          background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
          fontSize: "12px", fontWeight: 700, color: "#FCD34D",
        }}>
          {"\u{1F6A7}"} PROTOTYPE — Testing Phase
        </div>
      </header>

      {/* Screen Grid */}
      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginBottom: "20px" }}>
          All Screens ({SCREENS.length})
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {SCREENS.map(screen => {
            const roleCfg = ROLE_COLORS[screen.role];
            return (
              <a key={screen.href} href={screen.href} style={{
                textDecoration: "none", color: "inherit",
                background: "#FFFFFF", borderRadius: "20px",
                border: "1px solid #E5E7EB", overflow: "hidden",
                transition: "all 0.2s ease", cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ height: "4px", background: screen.color }} />
                <div style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "14px",
                      background: screen.color + "15",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "24px",
                    }}>{screen.icon}</div>
                    <span style={{
                      padding: "3px 10px", borderRadius: "20px",
                      background: roleCfg.bg, color: roleCfg.text,
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.05em",
                    }}>{screen.role.toUpperCase()}</span>
                  </div>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A", margin: "0 0 6px 0" }}>{screen.title}</h3>
                  <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>{screen.desc}</p>
                  <div style={{
                    marginTop: "16px", fontSize: "12px", fontWeight: 700, color: screen.color,
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>
                    Open Screen {"\u2192"}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer info */}
        <div style={{
          marginTop: "32px", padding: "20px 24px", borderRadius: "16px",
          background: "#FFFBEB", border: "1px solid #FDE68A",
          display: "flex", alignItems: "flex-start", gap: "12px",
        }}>
          <span style={{ fontSize: "20px" }}>{"\u{1F4A1}"}</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#92400E" }}>This is a prototype</div>
            <div style={{ fontSize: "13px", color: "#B45309", marginTop: "4px", lineHeight: 1.5 }}>
              All screens use demo data. Nothing saves to a database yet. This is for testing the user experience
              and gathering feedback from your Transport Managers before going live with real data.
            </div>
          </div>
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "20px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Management Platform {"\u00B7"} {"\u00A9"} 2026
      </footer>
    </div>
  );
}
