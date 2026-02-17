"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGuard({ children, allowedRoles }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.location.href = "/login";
      if (event === "SIGNED_IN") checkAuth();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    setUser(session.user);

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (prof) {
      setProfile(prof);
      // Check role access
      if (allowedRoles && !allowedRoles.includes(prof.role)) {
        // Redirect to their correct page
        switch (prof.role) {
          case "platform_owner": window.location.href = "/admin"; break;
          case "tm": window.location.href = "/dashboard"; break;
          case "company_admin":
          case "company_viewer": window.location.href = "/portal"; break;
          default: window.location.href = "/login";
        }
        return;
      }
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "16px" }}>{"\u{1F69B}"}</div>
          <p style={{ color: "#64748B", fontSize: "14px", fontWeight: 600 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Header component with user info and sign out
export function AuthHeader({ title, backHref, backLabel }) {
  const auth = useAuth();
  const initials = auth?.profile?.full_name
    ? auth.profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
      <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
        <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        {title && <span style={{ color: "#64748B", fontSize: "13px", marginLeft: "8px" }}>{"|"} {title}</span>}
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {backHref && (
          <a href={backHref} style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{"\u2190"} {backLabel || "Back"}</a>
        )}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              const menu = document.getElementById("user-menu");
              menu.style.display = menu.style.display === "none" ? "block" : "none";
            }}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{auth?.profile?.full_name || "User"}</span>
              <span style={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}>{auth?.profile?.role?.replace("_", " ") || ""}</span>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>{initials}</div>
          </button>
          <div id="user-menu" style={{ display: "none", position: "absolute", right: 0, top: "48px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "180px", zIndex: 200 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{auth?.profile?.full_name}</div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>{auth?.profile?.email}</div>
              <div style={{ fontSize: "10px", color: "#2563EB", fontWeight: 600, textTransform: "uppercase", marginTop: "4px" }}>{auth?.profile?.role?.replace("_", " ")}</div>
            </div>
            <button onClick={() => auth?.signOut()} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >{"\u{1F6AA}"} Sign Out</button>
          </div>
        </div>
      </div>
    </header>
  );
}
