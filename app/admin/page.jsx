a"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

/* ===== V5.1 ADMIN — FIXED: No role dropdown, clickable stat cards ===== */
const VERSION = "v5.11";
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
function daysLeft(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); }

const PLANS = {
  tm: { price: 49, label: "TM Plan", maxCompanies: 6, maxVehicles: 60, color: "#2563EB" },
  company: { price: 29, label: "Company Plan", maxCompanies: 1, maxVehicles: 999, color: "#059669" },
};

function GlowCard({ children, color = "59,130,246", style = {}, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ position: "relative", borderRadius: "18px", cursor: onClick ? "pointer" : "default", ...style }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}>
      <div style={{ position: "absolute", inset: "-2px", borderRadius: "20px", zIndex: 0, pointerEvents: "none",
        background: h ? `conic-gradient(from var(--angle), transparent 0%, rgba(${color},0.85) 20%, rgba(${color},0.3) 40%, transparent 60%, rgba(${color},0.6) 80%, transparent 100%)` : "transparent",
        animation: h ? "spin 2s linear infinite" : "none" }} />
      <div style={{ position: "relative", zIndex: 1, borderRadius: "16px", background: "#FFF", height: "100%", overflow: "hidden",
        transform: h ? "translateY(-3px)" : "none",
        boxShadow: h ? `0 16px 40px rgba(${color},0.2), 0 4px 12px rgba(0,0,0,0.06)` : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease" }}>
        {children}
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("overview");
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tmCompanyLinks, setTmCompanyLinks] = useState([]);
  const [showInviteTM, setShowInviteTM] = useState(false);
  const [showInviteStaff, setShowInviteStaff] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [staffForm, setStaffForm] = useState({ email: "", full_name: "", password: "", can_manage_tms: true, can_manage_companies: true, can_view_revenue: false, can_delete: false });
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", password: "" });
  const [companyForm, setCompanyForm] = useState({ name: "", operator_licence: "", contact_email: "", contact_phone: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkCompany, setShowLinkCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedTM, setSelectedTM] = useState(null);
  const [userFilter, setUserFilter] = useState("all");
  const [linkToTM, setLinkToTM] = useState("");

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };
  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" };

  useEffect(() => {
    if (!isSupabaseReady()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
        if (data) { setProfile(data); if (data.role !== "platform_owner") window.location.href = "/dashboard"; }
      });
    });
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [pRes, cRes, vRes, dRes, chRes, tcRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("companies").select("*").order("name"),
      supabase.from("vehicles").select("*").is("archived_at", null),
      supabase.from("defects").select("*").order("reported_date", { ascending: false }),
      supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }),
      supabase.from("tm_companies").select("*"),
    ]);
    setProfiles(pRes.data || []); setCompanies(cRes.data || []); setVehicles(vRes.data || []);
    setDefects(dRes.data || []); setChecks(chRes.data || []); setTmCompanyLinks(tcRes.data || []);
    setLoading(false);
  }

  async function createTMAccount() {
    setInviteLoading(true); setInviteMsg("");
    const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    const { data, error } = await supabase.auth.signUp({ email: inviteForm.email, password: inviteForm.password, options: { data: { full_name: inviteForm.full_name, role: "tm" } } });
    if (error) { setInviteMsg("Error: " + error.message); setInviteLoading(false); return; }
    if (data?.user) {
      await supabase.from("profiles").update({ trial_ends_at: trialEnd, subscription_status: "trial" }).eq("id", data.user.id);
    }
    flash("TM created with 7-day free trial");
    setShowInviteTM(false); setInviteForm({ email: "", full_name: "", password: "" }); setInviteLoading(false);
    setTimeout(() => loadData(), 1500);
  }

  async function createCompany() {
    setInviteLoading(true); setInviteMsg("");
    const { data: newCo, error } = await supabase.from("companies").insert({ ...companyForm, licence_status: "Valid" }).select().single();
    if (error) { setInviteMsg("Error: " + error.message); setInviteLoading(false); return; }
    if (newCo && linkToTM) {
      await supabase.from("tm_companies").insert({ tm_id: linkToTM, company_id: newCo.id });
    }
    flash("Company created" + (linkToTM ? " & linked to TM" : ""));
    setShowCreateCompany(false); setCompanyForm({ name: "", operator_licence: "", contact_email: "", contact_phone: "" }); setLinkToTM(""); setInviteLoading(false);
    loadData();
  }

  // ✅ FIXED: No role change — TM is the only role now
  async function deleteUser(uid, e) { if (!confirm("Remove " + e + "?")) return; await supabase.from("tm_companies").delete().eq("tm_id", uid); await supabase.from("profiles").delete().eq("id", uid); flash("Removed"); loadData(); }
  async function linkCompanyToTM(tid, cid) { await supabase.from("tm_companies").insert({ tm_id: tid, company_id: cid }); flash("Linked"); setShowLinkCompany(null); loadData(); }
  async function unlinkCompany(tid, cid) { await supabase.from("tm_companies").delete().match({ tm_id: tid, company_id: cid }); flash("Unlinked"); loadData(); }
  async function activateUser(uid) { await supabase.from("profiles").update({ subscription_status: "active", trial_ends_at: null }).eq("id", uid); flash("Activated"); loadData(); }
  async function expireUser(uid) { await supabase.from("profiles").update({ subscription_status: "expired" }).eq("id", uid); flash("Expired"); loadData(); }
  async function setCompanyStatus(cid, status) {
    await supabase.from("companies").update({ status }).eq("id", cid);
    flash("Company → " + status);
    // Update selectedCompany immediately so buttons reflect new state without waiting for loadData
    setSelectedCompany(prev => prev && prev.id === cid ? { ...prev, status } : prev);
    loadData();
  }
  async function createStaff(e) {
    e.preventDefault();
    const { email, full_name, password, can_manage_tms, can_manage_companies, can_view_revenue, can_delete } = staffForm;
    if (!email || !full_name) { flash("Please fill name and email", "error"); return; }
    // Check if user already exists in profiles
    const { data: existing } = await supabase.from("profiles").select("id, role").eq("email", email).single();
    if (existing) {
      // User exists — just update their role and permissions
      await supabase.from("profiles").update({
        full_name, role: "staff",
        can_manage_tms, can_manage_companies, can_view_revenue, can_delete
      }).eq("id", existing.id);
      flash("Existing user promoted to Staff!");
    } else {
      // New user — create auth account
      if (!password) { flash("Password required for new users", "error"); return; }
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });
      if (authErr) { flash("Error: " + authErr.message, "error"); return; }
      await supabase.from("profiles").update({
        full_name, role: "staff",
        can_manage_tms, can_manage_companies, can_view_revenue, can_delete
      }).eq("id", authData.user.id);
      flash("New staff member created!");
    }
    setShowInviteStaff(false);
    setStaffForm({ email: "", full_name: "", password: "", can_manage_tms: true, can_manage_companies: true, can_view_revenue: false, can_delete: false });
    loadData();
  }
  async function toggleUserActive(uid, currentlyActive) {
    const newStatus = currentlyActive ? "inactive" : "active";
    await supabase.from("profiles").update({ account_status: newStatus }).eq("id", uid);
    flash(currentlyActive ? "User deactivated" : "User activated");
    loadData();
  }
  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { flash("Error: " + error.message, "error"); return; }
    flash("Password reset email sent to " + email);
  }
  async function setTMStatus(tid, status) {
    await supabase.from("profiles").update({ account_status: status }).eq("id", tid);
    flash("TM → " + status);
    // Update selectedTM immediately so buttons reflect new state
    setSelectedTM(prev => prev && prev.id === tid ? { ...prev, account_status: status } : prev);
    loadData();
  }

  const tms = profiles.filter(p => p.role === "tm");
  const openDefects = defects.filter(d => d.status === "open" || d.status === "in_progress").length;
  const dangerousDefects = defects.filter(d => d.severity === "dangerous" && d.status !== "closed").length;
  const trialTMs = tms.filter(t => t.subscription_status === "trial");
  const activeTMs = tms.filter(t => (t.subscription_status || "active") === "active");
  const mrrNow = activeTMs.length * PLANS.tm.price;

  function getLinkedCompanies(tid) { return companies.filter(c => tmCompanyLinks.some(l => l.tm_id === tid && l.company_id === c.id)); }
  function getUnlinkedCompanies(tid) { const ids = tmCompanyLinks.filter(l => l.tm_id === tid).map(l => l.company_id); return companies.filter(c => !ids.includes(c.id)); }
  function getCompanyVehicles(cid) { return vehicles.filter(v => v.company_id === cid); }
  function getCompanyDefects(cid) { return defects.filter(d => d.company_id === cid); }

  function getTrialBadge(p) {
    const s = p.subscription_status || "active";
    if (s === "active") return { label: "ACTIVE", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" };
    if (s === "expired") return { label: "EXPIRED", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
    const d = daysLeft(p.trial_ends_at);
    if (d !== null && d <= 0) return { label: "TRIAL EXPIRED", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
    return { label: "TRIAL • " + d + "d left", bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
  }

  function initials(name) { return name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "??"; }

  // ✅ Reusable clickable stat card
  function StatCard({ icon, value, label, accent, onClick, tooltip }) {
    const [hovered, setHovered] = useState(false);
    return (
      <div
        onClick={onClick}
        title={tooltip}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered && onClick ? accent + "08" : "#FFF",
          borderRadius: "14px",
          padding: "16px 20px",
          border: hovered && onClick ? `2px solid ${accent}` : "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.15s",
          transform: hovered && onClick ? "translateY(-2px)" : "none",
          boxShadow: hovered && onClick ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{icon}</div>
        <div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{label}</div>
          {onClick && <div style={{ fontSize: "9px", color: accent, fontWeight: 700, marginTop: "2px", opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>CLICK TO VIEW →</div>}
        </div>
      </div>
    );
  }

  const filteredTMs = (() => { const tmOnly = profiles.filter(p => p.role === "tm"); if (userFilter === "all") return tmOnly; if (userFilter === "trial") return tmOnly.filter(p => p.subscription_status === "trial"); if (userFilter === "active") return tmOnly.filter(p => p.subscription_status === "active"); if (userFilter === "expired") return tmOnly.filter(p => p.subscription_status === "expired"); return tmOnly; })();

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }
        .row-hover:hover { background: #F8FAFC !important; border-color: #3B82F6 !important; }
      `}</style>

      {/* HEADER */}
      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          </a>
          <span style={{ padding: "3px 8px", borderRadius: "6px", background: "rgba(239,68,68,0.2)", color: "#FCA5A5", fontSize: "9px", fontWeight: 700 }}>ADMIN {VERSION}</span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          {[
            { k: "overview", l: "Overview" },
            { k: "revenue", l: "💰 Revenue" },
            { k: "staff", l: "👥 Staff" },
            { k: "tms", l: "🚛 TMs" },
            { k: "companies", l: "🏢 Companies" },
            { k: "users", l: "👤 Users" },
          ].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k); setSelectedCompany(null); setSelectedTM(null); }}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: tab === t.k ? "rgba(255,255,255,0.15)" : "none", color: tab === t.k ? "white" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
          <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
          <div onClick={() => setShowUserMenu(!showUserMenu)} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #EF4444, #DC2626)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>{initials(profile?.full_name)}</div>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "48px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "200px", zIndex: 200 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{profile?.full_name}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>{profile?.email}</div>
              </div>
              <a href="/dashboard" style={{ display: "block", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none", borderRadius: "8px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>Dashboard</a>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
                style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }}>Sign Out</button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> : (<>

        {/* ===== OVERVIEW ===== */}
        {tab === "overview" && !selectedCompany && !selectedTM && (<>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", margin: 0 }}>🛠️ Platform Overview</h1>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Real-time platform metrics — click any card to drill down</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🏢 + Company</button>
              <button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🚛 + TM</button>
            </div>
          </div>

          {/* 6 KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { icon: "🚛", value: tms.length, label: "Transport Managers", sub: trialTMs.length > 0 ? trialTMs.length + " on trial" : "All active", subColor: trialTMs.length > 0 ? "#D97706" : "#059669", accent: "#2563EB", bg: "#EFF6FF", onClick: () => setTab("tms") },
              { icon: "🏢", value: companies.length, label: "Companies", sub: companies.filter(c => tmCompanyLinks.filter(l => l.company_id === c.id).length === 0).length + " need TM", subColor: "#DC2626", accent: "#0F172A", bg: "#F8FAFC", onClick: () => setTab("companies") },
              { icon: "💰", value: "£" + mrrNow, label: "Monthly Revenue", sub: "£" + (mrrNow * 12).toLocaleString() + " ARR", subColor: "#059669", accent: "#0891B2", bg: "#ECFEFF", onClick: () => setTab("revenue") },
              { icon: "🚗", value: vehicles.length, label: "Active Vehicles", sub: vehicles.filter(v => v.status === "active").length + " compliant", subColor: "#059669", accent: "#059669", bg: "#ECFDF5", onClick: () => { window.location.href = "/vehicles"; } },
              { icon: "⚠️", value: openDefects, label: "Open Defects", sub: dangerousDefects + " dangerous", subColor: dangerousDefects > 0 ? "#DC2626" : "#6B7280", accent: "#DC2626", bg: "#FEF2F2", onClick: () => { window.location.href = "/defects"; } },
              { icon: "📋", value: checks.length, label: "Total Checks", sub: checks.filter(c => c.result === "pass").length + " passed", subColor: "#059669", accent: "#7C3AED", bg: "#F5F3FF", onClick: () => { window.location.href = "/checks"; } },
            ].map(s => (
              <div key={s.label} onClick={s.onClick}
                style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "16px" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 16px 40px ${s.accent}30`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "3px", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: "11px", color: s.subColor, marginTop: "2px", fontWeight: 600 }}>{s.sub}</div>
                </div>
                <span style={{ color: "#CBD5E1", fontSize: "18px" }}>→</span>
              </div>
            ))}
          </div>

          {/* Alert banners */}
          {dangerousDefects > 0 && (
            <div onClick={() => { window.location.href = "/defects"; }}
              style={{ padding: "14px 20px", borderRadius: "14px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}>
              <span style={{ fontSize: "22px" }}>🚨</span>
              <div style={{ flex: 1, fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{dangerousDefects} dangerous defect{dangerousDefects > 1 ? "s" : ""} — requires immediate attention</div>
              <span style={{ color: "#DC2626", fontSize: "12px", fontWeight: 700 }}>View →</span>
            </div>
          )}
          {trialTMs.length > 0 && (
            <div style={{ padding: "14px 20px", borderRadius: "14px", background: "#FFFBEB", border: "2px solid #FDE68A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "22px" }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#92400E" }}>{trialTMs.length} TM{trialTMs.length > 1 ? "s" : ""} on 7-day free trial</div>
                <div style={{ fontSize: "12px", color: "#B45309", marginTop: "2px" }}>{trialTMs.map(t => (t.full_name || t.email) + " (" + daysLeft(t.trial_ends_at) + "d left)").join(", ")}</div>
              </div>
              <button onClick={() => { setTab("tms"); setUserFilter("trial"); }}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #FDE68A", background: "#FFF", fontSize: "11px", fontWeight: 700, color: "#92400E", cursor: "pointer", fontFamily: "inherit" }}>Manage →</button>
            </div>
          )}

          {/* Bottom split — TMs + Recent Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>

            {/* TM cards mini */}
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "20px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>🚛 Transport Managers</h2>
                <button onClick={() => setTab("tms")} style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "none", fontSize: "11px", fontWeight: 600, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>View all →</button>
              </div>
              {tms.slice(0, 4).map(tm => {
                const linked = getLinkedCompanies(tm.id);
                const badge = getTrialBadge(tm);
                const borderCol = tm.subscription_status === "expired" ? "#EF4444" : tm.subscription_status === "trial" ? "#F59E0B" : "#10B981";
                return (
                  <div key={tm.id} onClick={() => setSelectedTM(tm)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: "1px solid #F1F5F9", borderLeft: "3px solid " + borderCol, marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "11px", flexShrink: 0 }}>{initials(tm.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tm.full_name || "No name"}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{linked.length}/6 companies · {getLinkedCompanies(tm.id).flatMap(c => getCompanyVehicles(c.id)).length} vehicles</div>
                    </div>
                    <span style={{ padding: "2px 7px", borderRadius: "6px", background: badge.bg, color: badge.color, fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>
                  </div>
                );
              })}
              {tms.length > 4 && <p style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", margin: "8px 0 0" }}>+{tms.length - 4} more TMs</p>}
            </div>

            {/* Recent activity */}
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "20px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>📅 Recent Checks</h2>
                <button onClick={() => { window.location.href = "/checks"; }} style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "none", fontSize: "11px", fontWeight: 600, color: "#7C3AED", cursor: "pointer", fontFamily: "inherit" }}>View all →</button>
              </div>
              {checks.slice(0, 6).map(ch => (
                <div key={ch.id} onClick={() => { window.location.href = "/checks"; }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "#F8FAFC", marginBottom: "6px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"} onMouseLeave={e => e.currentTarget.style.background = "#F8FAFC"}>
                  <span style={{ fontSize: "16px" }}>{ch.result === "pass" ? "✅" : "⚠️"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.driver_name || "Unknown driver"} · {ch.vehicle_reg}</div>
                    <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatDate(ch.completed_at)}</div>
                  </div>
                  <span style={{ padding: "2px 7px", borderRadius: "6px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", color: ch.result === "pass" ? "#059669" : "#DC2626", fontSize: "9px", fontWeight: 700 }}>{ch.result?.toUpperCase() || "—"}</span>
                </div>
              ))}
              {checks.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px", color: "#94A3B8" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                  <p style={{ fontSize: "12px", fontWeight: 600 }}>No checks yet</p>
                </div>
              )}
            </div>
          </div>
        </>)}

        {/* ===== COMPANY DETAIL (overview tab only — companies tab has its own below) ===== */}
        {tab === "overview" && selectedCompany && !selectedTM && (() => {
          const c = selectedCompany;
          const cv = getCompanyVehicles(c.id);
          const cd = getCompanyDefects(c.id);
          const openD = cd.filter(d => d.status === "open" || d.status === "in_progress");
          const companyChecks = checks.filter(x => x.company_id === c.id);
          const linkedTMNames = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => profiles.find(p => p.id === l.tm_id)).filter(Boolean);
          return (<>
            <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>← Back</button>
            <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "4px" }}>🏢 {c.name}</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>
              {c.operator_licence && <span>{c.operator_licence} · </span>}
              {linkedTMNames.length > 0 ? <span style={{ color: "#2563EB", fontWeight: 600 }}>TM: {linkedTMNames.map(t => t.full_name).join(", ")}</span> : <span style={{ color: "#DC2626", fontWeight: 600 }}>⚠ No TM assigned</span>}
            </p>

            {/* ✅ FIXED: Company detail stat cards are clickable */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <StatCard icon="🚛" value={cv.length} label="Vehicles" accent="#059669" onClick={() => { window.location.href = "/vehicles"; }} tooltip="Click to view vehicles" />
              <StatCard icon="⚠️" value={openD.length} label="Open Defects" accent="#DC2626" onClick={() => { window.location.href = "/defects"; }} tooltip="Click to view defects" />
              <StatCard icon="📋" value={companyChecks.length} label="Checks" accent="#7C3AED" onClick={() => { window.location.href = "/checks?company=" + c.id; }} tooltip="Click to view checks" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Vehicles ({cv.length})</h2>
                {cv.map(v => (
                  <div key={v.id} onClick={() => { window.location.href = "/vehicles"; }} className="row-hover"
                    style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{v.reg}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div>
                  </div>
                ))}
                {cv.length === 0 && <p style={{ color: "#94A3B8" }}>No vehicles</p>}
              </div>
              <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Defects ({cd.length})</h2>
                {cd.slice(0, 10).map(d => (
                  <div key={d.id} onClick={() => { window.location.href = "/defects"; }} className="row-hover"
                    style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", background: d.severity === "dangerous" ? "#FEF2F2" : "", transition: "all 0.15s" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700 }}>{d.description || d.title}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg} · {d.severity}</div>
                  </div>
                ))}
                {cd.length === 0 && <p style={{ color: "#10B981" }}>✅ Clean — no defects</p>}
              </div>
            </div>
          </>);
        })()}

        {/* ===== TM DETAIL ===== */}
        {selectedTM && !selectedCompany && (() => {
          const tm = selectedTM;
          const linked = getLinkedCompanies(tm.id);
          const unlinked = getUnlinkedCompanies(tm.id);
          const badge = getTrialBadge(tm);
          const tmVehicles = linked.flatMap(c => getCompanyVehicles(c.id));
          const tmChecks = linked.flatMap(c => checks.filter(x => x.company_id === c.id));
          const tmAccStatus = tm.account_status || "active";
          const tmStatusCfg = {
            active: { label: "ACTIVE", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
            inactive: { label: "INACTIVE", bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
            demo: { label: "DEMO", bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
          };
          return (<>
            <button onClick={() => setSelectedTM(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px" }}>{initials(tm.full_name)}</div>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800 }}>{tm.full_name}</h1>
                <p style={{ fontSize: "13px", color: "#64748B" }}>{tm.email} · Joined {formatDate(tm.created_at)}</p>
              </div>
              <span style={{ padding: "4px 12px", borderRadius: "8px", background: badge.bg, border: "1px solid " + badge.border, color: badge.color, fontSize: "11px", fontWeight: 700 }}>{badge.label}</span>
              <span style={{ padding: "4px 12px", borderRadius: "8px", background: "#2563EB15", color: "#2563EB", fontSize: "11px", fontWeight: 700 }}>TM Plan · £49/mo</span>
              <span style={{ padding: "4px 12px", borderRadius: "8px", background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#2563EB", fontSize: "11px", fontWeight: 700 }}>TM</span>
              {tm.subscription_status === "trial" && <button onClick={() => activateUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>✅ Activate</button>}
              {tm.subscription_status === "expired" && <button onClick={() => activateUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>✅ Reactivate</button>}
              {(tm.subscription_status === "active" || tm.subscription_status === "trial") && <button onClick={() => expireUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>⏸ Expire</button>}
            </div>

            {/* ✅ NEW: TM Account Status buttons — Active / Inactive / Demo */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", padding: "14px 18px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E5E7EB", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginRight: "4px" }}>Account status:</span>
              {["active", "inactive", "demo"].map(s => {
                const sCfg = tmStatusCfg[s];
                const isSel = tmAccStatus === s;
                return (
                  <button key={s} onClick={() => setTMStatus(tm.id, s)}
                    style={{ padding: "6px 16px", borderRadius: "20px", border: "1px solid " + (isSel ? sCfg.border : "#E5E7EB"), background: isSel ? sCfg.bg : "#FFF", color: isSel ? sCfg.color : "#6B7280", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                    {isSel ? "● " : "○ "}{s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
              <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "4px" }}>
                {tmAccStatus === "demo" ? "Demo TM shows prospects the platform — never billed" : tmAccStatus === "inactive" ? "Inactive TM cannot access dashboard" : "Active TM with full platform access"}
              </span>
            </div>

            {/* ✅ FIXED: TM detail stat cards are now all clickable */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <StatCard icon="🏢" value={linked.length + "/6"} label="Companies" accent="#0F172A" onClick={() => setTab("companies")} tooltip="Click to view all companies" />
              <StatCard icon="🚛" value={tmVehicles.length + "/60"} label="Vehicles" accent="#059669" onClick={() => { window.location.href = "/vehicles"; }} tooltip="Click to view vehicles" />
              <StatCard icon="💰" value="£49" label="Per Month" accent="#2563EB" onClick={() => setTab("revenue")} tooltip="Click to view revenue" />
              <StatCard icon="📋" value={tmChecks.length} label="Checks" accent="#7C3AED" onClick={() => { window.location.href = "/checks"; }} tooltip="Click to view checks" />
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800 }}>🔗 Linked Companies ({linked.length}/6)</h2>
                {unlinked.length > 0 && linked.length < 6 && (
                  <button onClick={() => setShowLinkCompany(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>+ Link</button>
                )}
              </div>
              {linked.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <span>🏢</span>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelectedCompany(c); setSelectedTM(null); }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#2563EB" }}>{c.name}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{getCompanyVehicles(c.id).length} vehicles</div>
                  </div>
                  <button onClick={() => unlinkCompany(tm.id, c.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "10px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Unlink</button>
                </div>
              ))}
              {linked.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px" }}>No companies linked yet</p>}
            </div>
          </>);
        })()}

        {/* ===== REVENUE ===== */}
        {/* ===== STAFF TAB ===== */}
        {tab === "staff" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 800 }}>👥 Admin Staff</h1>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Internal team members with controlled platform access</p>
            </div>
            <button onClick={() => setShowInviteStaff(true)}
              style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#7C3AED", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              + Add Staff Member
            </button>
          </div>

          {/* Permission explanation */}
          <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
            <p style={{ fontSize: "13px", color: "#5B21B6", fontWeight: 600, margin: 0 }}>
              🔐 Staff members see a restricted admin view. You control exactly what each person can access.
            </p>
          </div>

          {/* Staff list — empty state for now */}
          <div style={{ background: "#FFF", borderRadius: "16px", border: "2px dashed #E5E7EB", padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>No staff members yet</h2>
            <p style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "24px" }}>Add your first team member and control what they can access</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", maxWidth: "500px", margin: "0 auto 24px", textAlign: "left" }}>
              {[
                { icon: "🚛", label: "Manage TMs", desc: "View, activate, deactivate TM accounts" },
                { icon: "🏢", label: "Manage Companies", desc: "View, edit company status" },
                { icon: "💰", label: "View Revenue", desc: "See billing and subscription data" },
                { icon: "🗑️", label: "Delete Records", desc: "Remove TMs, companies, vehicles" },
              ].map(p => (
                <div key={p.label} style={{ padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#F8FAFC" }}>
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{p.icon}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A" }}>{p.label}</div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>{p.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowInviteStaff(true)}
              style={{ padding: "10px 24px", borderRadius: "10px", border: "none", background: "#7C3AED", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              + Add First Staff Member
            </button>
          </div>
        </>)}

        {tab === "revenue" && (<>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>💰 Revenue & Billing</h1>
              <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Platform-wide subscription and revenue overview</p>
            </div>
          </div>

          {/* 4 KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "💰", label: "Monthly Revenue", value: "£" + mrrNow, sub: "from paying TMs", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", onClick: () => {} },
              { icon: "📈", label: "Annual Revenue", value: "£" + (mrrNow * 12).toLocaleString(), sub: "projected ARR", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", onClick: () => {} },
              { icon: "✅", label: "Paying TMs", value: activeTMs.length, sub: "active subscriptions", color: "#0F172A", bg: "#F8FAFC", border: "#E5E7EB", onClick: () => { setTab("tms"); setUserFilter("active"); } },
              { icon: "⏳", label: "On Trial", value: trialTMs.length, sub: "7-day free trial", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", onClick: () => { setTab("tms"); setUserFilter("trial"); } },
            ].map(s => (
              <div key={s.label} onClick={s.onClick}
                style={{ background: "#FFF", borderRadius: "16px", padding: "20px", border: "1px solid " + s.border, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = s.bg; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#FFF"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginTop: "4px" }}>{s.label}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            {/* TM billing cards */}
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "16px" }}>💳 TM Billing Status</h2>
              {tms.map(tm => {
                const badge = getTrialBadge(tm);
                const isPaying = (tm.subscription_status || "active") === "active";
                const isExpired = tm.subscription_status === "expired";
                const linked = getLinkedCompanies(tm.id);
                const borderCol = isPaying ? "#10B981" : isExpired ? "#EF4444" : "#F59E0B";
                return (
                  <div key={tm.id} onClick={() => setSelectedTM(tm)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #F1F5F9", borderLeft: "3px solid " + borderCol, marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "12px", flexShrink: 0 }}>{initials(tm.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tm.full_name}</div>
                      <div style={{ fontSize: "11px", color: "#94A3B8" }}>{linked.length} companies · joined {formatDate(tm.created_at)}</div>
                    </div>
                    <span style={{ padding: "3px 8px", borderRadius: "6px", background: badge.bg, border: "1px solid " + badge.border, color: badge.color, fontSize: "9px", fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: isPaying ? "#059669" : "#94A3B8", flexShrink: 0 }}>{isPaying ? "£49" : "£0"}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "12px", background: "#F8FAFC", border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>Total MRR</span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#059669" }}>£{mrrNow}/mo</span>
              </div>
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Launch Pricing</h2>
              <div style={{ padding: "20px", borderRadius: "14px", border: "2px solid #2563EB30", background: "#2563EB08", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#2563EB" }}>👤 TM Plan</span>
                  <span style={{ fontSize: "26px", fontWeight: 800 }}>£49<span style={{ fontSize: "12px", color: "#6B7280" }}>/mo</span></span>
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "6px" }}>Up to 6 companies · 60 vehicles · 7-day free trial</div>
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#374151" }}>✅ Full dashboard • ✅ QR walkarounds • ✅ Defect tracking • ✅ PDF exports</div>
              </div>
              <div style={{ padding: "20px", borderRadius: "14px", border: "2px solid #05966930", background: "#05966908" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#059669" }}>🏢 Company Plan</span>
                  <span style={{ fontSize: "26px", fontWeight: 800 }}>£29<span style={{ fontSize: "12px", color: "#6B7280" }}>/mo</span></span>
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "6px" }}>1 company · Unlimited vehicles · 7-day free trial</div>
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#374151" }}>✅ Driver QR checks • ✅ Defect management • ✅ Compliance dates • ✅ Data flows to TM</div>
              </div>
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "#F1F5F9" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}>Potential per TM relationship:</div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669", marginTop: "4px" }}>£49 + (6 × £29) = £223/mo</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>12-Month Growth Projection</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { m: "Now", tms: activeTMs.length, mrr: mrrNow, p: 20 },
                { m: "Month 3", tms: Math.max(activeTMs.length * 2, 5), mrr: Math.max(activeTMs.length * 2, 5) * 49, p: 35 },
                { m: "Month 6", tms: Math.max(activeTMs.length * 4, 15), mrr: Math.max(activeTMs.length * 4, 15) * 49, p: 55 },
                { m: "Month 12", tms: Math.max(activeTMs.length * 8, 40), mrr: Math.max(activeTMs.length * 8, 40) * 49, p: 100 },
              ].map(r => (
                <div key={r.m}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>{r.m}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>£{r.mrr.toLocaleString()}/mo · {r.tms} TMs</span>
                  </div>
                  <div style={{ height: "18px", borderRadius: "9px", background: "#F3F4F6", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: r.p + "%", borderRadius: "9px", background: "linear-gradient(135deg, #059669, #10B981)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ===== TMs TAB ===== */}
        {tab === "tms" && (() => {
          const activeTMList = tms.filter(p => p.subscription_status === "active");
          const trialTMList = tms.filter(p => p.subscription_status === "trial");
          const expiredTMList = tms.filter(p => p.subscription_status === "expired");
          const filteredList = userFilter === "active" ? activeTMList : userFilter === "trial" ? trialTMList : userFilter === "expired" ? expiredTMList : tms;
          return (<>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>🚛 Transport Managers</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{tms.length} TMs across the platform</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🏢 + Company</button>
                <button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#2563EB", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🚛 + TM</button>
              </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Active", count: activeTMList.length, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "✅", filter: "active" },
                { label: "On Trial", count: trialTMList.length, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", filter: "trial" },
                { label: "Expired", count: expiredTMList.length, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "❌", filter: "expired" },
              ].map(s => (
                <div key={s.filter} onClick={() => setUserFilter(userFilter === s.filter ? "all" : s.filter)}
                  style={{ background: userFilter === s.filter ? s.bg : "#FFF", border: "1px solid " + (userFilter === s.filter ? s.border : "#E5E7EB"), borderRadius: "14px", padding: "16px 20px", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "12px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = userFilter === s.filter ? s.border : "#E5E7EB"; e.currentTarget.style.transform = "none"; }}>
                  <span style={{ fontSize: "24px" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter label */}
            {userFilter !== "all" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", color: "#64748B" }}>Filtered by: <strong>{userFilter}</strong></span>
                <button onClick={() => setUserFilter("all")} style={{ fontSize: "11px", color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕ Clear</button>
              </div>
            )}

            {/* TM Cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
              {filteredList.map(p => {
                const linked = getLinkedCompanies(p.id);
                const badge = getTrialBadge(p);
                const tmVehicles = linked.flatMap(c => getCompanyVehicles(c.id));
                const tmDefects = linked.flatMap(c => getCompanyDefects(c.id)).filter(d => d.status === "open");
                const accStatus = p.account_status || "active";
                const borderColor = accStatus === "demo" ? "#3B82F6" : accStatus === "inactive" ? "#9CA3AF" : p.subscription_status === "expired" ? "#EF4444" : p.subscription_status === "trial" ? "#F59E0B" : "#10B981";
                return (
                  <GlowCard key={p.id} onClick={() => setSelectedTM(p)}
                    color={p.subscription_status === "expired" ? "239,68,68" : p.subscription_status === "trial" ? "245,158,11" : "16,185,129"}
                    style={{ marginBottom: "0" }}>
                    <div style={{ borderLeft: "4px solid " + borderColor, padding: "18px 20px", position: "relative" }}>

                    {/* Subscription badge top right */}
                    <span style={{ position: "absolute", top: "14px", right: "14px", padding: "3px 8px", borderRadius: "10px", background: badge.bg, border: "1px solid " + badge.border, color: badge.color, fontSize: "9px", fontWeight: 700 }}>{badge.label}</span>

                    {/* Avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingRight: "80px" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "15px", flexShrink: 0 }}>{initials(p.full_name)}</div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{p.full_name || "No name"}</div>
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{p.email}</div>
                      </div>
                    </div>

                    {/* Joined + plan */}
                    <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#EFF6FF", color: "#2563EB", fontSize: "11px", fontWeight: 600 }}>💰 £49/mo</span>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F8FAFC", color: "#64748B", fontSize: "11px", fontWeight: 600 }}>📅 {formatDate(p.created_at)}</span>
                      {accStatus !== "active" && (
                        <span style={{ padding: "3px 10px", borderRadius: "20px", background: accStatus === "demo" ? "#EFF6FF" : "#F3F4F6", color: accStatus === "demo" ? "#2563EB" : "#6B7280", fontSize: "11px", fontWeight: 700 }}>{accStatus.toUpperCase()}</span>
                      )}
                    </div>

                    {/* Companies */}
                    <div style={{ marginBottom: "14px" }}>
                      {linked.length > 0
                        ? <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {linked.slice(0, 3).map(c => (
                              <span key={c.id} style={{ padding: "3px 8px", borderRadius: "20px", background: "#F1F5F9", color: "#475569", fontSize: "10px", fontWeight: 600 }}>🏢 {c.name}</span>
                            ))}
                            {linked.length > 3 && <span style={{ padding: "3px 8px", borderRadius: "20px", background: "#F1F5F9", color: "#94A3B8", fontSize: "10px", fontWeight: 600 }}>+{linked.length - 3} more</span>}
                          </div>
                        : <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#FEF9C3", color: "#CA8A04", fontSize: "11px", fontWeight: 600 }}>⚠ No companies linked</span>
                      }
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }}>{linked.length}<span style={{ fontSize: "11px", color: "#94A3B8" }}>/6</span></div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>COMPANIES</div>
                      </div>
                      <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#2563EB" }}>{tmVehicles.length}</div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>VEHICLES</div>
                      </div>
                      <div style={{ flex: 1, background: tmDefects.length > 0 ? "#FEF2F2" : "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: tmDefects.length > 0 ? "#DC2626" : "#10B981" }}>{tmDefects.length}</div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>DEFECTS</div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: "flex", gap: "6px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F1F5F9" }} onClick={e => e.stopPropagation()}>
                      {p.subscription_status === "trial" && (
                        <button onClick={() => activateUser(p.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✅ Activate</button>
                      )}
                      {p.subscription_status === "expired" && (
                        <button onClick={() => activateUser(p.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>↩ Reactivate</button>
                      )}
                      {p.subscription_status === "active" && (
                        <button onClick={() => expireUser(p.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "10px", fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>⏸ Expire</button>
                      )}
                      <button onClick={() => setShowLinkCompany(p.id)} style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF", fontSize: "10px", fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>+ Link Co.</button>
                      <button onClick={() => deleteUser(p.id, p.email)} style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer", marginLeft: "auto" }}>🗑</button>
                    </div>
                  </div>
                  </GlowCard>
                );
              })}
            </div>
            {filteredList.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚛</div>
                <p style={{ fontWeight: 600 }}>No TMs match this filter</p>
              </div>
            )}
          </>);
        })()}

        {/* ===== COMPANIES TAB ===== */}
        {tab === "companies" && !selectedCompany && (() => {
          const noTM = companies.filter(c => tmCompanyLinks.filter(l => l.company_id === c.id).length === 0);
          const activeC = companies.filter(c => (c.status || "active") === "active");
          const demoC = companies.filter(c => c.status === "demo");
          const inactiveC = companies.filter(c => c.status === "inactive");
          const filteredCompanies = companyFilter === "all" ? companies
            : companyFilter === "active" ? activeC
            : companyFilter === "demo" ? demoC
            : companyFilter === "inactive" ? inactiveC
            : noTM;
          return (<>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>🏢 Companies</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{companies.length} companies across the platform</p>
              </div>
              <button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Create Company</button>
            </div>

            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Active", count: activeC.length, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: "✅", filter: "active" },
                { label: "Demo", count: demoC.length, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🎯", filter: "demo" },
                { label: "Inactive", count: inactiveC.length, color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB", icon: "⏸", filter: "inactive" },
                { label: "No TM", count: noTM.length, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "⚠️", filter: "notm" },
              ].map(s => (
                <div key={s.filter} onClick={() => setCompanyFilter(companyFilter === s.filter ? "all" : s.filter)}
                  style={{ background: companyFilter === s.filter ? s.bg : "#FFF", border: "1px solid " + (companyFilter === s.filter ? s.border : "#E5E7EB"), borderRadius: "14px", padding: "16px 20px", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "12px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = companyFilter === s.filter ? s.border : "#E5E7EB"; e.currentTarget.style.transform = "none"; }}>
                  <span style={{ fontSize: "24px" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter label */}
            {companyFilter !== "all" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", color: "#64748B" }}>Filtered by: <strong>{companyFilter === "notm" ? "No TM assigned" : companyFilter}</strong></span>
                <button onClick={() => setCompanyFilter("all")} style={{ fontSize: "11px", color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕ Clear</button>
              </div>
            )}

            {/* Company cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
              {filteredCompanies.map(c => {
                const v = getCompanyVehicles(c.id).length;
                const d = getCompanyDefects(c.id).filter(x => x.status === "open" || x.status === "in_progress").length;
                const linkedTMs = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => profiles.find(p => p.id === l.tm_id)).filter(Boolean);
                const cStatus = c.status || "active";
                const borderColor = cStatus === "demo" ? "#3B82F6" : cStatus === "inactive" ? "#9CA3AF" : linkedTMs.length === 0 ? "#EF4444" : "#10B981";
                const statusCfg = {
                  active: { label: "ACTIVE", bg: "#ECFDF5", color: "#059669" },
                  inactive: { label: "INACTIVE", bg: "#F3F4F6", color: "#6B7280" },
                  demo: { label: "DEMO", bg: "#EFF6FF", color: "#2563EB" },
                }[cStatus];
                return (
                  <GlowCard key={c.id} onClick={() => setSelectedCompany(c)}
                    color={cStatus === "demo" ? "37,99,235" : cStatus === "inactive" ? "107,114,128" : linkedTMs.length === 0 ? "239,68,68" : "16,185,129"}
                    style={{ marginBottom: "0" }}>
                    <div style={{ borderLeft: "4px solid " + borderColor, padding: "18px 20px", position: "relative" }}>

                    {/* Status badge top right */}
                    <span style={{ position: "absolute", top: "14px", right: "14px", padding: "3px 8px", borderRadius: "10px", background: statusCfg.bg, color: statusCfg.color, fontSize: "9px", fontWeight: 700 }}>{statusCfg.label}</span>

                    {/* Company name + licence */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px", paddingRight: "60px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🏢</div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{c.name}</div>
                        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{c.operator_licence || "No operator licence"}</div>
                      </div>
                    </div>

                    {/* TM assigned */}
                    <div style={{ marginBottom: "14px" }}>
                      {linkedTMs.length > 0
                        ? <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {linkedTMs.map(tm => (
                              <span key={tm.id} style={{ padding: "3px 10px", borderRadius: "20px", background: "#EFF6FF", color: "#2563EB", fontSize: "11px", fontWeight: 600 }}>🚛 {tm.full_name}</span>
                            ))}
                          </div>
                        : <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#FEF2F2", color: "#DC2626", fontSize: "11px", fontWeight: 600 }}>⚠ No TM assigned</span>
                      }
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }}>{v}</div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>VEHICLES</div>
                      </div>
                      <div style={{ flex: 1, background: d > 0 ? "#FEF2F2" : "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: d > 0 ? "#DC2626" : "#10B981" }}>{d}</div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>OPEN DEFECTS</div>
                      </div>
                      <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#7C3AED" }}>{checks.filter(x => x.company_id === c.id).length}</div>
                        <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 600 }}>CHECKS</div>
                      </div>
                    </div>
                  </div>
                  </GlowCard>
                );
              })}
            </div>
            {filteredCompanies.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏢</div>
                <p style={{ fontWeight: 600 }}>No companies match this filter</p>
              </div>
            )}
          </>);
        })()}

        {tab === "companies" && selectedCompany && (() => {
          const c = selectedCompany;
          const cv = getCompanyVehicles(c.id);
          const cd = getCompanyDefects(c.id);
          const companyChecks = checks.filter(x => x.company_id === c.id);
          const linkedTMs = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => profiles.find(p => p.id === l.tm_id)).filter(Boolean);
          const cStatus = c.status || "active";
          const statusCfg = {
            active: { label: "ACTIVE", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
            inactive: { label: "INACTIVE", bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
            demo: { label: "DEMO", bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
          };
          const cfg = statusCfg[cStatus] || statusCfg.active;
          return (<>
            <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>← Back</button>

            {/* Company header with status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>🏢 {c.name}</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  {c.operator_licence || "No licence"} ·{" "}
                  {linkedTMs.length > 0
                    ? <span style={{ color: "#2563EB", fontWeight: 600 }}>TM: {linkedTMs.map(t => t.full_name).join(", ")}</span>
                    : <span style={{ color: "#DC2626", fontWeight: 600 }}>⚠ No TM assigned</span>}
                </p>
              </div>
              {/* Status badge */}
              <span style={{ padding: "4px 14px", borderRadius: "20px", background: cfg.bg, border: "1px solid " + cfg.border, color: cfg.color, fontSize: "11px", fontWeight: 700 }}>{cfg.label}</span>
            </div>

            {/* ✅ Active / Inactive / Demo buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", padding: "14px 18px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E5E7EB", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginRight: "4px" }}>Company status:</span>
              {["active", "inactive", "demo"].map(s => {
                const sCfg = statusCfg[s];
                const isSelected = cStatus === s;
                return (
                  <button key={s} onClick={() => setCompanyStatus(c.id, s)}
                    style={{ padding: "6px 16px", borderRadius: "20px", border: "1px solid " + (isSelected ? sCfg.border : "#E5E7EB"), background: isSelected ? sCfg.bg : "#FFF", color: isSelected ? sCfg.color : "#6B7280", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                    {isSelected ? "● " : "○ "}{s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
              <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "4px" }}>
                {cStatus === "demo" ? "Demo companies show sample data to prospects" : cStatus === "inactive" ? "Inactive companies are hidden from TM dashboards" : "Active and visible to TM"}
              </span>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <StatCard icon="🚛" value={cv.length} label="Vehicles" accent="#059669" onClick={() => { window.location.href = "/vehicles"; }} tooltip="View vehicles" />
              <StatCard icon="⚠️" value={cd.filter(d => d.status === "open").length} label="Open Defects" accent="#DC2626" onClick={() => { window.location.href = "/defects"; }} tooltip="View defects" />
              <StatCard icon="📋" value={companyChecks.length} label="Checks" accent="#7C3AED" onClick={() => { window.location.href = "/checks?company=" + c.id; }} tooltip="View checks" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Vehicles ({cv.length})</h2>
                {cv.map(v => (
                  <div key={v.id} className="row-hover" onClick={() => { window.location.href = "/vehicles"; }}
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 700 }}>{v.reg}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div>
                  </div>
                ))}
                {cv.length === 0 && <p style={{ color: "#94A3B8" }}>No vehicles</p>}
              </div>
              <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Defects ({cd.length})</h2>
                {cd.slice(0, 10).map(d => (
                  <div key={d.id} className="row-hover" onClick={() => { window.location.href = "/defects"; }}
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", background: d.severity === "dangerous" ? "#FEF2F2" : "", transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 700 }}>{d.description || d.title}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg}</div>
                  </div>
                ))}
                {cd.length === 0 && <p style={{ color: "#10B981" }}>✅ Clean</p>}
              </div>
            </div>
          </>);
        })()}

        </>)}
      </main>

      {/* === CREATE TM MODAL === */}
        {/* ===== USERS TAB ===== */}
        {tab === "users" && (() => {
          const allUsers = [...profiles].sort((a, b) => {
            const order = { platform_owner: 0, staff: 1, tm: 2 };
            return (order[a.role] ?? 3) - (order[b.role] ?? 3);
          });
          const roleConfig = {
            platform_owner: { label: "OWNER", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
            staff: { label: "STAFF", bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
            tm: { label: "TM", bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
          };
          return (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0 }}>👤 All Users</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{allUsers.length} accounts across the platform</p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Platform Owner", count: profiles.filter(p => p.role === "platform_owner").length, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "👑" },
                { label: "Staff Members", count: profiles.filter(p => p.role === "staff").length, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "👥" },
                { label: "Transport Managers", count: tms.length, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: "🚛" },
              ].map(s => (
                <div key={s.label} style={{ background: "#FFF", border: "1px solid " + s.border, borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "28px" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* User rows */}
            <div style={{ background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: "12px", padding: "12px 20px", background: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}>
                {["User", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                  <div key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>

              {/* User rows */}
              {allUsers.map((u, i) => {
                const rCfg = roleConfig[u.role] || { label: u.role?.toUpperCase(), bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
                const isActive = (u.account_status || "active") === "active";
                const isOwner = u.role === "platform_owner";
                return (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: "12px", padding: "14px 20px", borderBottom: i < allUsers.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center", background: isOwner ? "#FFFAF0" : "white", transition: "all 0.2s ease" }}
                    onMouseEnter={e => { if (!isOwner) { e.currentTarget.style.background = u.role === "staff" ? "#F5F3FF" : "#EFF6FF"; e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = u.role === "staff" ? "inset 3px 0 0 #7C3AED" : "inset 3px 0 0 #2563EB"; }}}
                    onMouseLeave={e => { if (!isOwner) { e.currentTarget.style.background = "white"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}}>

                    {/* Name + avatar */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: isOwner ? "linear-gradient(135deg, #DC2626, #B91C1C)" : u.role === "staff" ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "linear-gradient(135deg, #2563EB, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "11px", flexShrink: 0 }}>
                        {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.full_name || "—"}</div>
                    </div>

                    {/* Email */}
                    <div style={{ fontSize: "12px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>

                    {/* Role badge */}
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: rCfg.bg, border: "1px solid " + rCfg.border, color: rCfg.color, fontSize: "10px", fontWeight: 700, display: "inline-block" }}>{rCfg.label}</span>

                    {/* Active/Inactive toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div onClick={() => !isOwner && toggleUserActive(u.id, isActive)}
                        style={{ width: "36px", height: "20px", borderRadius: "10px", background: isActive ? "#10B981" : "#D1D5DB", cursor: isOwner ? "default" : "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: "2px", left: isActive ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                      </div>
                      <span style={{ fontSize: "11px", color: isActive ? "#059669" : "#94A3B8", fontWeight: 600 }}>{isActive ? "Active" : "Off"}</span>
                    </div>

                    {/* Joined */}
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(u.created_at)}</div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
                      {!isOwner && (
                        <>
                          <button onClick={() => resetPassword(u.email)} title="Send password reset" style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #E5E7EB", background: "#F8FAFC", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>🔑</button>
                          <button onClick={() => deleteUser(u.id, u.email)} title="Delete user" style={{ padding: "5px 8px", borderRadius: "7px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", cursor: "pointer" }}>🗑</button>
                        </>
                      )}
                      {isOwner && <span style={{ fontSize: "11px", color: "#94A3B8" }}>Protected</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>);
        })()}

      {/* ===== STAFF MODAL ===== */}
      {showInviteStaff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#FFF", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>👥 Add Staff Member</h2>
              <button onClick={() => setShowInviteStaff(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94A3B8" }}>✕</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} placeholder="e.g. Sarah Jones" value={staffForm.full_name} onChange={e => setStaffForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="sarah@complyfleet.com" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Temporary Password</label>
              <input style={inputStyle} type="password" placeholder="They can change this later" value={staffForm.password} onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ ...labelStyle, marginBottom: "12px" }}>🔐 Permissions</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { key: "can_manage_tms", icon: "🚛", label: "Manage TMs", desc: "Activate, deactivate, link companies" },
                  { key: "can_manage_companies", icon: "🏢", label: "Manage Companies", desc: "Edit status, view details" },
                  { key: "can_view_revenue", icon: "💰", label: "View Revenue", desc: "See billing and MRR data" },
                  { key: "can_delete", icon: "🗑️", label: "Delete Records", desc: "Remove TMs, companies" },
                ].map(p => (
                  <div key={p.key} onClick={() => setStaffForm(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                    style={{ padding: "12px", borderRadius: "10px", border: staffForm[p.key] ? "2px solid #7C3AED" : "1px solid #E5E7EB", background: staffForm[p.key] ? "#F5F3FF" : "#FAFAFA", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "18px" }}>{p.icon}</span>
                      <span style={{ fontSize: "16px" }}>{staffForm[p.key] ? "✅" : "⬜"}</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginTop: "6px" }}>{p.label}</div>
                    <div style={{ fontSize: "10px", color: "#94A3B8" }}>{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={createStaff}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#7C3AED", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Create Staff Account
            </button>
          </div>
        </div>
      )}

      {showInviteTM && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowInviteTM(false)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>👤 Create TM Account</h2>
              <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>7-day free trial · £49/mo after · 6 companies / 60 vehicles</p>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>Full Name *</label><input value={inviteForm.full_name} onChange={e => setInviteForm({...inviteForm, full_name: e.target.value})} placeholder="John Smith" style={inputStyle} /></div>
              <div><label style={labelStyle}>Email *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="john@example.com" style={inputStyle} /></div>
              <div><label style={labelStyle}>Temporary Password *</label><input value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} placeholder="min 6 characters" style={inputStyle} /></div>
              <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400E" }}>⏳ 7-Day Free Trial</div>
                <div style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>Full access to all features. £49/mo after trial.</div>
              </div>
              {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
            </div>
            <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => { setShowInviteTM(false); setInviteMsg(""); }} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
              <button onClick={createTMAccount} disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name || !inviteForm.password}
                style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: inviteForm.email && inviteForm.full_name && inviteForm.password ? "#2563EB" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {inviteLoading ? "Creating..." : "Create TM (7-day trial)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CREATE COMPANY MODAL === */}
      {showCreateCompany && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowCreateCompany(false)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>🏢 Create Company</h2>
              <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>7-day free trial · £29/mo after · Unlimited vehicles</p>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>Company Name *</label><input value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Hargreaves Haulage Ltd" style={inputStyle} /></div>
              <div><label style={labelStyle}>O-Licence Number</label><input value={companyForm.operator_licence} onChange={e => setCompanyForm({...companyForm, operator_licence: e.target.value})} placeholder="OB1234567" style={inputStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>Email</label><input type="email" value={companyForm.contact_email} onChange={e => setCompanyForm({...companyForm, contact_email: e.target.value})} placeholder="info@company.com" style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input value={companyForm.contact_phone} onChange={e => setCompanyForm({...companyForm, contact_phone: e.target.value})} placeholder="01234 567890" style={inputStyle} /></div>
              </div>
              <div>
                <label style={labelStyle}>Link to Transport Manager</label>
                <select value={linkToTM} onChange={e => setLinkToTM(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">None (link later)</option>
                  {tms.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                </select>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#92400E" }}>⏳ 7-Day Free Trial</div>
                <div style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>Full access to all features. £29/mo after trial.</div>
              </div>
              {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
            </div>
            <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => { setShowCreateCompany(false); setInviteMsg(""); }} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
              <button onClick={createCompany} disabled={inviteLoading || !companyForm.name}
                style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: companyForm.name ? "#0F172A" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {inviteLoading ? "Creating..." : "Create Company (7-day trial)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === LINK COMPANY MODAL === */}
      {showLinkCompany && (() => {
        const unlinked = getUnlinkedCompanies(showLinkCompany);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowLinkCompany(null)}>
            <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>🔗 Link Company to TM</h2>
              </div>
              <div style={{ padding: "24px 28px" }}>
                {unlinked.length === 0 ? <p style={{ color: "#94A3B8" }}>All companies are already linked</p> : unlinked.map(c => (
                  <button key={c.id} onClick={() => linkCompanyToTM(showLinkCompany, c.id)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", marginBottom: "6px" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "#FFF"}>
                    <span>🏢</span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280" }}>{getCompanyVehicles(c.id).length} vehicles</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ padding: "16px 28px", borderTop: "1px solid #F3F4F6" }}>
                <button onClick={() => setShowLinkCompany(null)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div style={{ position: "fixed", top: "80px", right: "20px", zIndex: 2000, padding: "14px 24px", borderRadius: "12px", background: toast.type === "success" ? "#059669" : "#DC2626", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}



