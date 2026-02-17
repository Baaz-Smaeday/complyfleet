"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
function daysLeft(d) { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000); }

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
    // Set trial on profile
    if (data?.user) {
      await supabase.from("profiles").update({ trial_ends_at: trialEnd, subscription_status: "trial" }).eq("id", data.user.id);
    }
    flash("TM account created with 7-day free trial");
    setShowInviteTM(false); setInviteForm({ email: "", full_name: "", password: "" }); setInviteLoading(false);
    setTimeout(() => loadData(), 1500);
  }

  async function createCompany() {
    setInviteLoading(true); setInviteMsg("");
    const { data: newCo, error } = await supabase.from("companies").insert({ ...companyForm, licence_status: "Valid" }).select().single();
    if (error) { setInviteMsg("Error: " + error.message); setInviteLoading(false); return; }
    // Auto-link to selected TM if chosen
    if (newCo && linkToTM) {
      await supabase.from("tm_companies").insert({ tm_id: linkToTM, company_id: newCo.id });
    }
    flash("Company created" + (linkToTM ? " & linked to TM" : ""));
    setShowCreateCompany(false); setCompanyForm({ name: "", operator_licence: "", contact_email: "", contact_phone: "" }); setLinkToTM(""); setInviteLoading(false);
    loadData();
  }

  async function changeRole(userId, newRole) { await supabase.from("profiles").update({ role: newRole }).eq("id", userId); flash("Role updated"); loadData(); }
  async function deleteUser(userId, email) { if (!confirm("Delete " + email + "?")) return; await supabase.from("tm_companies").delete().eq("tm_id", userId); await supabase.from("profiles").delete().eq("id", userId); flash("Removed"); loadData(); }
  async function linkCompanyToTM(tmId, cid) { await supabase.from("tm_companies").insert({ tm_id: tmId, company_id: cid }); flash("Linked"); setShowLinkCompany(null); loadData(); }
  async function unlinkCompany(tmId, cid) { await supabase.from("tm_companies").delete().match({ tm_id: tmId, company_id: cid }); flash("Unlinked"); loadData(); }
  async function activateUser(userId) { await supabase.from("profiles").update({ subscription_status: "active", trial_ends_at: null }).eq("id", userId); flash("Activated"); loadData(); }
  async function expireUser(userId) { await supabase.from("profiles").update({ subscription_status: "expired" }).eq("id", userId); flash("Expired"); loadData(); }

  const tms = profiles.filter(p => p.role === "tm");
  const openDefects = defects.filter(d => d.status === "open" || d.status === "in_progress").length;
  const dangerousDefects = defects.filter(d => d.severity === "dangerous" && d.status !== "closed").length;

  function getLinkedCompanies(tmId) { const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id); return companies.filter(c => ids.includes(c.id)); }
  function getUnlinkedCompanies(tmId) { const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id); return companies.filter(c => !ids.includes(c.id)); }
  function getCompanyVehicles(cid) { return vehicles.filter(v => v.company_id === cid); }
  function getCompanyDefects(cid) { const regs = getCompanyVehicles(cid).map(v => v.reg); return defects.filter(d => regs.includes(d.vehicle_reg)); }
  function getCompanyChecks(cid) { return checks.filter(c => c.company_id === cid); }

  function getTrialBadge(p) {
    const status = p.subscription_status || "active";
    if (status === "active") return { label: "ACTIVE", bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" };
    if (status === "expired") return { label: "EXPIRED", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
    const days = daysLeft(p.trial_ends_at);
    if (days !== null && days <= 0) return { label: "TRIAL EXPIRED", bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" };
    return { label: `TRIAL \u2022 ${days}d left`, bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" };
  }

  const filteredUsers = userFilter === "all" ? profiles : profiles.filter(p => p.role === userFilter);
  const roleColors = { platform_owner: "#DC2626", tm: "#059669", company_admin: "#2563EB", company_viewer: "#64748B" };
  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" };

  const TIERS = { starter: { price: 39, label: "Starter", max: 5 }, professional: { price: 79, label: "Professional", max: 15 }, enterprise: { price: 149, label: "Enterprise", max: 999 } };
  function getTMTier(tmId) { const c = getLinkedCompanies(tmId).length; return c <= 5 ? "starter" : c <= 15 ? "professional" : "enterprise"; }
  const activeTMs = tms.filter(t => (t.subscription_status || "active") === "active");
  const trialTMs = tms.filter(t => t.subscription_status === "trial");
  const mrrNow = activeTMs.reduce((s, t) => s + TIERS[getTMTier(t.id)].price, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          </a>
          <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.2)", color: "#FCA5A5", fontSize: "10px", fontWeight: 700 }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {["overview", "revenue", "users", "companies"].map(t => (
            <button key={t} onClick={() => { setTab(t); setSelectedCompany(null); setSelectedTM(null); }} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: tab === t ? "rgba(255,255,255,0.15)" : "none", color: tab === t ? "white" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>{t === "revenue" ? "\u{1F4B0} Revenue" : t}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{"\u{1F4CA}"} TM View</a>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #EF4444, #DC2626)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>{profile?.full_name ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "SA"}</div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "52px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "200px", zIndex: 200 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{profile?.full_name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{profile?.email}</div></div>
              <a href="/dashboard" style={{ display: "block", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none", borderRadius: "8px" }} onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F4CA}"} Dashboard</a>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }}>{"\u{1F6AA}"} Sign Out</button>
            </div>)}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> : (<>

        {/* ===== OVERVIEW ===== */}
        {tab === "overview" && !selectedCompany && !selectedTM && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F6E0}\uFE0F"} Platform Overview</h1><p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Click any card to drill down</p></div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F3E2}"} + Company</button>
              <button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F464}"} + TM Account</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "\u{1F464}", value: tms.length, label: "Transport Managers", accent: "#2563EB", sub: trialTMs.length > 0 ? `${trialTMs.length} on trial` : null, click: () => { setTab("users"); setUserFilter("tm"); } },
              { icon: "\u{1F3E2}", value: companies.length, label: "Companies", accent: "#0F172A", click: () => setTab("companies") },
              { icon: "\u{1F69B}", value: vehicles.length, label: "Vehicles", accent: "#059669", click: () => window.location.href = "/vehicles" },
              { icon: "\u26A0\uFE0F", value: openDefects, label: "Open Defects", accent: "#DC2626", click: () => window.location.href = "/defects" },
              { icon: "\u{1F4CB}", value: checks.length, label: "Checks", accent: "#7C3AED", click: () => window.location.href = "/checks" },
              { icon: "\u{1F4B0}", value: "\u00A3" + mrrNow, label: "Monthly Revenue", accent: "#0891B2", click: () => setTab("revenue") },
            ].map(s => (
              <div key={s.label} onClick={s.click} style={{ background: "#FFF", borderRadius: "16px", padding: "18px 22px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.icon}</div>
                <div><div style={{ fontSize: "26px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "11px", color: "#6B7280", marginTop: "3px" }}>{s.label}</div>{s.sub && <div style={{ fontSize: "10px", color: "#D97706", fontWeight: 600, marginTop: "2px" }}>{s.sub}</div>}</div>
              </div>))}
          </div>

          {dangerousDefects > 0 && (
            <div onClick={() => window.location.href = "/defects"} style={{ padding: "14px 20px", borderRadius: "14px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
              <span style={{ fontSize: "22px" }}>{"\u{1F6A8}"}</span><div style={{ flex: 1, fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{dangerousDefects} dangerous defect{dangerousDefects > 1 ? "s" : ""}</div><span style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>View {"\u2192"}</span>
            </div>)}

          {/* Trial alerts */}
          {trialTMs.length > 0 && (
            <div style={{ padding: "14px 20px", borderRadius: "14px", background: "#FFFBEB", border: "2px solid #FDE68A", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "22px" }}>{"\u23F3"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#92400E" }}>{trialTMs.length} TM{trialTMs.length > 1 ? "s" : ""} on free trial</div>
                <div style={{ fontSize: "12px", color: "#B45309", marginTop: "2px" }}>{trialTMs.map(t => `${t.full_name || t.email} (${daysLeft(t.trial_ends_at)}d left)`).join(", ")}</div>
              </div>
              <button onClick={() => { setTab("users"); setUserFilter("tm"); }} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #FDE68A", background: "#FFF", fontSize: "11px", fontWeight: 700, color: "#92400E", cursor: "pointer" }}>Manage</button>
            </div>)}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800 }}>{"\u{1F464}"} Transport Managers ({tms.length})</h2>
                <button onClick={() => setShowInviteTM(true)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Add</button>
              </div>
              {tms.length === 0 ? <p style={{ color: "#94A3B8", fontSize: "13px" }}>No TMs yet</p> :
              tms.map(tm => { const linked = getLinkedCompanies(tm.id); const badge = getTrialBadge(tm); return (
                <div key={tm.id} onClick={() => setSelectedTM(tm)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = ""; }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{tm.full_name || "No name"}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{tm.email} {"\u00B7"} {linked.length} companies</div></div>
                  <span style={{ padding: "3px 8px", borderRadius: "8px", background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: "9px", fontWeight: 700 }}>{badge.label}</span>
                  <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
                </div>); })}
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800 }}>{"\u{1F3E2}"} Companies ({companies.length})</h2>
                <button onClick={() => setShowCreateCompany(true)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#0F172A", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Add</button>
              </div>
              {companies.map(c => { const vCount = getCompanyVehicles(c.id).length; const dCount = getCompanyDefects(c.id).filter(d => d.status === "open" || d.status === "in_progress").length; const tmNames = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => { const t = profiles.find(p => p.id === l.tm_id); return t ? t.full_name : null; }).filter(Boolean); return (
                <div key={c.id} onClick={() => setSelectedCompany(c)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = ""; }}>
                  <span style={{ fontSize: "18px" }}>{"\u{1F3E2}"}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{vCount} vehicles{tmNames.length > 0 ? ` \u00B7 ${tmNames.join(", ")}` : ""}</div></div>
                  {dCount > 0 && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#FEF2F2", color: "#DC2626", fontSize: "10px", fontWeight: 700 }}>{dCount}</span>}
                  <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
                </div>); })}
            </div>
          </div>
        </>)}

        {/* ===== COMPANY DETAIL ===== */}
        {selectedCompany && !selectedTM && (() => { const c = selectedCompany; const cv = getCompanyVehicles(c.id); const cd = getCompanyDefects(c.id); const openD = cd.filter(d => d.status === "open" || d.status === "in_progress"); return (<>
          <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "4px" }}>{"\u{1F3E2}"} {c.name}</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>{c.operator_licence || "No licence"} {"\u00B7"} {c.contact_email || ""}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F69B}", v: cv.length, l: "Vehicles", a: "#059669" }, { i: "\u26A0\uFE0F", v: openD.length, l: "Defects", a: "#DC2626" }, { i: "\u{1F4CB}", v: getCompanyChecks(c.id).length, l: "Checks", a: "#7C3AED" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.i}</div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{s.l}</div></div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Vehicles</h2>
              {cv.map(v => (<div key={v.id} onClick={() => window.location.href = "/vehicles"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}><div style={{ fontSize: "13px", fontWeight: 700 }}>{v.reg}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div>))}
              {cv.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px" }}>No vehicles</p>}
            </div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Defects</h2>
              {cd.slice(0, 10).map(d => (<div key={d.id} onClick={() => window.location.href = "/defects"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", background: d.severity === "dangerous" ? "#FEF2F2" : "" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#FECACA"} onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}><div style={{ fontSize: "13px", fontWeight: 700 }}>{d.title}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg} {"\u00B7"} {d.severity}</div></div>))}
              {cd.length === 0 && <p style={{ color: "#10B981" }}>{"\u2705"} Clean</p>}
            </div>
          </div>
        </>); })()}

        {/* ===== TM DETAIL ===== */}
        {selectedTM && !selectedCompany && (() => { const tm = selectedTM; const linked = getLinkedCompanies(tm.id); const unlinked = getUnlinkedCompanies(tm.id); const badge = getTrialBadge(tm); return (<>
          <button onClick={() => setSelectedTM(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800 }}>{tm.full_name}</h1><p style={{ fontSize: "13px", color: "#64748B" }}>{tm.email} {"\u00B7"} Joined {formatDate(tm.created_at)}</p></div>
            <span style={{ padding: "4px 12px", borderRadius: "8px", background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: "11px", fontWeight: 700 }}>{badge.label}</span>
            {tm.subscription_status === "trial" && <button onClick={() => activateUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2705"} Activate (Remove Trial)</button>}
            {tm.subscription_status === "expired" && <button onClick={() => activateUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2705"} Reactivate</button>}
            {(tm.subscription_status === "active" || tm.subscription_status === "trial") && <button onClick={() => expireUser(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>{"\u23F8"} Expire</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F3E2}", v: linked.length, l: "Companies", a: "#0F172A" }, { i: "\u{1F69B}", v: linked.flatMap(c => getCompanyVehicles(c.id)).length, l: "Vehicles", a: "#059669" }, { i: "\u{1F4B0}", v: "\u00A3" + TIERS[getTMTier(tm.id)].price, l: "Per Month", a: "#0891B2" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.i}</div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{s.l}</div></div>))}
          </div>
          <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800 }}>{"\u{1F517}"} Linked Companies ({linked.length})</h2>
              {unlinked.length > 0 && <button onClick={() => setShowLinkCompany(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Link</button>}
            </div>
            {linked.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px" }}><span>{"\u{1F3E2}"}</span><div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelectedCompany(c); setSelectedTM(null); }}><div style={{ fontSize: "13px", fontWeight: 700, color: "#2563EB" }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{getCompanyVehicles(c.id).length} vehicles</div></div><button onClick={() => unlinkCompany(tm.id, c.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "10px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Unlink</button></div>))}
            {linked.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px" }}>No companies linked</p>}
          </div>
        </>); })()}

        {/* ===== REVENUE TAB ===== */}
        {tab === "revenue" && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "24px" }}>{"\u{1F4B0}"} Revenue & Forecasting</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F4B0}", v: "\u00A3" + mrrNow, l: "MRR (Paying)", a: "#059669" }, { i: "\u{1F4C8}", v: "\u00A3" + (mrrNow * 12).toLocaleString(), l: "ARR", a: "#2563EB" }, { i: "\u{1F465}", v: activeTMs.length, l: "Paying TMs", a: "#0F172A" }, { i: "\u23F3", v: trialTMs.length, l: "On Trial", a: "#D97706" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "16px", padding: "20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "6px" }}>{s.i}</div><div style={{ fontSize: "28px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280", marginTop: "4px" }}>{s.l}</div></div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Revenue by TM</h2>
              {tms.map(tm => { const tier = getTMTier(tm.id); const badge = getTrialBadge(tm); const isPaying = (tm.subscription_status || "active") === "active"; return (
                <div key={tm.id} onClick={() => { setTab("overview"); setSelectedTM(tm); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", opacity: isPaying ? 1 : 0.6 }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{tm.full_name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{getLinkedCompanies(tm.id).length} companies</div></div>
                  <span style={{ padding: "3px 8px", borderRadius: "8px", background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: "9px", fontWeight: 700 }}>{badge.label}</span>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: isPaying ? "#059669" : "#94A3B8" }}>{isPaying ? "\u00A3" + TIERS[tier].price : "\u00A30"}</div>
                </div>); })}
            </div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Pricing Tiers</h2>
              {[{ tier: "Starter", price: 39, desc: "Up to 5 companies", color: "#059669" }, { tier: "Professional", price: 79, desc: "Up to 15 companies", color: "#2563EB" }, { tier: "Enterprise", price: 149, desc: "Unlimited companies", color: "#7C3AED" }].map(t => (
                <div key={t.tier} style={{ padding: "16px", borderRadius: "12px", border: `2px solid ${t.color}30`, background: t.color + "08", marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: "14px", fontWeight: 800, color: t.color }}>{t.tier}</span><span style={{ fontSize: "22px", fontWeight: 800 }}>{"\u00A3"}{t.price}<span style={{ fontSize: "12px", color: "#6B7280" }}>/mo</span></span></div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{t.desc} {"\u00B7"} 7-day free trial</div>
                </div>))}
            </div>
          </div>
        </>)}

        {/* ===== USERS TAB ===== */}
        {tab === "users" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800 }}>{"\u{1F465}"} Users</h1></div>
            <div style={{ display: "flex", gap: "8px" }}><button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F3E2}"} + Company</button><button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#2563EB", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F464}"} + TM</button></div>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {[{ k: "all", l: "All", c: profiles.length }, { k: "tm", l: "TMs", c: tms.length }, { k: "platform_owner", l: "Owner", c: profiles.filter(p => p.role === "platform_owner").length }].map(f => (
              <button key={f.k} onClick={() => setUserFilter(f.k)} style={{ padding: "6px 14px", borderRadius: "20px", border: userFilter === f.k ? "none" : "1px solid #E5E7EB", background: userFilter === f.k ? "#0F172A" : "white", color: userFilter === f.k ? "white" : "#6B7280", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{f.l} ({f.c})</button>))}
          </div>
          {filteredUsers.map(p => { const linked = p.role === "tm" ? getLinkedCompanies(p.id) : []; const badge = getTrialBadge(p); return (
            <div key={p.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "18px 24px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: roleColors[p.role] || "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px" }}>{p.full_name ? p.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: "15px", fontWeight: 700 }}>{p.full_name || "No name"}</div><div style={{ fontSize: "12px", color: "#6B7280" }}>{p.email} {"\u00B7"} {formatDate(p.created_at)}</div></div>
                <span style={{ padding: "3px 10px", borderRadius: "8px", background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontSize: "9px", fontWeight: 700 }}>{badge.label}</span>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: (roleColors[p.role] || "#6B7280") + "15", color: roleColors[p.role], fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{(p.role || "").replace("_", " ")}</span>
                {p.role !== "platform_owner" && (<div style={{ display: "flex", gap: "6px" }}>
                  {p.subscription_status === "trial" && <button onClick={() => activateUser(p.id)} style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: "#059669", color: "white", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>{"\u2705"}</button>}
                  <select value={p.role} onChange={e => changeRole(p.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}><option value="tm">TM</option><option value="company_admin">Admin</option><option value="company_viewer">Viewer</option></select>
                  <button onClick={() => deleteUser(p.id, p.email)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>{"\u{1F5D1}"}</button>
                </div>)}
              </div>
              {p.role === "tm" && (<div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F3F4F6", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>Companies:</span>
                {linked.map(c => (<span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: "11px", fontWeight: 600, color: "#2563EB" }}>{c.name} <button onClick={() => unlinkCompany(p.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontWeight: 700 }}>{"\u2715"}</button></span>))}
                <button onClick={() => setShowLinkCompany(p.id)} style={{ padding: "3px 10px", borderRadius: "20px", border: "1px dashed #D1D5DB", background: "none", fontSize: "11px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>{"\u2795"} Link</button>
              </div>)}
            </div>); })}
        </>)}

        {/* ===== COMPANIES TAB ===== */}
        {tab === "companies" && !selectedCompany && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800 }}>{"\u{1F3E2}"} Companies ({companies.length})</h1>
            <button onClick={() => setShowCreateCompany(true)} style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "#0F172A", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Create Company</button>
          </div>
          {companies.map(c => { const vCount = getCompanyVehicles(c.id).length; const dCount = getCompanyDefects(c.id).filter(d => d.status === "open" || d.status === "in_progress").length; const tmNames = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => { const t = profiles.find(p => p.id === l.tm_id); return t ? t.full_name : null; }).filter(Boolean); return (
            <div key={c.id} onClick={() => setSelectedCompany(c)} style={{ background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: "28px" }}>{"\u{1F3E2}"}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: "15px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "12px", color: "#6B7280" }}>{c.operator_licence || "No licence"}</div>{tmNames.length > 0 && <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "4px" }}>{tmNames.join(", ")}</div>}</div>
              <div style={{ display: "flex", gap: "16px" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }}>{vCount}</div><div style={{ fontSize: "9px", color: "#6B7280" }}>vehicles</div></div><div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: dCount > 0 ? "#DC2626" : "#10B981" }}>{dCount}</div><div style={{ fontSize: "9px", color: "#6B7280" }}>defects</div></div></div>
              <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
            </div>); })}
        </>)}

        {tab === "companies" && selectedCompany && (() => { const c = selectedCompany; const cv = getCompanyVehicles(c.id); const cd = getCompanyDefects(c.id); return (<>
          <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "24px" }}>{"\u{1F3E2}"} {c.name}</h1>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}><h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Vehicles ({cv.length})</h2>{cv.map(v => (<div key={v.id} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", marginBottom: "6px" }}><div style={{ fontWeight: 700 }}>{v.reg}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div>))}{cv.length === 0 && <p style={{ color: "#94A3B8" }}>No vehicles</p>}</div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}><h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Defects ({cd.length})</h2>{cd.slice(0,10).map(d => (<div key={d.id} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", marginBottom: "6px", background: d.severity === "dangerous" ? "#FEF2F2" : "" }}><div style={{ fontWeight: 700 }}>{d.title}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg} {"\u00B7"} {d.severity}</div></div>))}{cd.length === 0 && <p style={{ color: "#10B981" }}>{"\u2705"} Clean</p>}</div>
          </div>
        </>); })()}

        </>)}
      </main>

      {/* === CREATE TM MODAL === */}
      {showInviteTM && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowInviteTM(false)}>
        <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{"\u{1F464}"} Create TM Account</h2><p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Includes 7-day free trial with full features</p></div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Full Name *</label><input value={inviteForm.full_name} onChange={e => setInviteForm({...inviteForm, full_name: e.target.value})} placeholder="John Smith" style={inputStyle} /></div>
            <div><label style={labelStyle}>Email *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="john@example.com" style={inputStyle} /></div>
            <div><label style={labelStyle}>Temporary Password *</label><input value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} placeholder="min 6 characters" style={inputStyle} /></div>
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#FFFBEB", border: "1px solid #FDE68A" }}><div style={{ fontSize: "12px", fontWeight: 700, color: "#92400E" }}>{"\u23F3"} 7-Day Free Trial</div><div style={{ fontSize: "11px", color: "#B45309", marginTop: "2px" }}>Full access to all features. Convert to paid after trial.</div></div>
            {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
          </div>
          <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={() => setShowInviteTM(false)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
            <button onClick={createTMAccount} disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name || !inviteForm.password} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: inviteForm.email && inviteForm.full_name && inviteForm.password ? "#2563EB" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{inviteLoading ? "Creating..." : "Create TM (7-day trial)"}</button>
          </div>
        </div>
      </div>)}

      {/* === CREATE COMPANY MODAL === */}
      {showCreateCompany && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowCreateCompany(false)}>
        <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{"\u{1F3E2}"} Create Company</h2><p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Add a new operator company and link to a TM</p></div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Company Name *</label><input value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Hargreaves Haulage Ltd" style={inputStyle} /></div>
            <div><label style={labelStyle}>Operator Licence</label><input value={companyForm.operator_licence} onChange={e => setCompanyForm({...companyForm, operator_licence: e.target.value})} placeholder="OB1234567" style={inputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={labelStyle}>Contact Email</label><input type="email" value={companyForm.contact_email} onChange={e => setCompanyForm({...companyForm, contact_email: e.target.value})} placeholder="info@company.com" style={inputStyle} /></div>
              <div><label style={labelStyle}>Contact Phone</label><input value={companyForm.contact_phone} onChange={e => setCompanyForm({...companyForm, contact_phone: e.target.value})} placeholder="01onal 234 5678" style={inputStyle} /></div>
            </div>
            <div><label style={labelStyle}>Link to Transport Manager</label>
              <select value={linkToTM} onChange={e => setLinkToTM(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">None (link later)</option>
                {tms.map(t => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
              </select>
            </div>
            {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
          </div>
          <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={() => { setShowCreateCompany(false); setInviteMsg(""); }} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
            <button onClick={createCompany} disabled={inviteLoading || !companyForm.name} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: companyForm.name ? "#0F172A" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{inviteLoading ? "Creating..." : "Create Company"}</button>
          </div>
        </div>
      </div>)}

      {/* === LINK COMPANY MODAL === */}
      {showLinkCompany && (() => { const unlinked = getUnlinkedCompanies(showLinkCompany); return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowLinkCompany(null)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{"\u{1F517}"} Link Company</h2></div>
            <div style={{ padding: "24px 28px" }}>{unlinked.length === 0 ? <p style={{ color: "#94A3B8" }}>All companies linked</p> : unlinked.map(c => (
              <button key={c.id} onClick={() => linkCompanyToTM(showLinkCompany, c.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", marginBottom: "6px" }} onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "#FFF"}>
                <span>{"\u{1F3E2}"}</span><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{getCompanyVehicles(c.id).length} vehicles</div></div>
              </button>))}</div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC" }}><button onClick={() => setShowLinkCompany(null)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Close</button></div>
          </div>
        </div>); })()}

      {toast && (<div style={{ position: "fixed", top: "80px", right: "20px", zIndex: 2000, padding: "14px 24px", borderRadius: "12px", background: toast.type === "success" ? "#059669" : "#DC2626", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>{toast.message}</div>)}
    </div>
  );
}

