"use client";
import { useEffect } from "react";
import { supabase, isSupabaseReady } from "../lib/supabase";

export default function HomePage() {
  useEffect(() => {
    if (!isSupabaseReady()) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile) { window.location.href = "/dashboard"; return; }
      switch (profile.role) {
        case "platform_owner": window.location.href = "/admin"; break;
        case "tm": window.location.href = "/dashboard"; break;
        case "company_admin":
        case "company_viewer": window.location.href = "/portal"; break;
        default: window.location.href = "/dashboard";
      }
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "16px" }}>{"\u{1F69B}"}</div>
        <h1 style={{ color: "white", fontSize: "28px", fontWeight: 800 }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></h1>
        <p style={{ color: "#94A3B8", fontSize: "14px", marginTop: "12px" }}>Redirecting...</p>
      </div>
    </div>
  );
}

