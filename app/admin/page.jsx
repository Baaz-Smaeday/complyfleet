"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";

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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", password: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLinkCompany, setShowLinkCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedTM, setSelectedTM] = useState(null);
  const [userFilter, setUserFilter] = useState("all");

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!isSupabaseReady()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
        if (data) { setProfile(data); if (data.role !== "platform_owner") { window.location.href = "/dashboard"; } }
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
    const { error } = await supabase.auth.signUp({ email: inviteForm.email, password: inviteForm.password, options: { data: { full_name: inviteForm.full_name, role: "tm" } } });
    if (error) { setInviteMsg("Error: " + error.message); setInviteLoading(false); return; }
    flash("TM account created for " + inviteForm.email);
    setShowInviteTM(false); setInviteForm({ email: "", full_name: "", password: "" }); setInviteLoading(false);
    setTimeout(() => loadData(), 1500);
  }

  async function changeRole(userId, newRole) { await supabase.from("profiles").update({ role: newRole }).eq("id", userId); flash("Role updated"); loadData(); }
  async function deleteUser(userId, email) { if (!confirm("Delete " + email + "?")) return; await supabase.from("tm_companies").delete().eq("tm_id", userId); await supabase.from("profiles").delete().eq("id", userId); flash("Removed"); loadData(); }
  async function linkCompanyToTM(tmId, cid) { await supabase.from("tm_companies").insert({ tm_id: tmId, company_id: cid }); flash("Linked"); setShowLinkCompany(null); loadData(); }
  async function unlinkCompany(tmId, cid) { await supabase.from("tm_companies").delete().match({ tm_id: tmId, company_id: cid }); flash("Unlinked"); loadData(); }

  const tms = profiles.filter(p => p.role === "tm");
  const openDefects = defects.filter(d => d.status === "open" || d.status === "in_progress").length;
  const dangerousDefects = defects.filter(d => d.severity === "dangerous" && d.status !== "closed").length;

  function getLinkedCompanies(tmId) { const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id); return companies.filter(c => ids.includes(c.id)); }
  function getUnlinkedCompanies(tmId) { const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id); return companies.filter(c => !ids.includes(c.id)); }
  function getCompanyVehicles(cid) { return vehicles.filter(v => v.company_id === cid); }
  function getCompanyDefects(cid) { const regs = getCompanyVehicles(cid).map(v => v.reg); return defects.filter(d => regs.includes(d.vehicle_reg)); }
  function getCompanyChecks(cid) { return checks.filter(c => c.company_id === cid); }

  const filteredUsers = userFilter === "all" ? profiles : profiles.filter(p => p.role === userFilter);
  const roleColors = { platform_owner: "#DC2626", tm: "#059669", company_admin: "#2563EB", company_viewer: "#64748B" };
  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" };

  // Revenue forecast calculations
  const TIERS = { starter: { price: 39, label: "Starter", maxCompanies: 5 }, professional: { price: 79, label: "Professional", maxCompanies: 15 }, enterprise: { price: 149, label: "Enterprise", maxCompanies: 999 } };
  function getTMTier(tmId) { const count = getLinkedCompanies(tmId).length; if (count <= 5) return "starter"; if (count <= 15) return "professional"; return "enterprise"; }
  const mrrNow = tms.reduce((sum, tm) => sum + TIERS[getTMTier(tm.id)].price, 0);
  const arrNow = mrrNow * 12;
  const months6 = Math.round(mrrNow * 2.5);
  const months12 = Math.round(mrrNow * 5);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      {/* HEADER */}
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
            <div style={{ textAlign: "right" }}><div style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{profile?.full_name || "Admin"}</div><div style={{ color: "#64748B", fontSize: "10px" }}>Owner</div></div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #EF4444, #DC2626)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>{profile?.full_name ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "SA"}</div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "52px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "200px", zIndex: 200 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{profile?.full_name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{profile?.email}</div></div>
              <a href="/dashboard" style={{ display: "block", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none", borderRadius: "8px" }} onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F4CA}"} TM Dashboard</a>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F6AA}"} Sign Out</button>
            </div>)}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> : (<>

        {/* ========== OVERVIEW ========== */}
        {tab === "overview" && !selectedCompany && !selectedTM && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>{"\u{1F6E0}\uFE0F"} Platform Overview</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>Click any card to drill down</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "\u{1F464}", value: tms.length, label: "Transport Managers", accent: "#2563EB", click: () => { setTab("users"); setUserFilter("tm"); } },
              { icon: "\u{1F3E2}", value: companies.length, label: "Companies", accent: "#0F172A", click: () => setTab("companies") },
              { icon: "\u{1F69B}", value: vehicles.length, label: "Active Vehicles", accent: "#059669", click: () => window.location.href = "/vehicles" },
              { icon: "\u26A0\uFE0F", value: openDefects, label: "Open Defects", accent: "#DC2626", click: () => window.location.href = "/defects" },
              { icon: "\u{1F4CB}", value: checks.length, label: "Total Checks", accent: "#7C3AED", click: () => window.location.href = "/checks" },
              { icon: "\u{1F4B0}", value: "\u00A3" + mrrNow, label: "Monthly Revenue", accent: "#0891B2", click: () => setTab("revenue") },
            ].map(s => (
              <div key={s.label} onClick={s.click} style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{s.icon}</div>
                <div><div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{s.label}</div></div>
              </div>))}
          </div>

          {dangerousDefects > 0 && (
            <div onClick={() => window.location.href = "/defects"} style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"} onMouseLeave={e => e.currentTarget.style.background = "#FEF2F2"}>
              <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span><div style={{ flex: 1, fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{dangerousDefects} dangerous defect{dangerousDefects > 1 ? "s" : ""}</div><span style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>View {"\u2192"}</span>
            </div>)}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F464}"} Transport Managers ({tms.length})</h2>
                <button onClick={() => setShowInviteTM(true)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Add TM</button>
              </div>
              {tms.length === 0 ? <p style={{ color: "#94A3B8", fontSize: "13px" }}>No TMs yet. Click "Add TM".</p> :
              tms.map(tm => { const linked = getLinkedCompanies(tm.id); return (
                <div key={tm.id} onClick={() => setSelectedTM(tm)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "none"; }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{tm.full_name || "No name"}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{tm.email} {"\u00B7"} {linked.length} companies</div></div>
                  <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#0891B215", color: "#0891B2", fontSize: "10px", fontWeight: 700 }}>{"\u00A3"}{TIERS[getTMTier(tm.id)].price}/mo</span>
                  <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
                </div>); })}
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>{"\u{1F3E2}"} Companies ({companies.length})</h2>
              {companies.map(c => { const vCount = getCompanyVehicles(c.id).length; const dCount = getCompanyDefects(c.id).filter(d => d.status === "open" || d.status === "in_progress").length; return (
                <div key={c.id} onClick={() => setSelectedCompany(c)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "none"; }}>
                  <span style={{ fontSize: "20px" }}>{"\u{1F3E2}"}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{vCount} vehicles</div></div>
                  {dCount > 0 && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#FEF2F2", color: "#DC2626", fontSize: "10px", fontWeight: 700 }}>{dCount}</span>}
                  <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
                </div>); })}
            </div>
          </div>

          <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB", marginTop: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>{"\u{1F4C5}"} Recent Activity</h2>
            {checks.slice(0, 5).map(ch => (
              <div key={ch.id} onClick={() => window.location.href = "/checks"} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "10px", background: "#F8FAFC", marginBottom: "6px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"} onMouseLeave={e => e.currentTarget.style.background = "#F8FAFC"}>
                <span>{ch.result === "pass" ? "\u2705" : "\u26A0\uFE0F"}</span>
                <div style={{ flex: 1 }}><span style={{ fontSize: "12px", fontWeight: 600 }}>Walkaround</span> <span style={{ fontSize: "12px", color: "#6B7280" }}>{"\u2014"} {ch.driver_name} {"\u00B7"} {ch.vehicle_reg}</span></div>
                <span style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(ch.completed_at)}</span>
              </div>))}
            {checks.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px", textAlign: "center", padding: "20px" }}>No activity yet</p>}
          </div>
        </>)}

        {/* ========== COMPANY DETAIL ========== */}
        {selectedCompany && !selectedTM && (() => { const c = selectedCompany; const cv = getCompanyVehicles(c.id); const cd = getCompanyDefects(c.id); const cc = getCompanyChecks(c.id); const openD = cd.filter(d => d.status === "open" || d.status === "in_progress"); const linkedTMs = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => profiles.find(p => p.id === l.tm_id)).filter(Boolean); return (<>
          <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>{"\u{1F3E2}"} {c.name}</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>{c.operator_licence || "No licence"} {"\u00B7"} {c.contact_email || ""}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F69B}", v: cv.length, l: "Vehicles", a: "#059669" }, { i: "\u26A0\uFE0F", v: openD.length, l: "Open Defects", a: "#DC2626" }, { i: "\u{1F4CB}", v: cc.length, l: "Checks", a: "#7C3AED" }, { i: "\u{1F464}", v: linkedTMs.length, l: "TMs", a: "#2563EB" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.i}</div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{s.l}</div></div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>{"\u{1F69B}"} Vehicles ({cv.length})</h2>
              {cv.map(v => (<div key={v.id} onClick={() => window.location.href = "/vehicles"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", display: "flex", justifyContent: "space-between", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{v.reg}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div><div style={{ textAlign: "right", fontSize: "11px", color: "#6B7280" }}>MOT: {formatDate(v.mot_expiry)}</div></div>))}
              {cv.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px" }}>No vehicles</p>}
            </div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>{"\u26A0\uFE0F"} Defects ({cd.length})</h2>
              {cd.slice(0, 10).map(d => (<div key={d.id} onClick={() => window.location.href = "/defects"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", display: "flex", justifyContent: "space-between", background: d.severity === "dangerous" ? "#FEF2F2" : "", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#FECACA"} onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}><div><div style={{ fontSize: "13px", fontWeight: 700 }}>{d.title}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg}</div></div><span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: d.severity === "dangerous" ? "#DC2626" : "#D97706", alignSelf: "center" }}>{d.severity}</span></div>))}
              {cd.length === 0 && <p style={{ color: "#10B981", fontSize: "13px" }}>{"\u2705"} No defects</p>}
            </div>
          </div>
        </>); })()}

        {/* ========== TM DETAIL ========== */}
        {selectedTM && !selectedCompany && (() => { const tm = selectedTM; const linked = getLinkedCompanies(tm.id); const unlinked = getUnlinkedCompanies(tm.id); const tmV = linked.flatMap(c => getCompanyVehicles(c.id)); return (<>
          <button onClick={() => setSelectedTM(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "18px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800 }}>{tm.full_name}</h1><p style={{ fontSize: "13px", color: "#64748B" }}>{tm.email} {"\u00B7"} Joined {formatDate(tm.created_at)}</p></div>
            <span style={{ padding: "4px 14px", borderRadius: "20px", background: "#05966915", color: "#059669", fontSize: "11px", fontWeight: 700 }}>TM</span>
            <span style={{ padding: "4px 14px", borderRadius: "20px", background: "#0891B215", color: "#0891B2", fontSize: "11px", fontWeight: 700 }}>{TIERS[getTMTier(tm.id)].label} {"\u00B7"} {"\u00A3"}{TIERS[getTMTier(tm.id)].price}/mo</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F3E2}", v: linked.length, l: "Companies", a: "#0F172A" }, { i: "\u{1F69B}", v: tmV.length, l: "Vehicles", a: "#059669" }, { i: "\u{1F4B0}", v: "\u00A3" + TIERS[getTMTier(tm.id)].price, l: "Monthly", a: "#0891B2" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.i}</div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{s.l}</div></div>))}
          </div>
          <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800 }}>{"\u{1F517}"} Linked Companies ({linked.length})</h2>
              {unlinked.length > 0 && <button onClick={() => setShowLinkCompany(tm.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Link</button>}
            </div>
            {linked.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px" }}><span>{"\u{1F3E2}"}</span><div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setSelectedCompany(c); setSelectedTM(null); }}><div style={{ fontSize: "13px", fontWeight: 700, color: "#2563EB" }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{getCompanyVehicles(c.id).length} vehicles</div></div><button onClick={() => unlinkCompany(tm.id, c.id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "10px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Unlink</button></div>))}
            {linked.length === 0 && <p style={{ color: "#94A3B8", fontSize: "13px" }}>No companies linked.</p>}
          </div>
        </>); })()}

        {/* ========== REVENUE TAB ========== */}
        {tab === "revenue" && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>{"\u{1F4B0}"} Revenue & Forecasting</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>MRR, ARR, and growth projections</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "\u{1F4B0}", value: "\u00A3" + mrrNow, label: "Monthly Revenue (MRR)", accent: "#059669" },
              { icon: "\u{1F4C8}", value: "\u00A3" + arrNow.toLocaleString(), label: "Annual Revenue (ARR)", accent: "#2563EB" },
              { icon: "\u{1F4CA}", value: "\u00A3" + months6.toLocaleString(), label: "6-Month Forecast MRR", accent: "#7C3AED" },
              { icon: "\u{1F680}", value: "\u00A3" + months12.toLocaleString(), label: "12-Month Forecast MRR", accent: "#DC2626" },
            ].map(s => (
              <div key={s.label} style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{s.icon}</div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: s.accent }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{s.label}</div>
              </div>))}
          </div>

          {/* Subscription Tier Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>{"\u{1F4CA}"} Revenue by TM</h2>
              {tms.length === 0 ? <p style={{ color: "#94A3B8", fontSize: "13px" }}>No TMs yet</p> :
              tms.map(tm => { const tier = getTMTier(tm.id); const linked = getLinkedCompanies(tm.id); return (
                <div key={tm.id} onClick={() => { setTab("overview"); setSelectedTM(tm); }} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "8px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700 }}>{tm.full_name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{linked.length} companies</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>{"\u00A3"}{TIERS[tier].price}/mo</div>
                    <span style={{ padding: "2px 8px", borderRadius: "10px", background: tier === "enterprise" ? "#DC262615" : tier === "professional" ? "#2563EB15" : "#05966915", color: tier === "enterprise" ? "#DC2626" : tier === "professional" ? "#2563EB" : "#059669", fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>{TIERS[tier].label}</span>
                  </div>
                </div>); })}
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>{"\u{1F4C8}"} Growth Projection</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { month: "Now", mrr: mrrNow, tms: tms.length, bar: 20 },
                  { month: "Month 3", mrr: Math.round(mrrNow * 1.5), tms: Math.round(tms.length * 1.5), bar: 30 },
                  { month: "Month 6", mrr: months6, tms: Math.round(tms.length * 2.5), bar: 50 },
                  { month: "Month 9", mrr: Math.round(mrrNow * 3.8), tms: Math.round(tms.length * 3.8), bar: 76 },
                  { month: "Month 12", mrr: months12, tms: Math.round(tms.length * 5), bar: 100 },
                ].map(p => (
                  <div key={p.month}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>{p.month}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>{"\u00A3"}{p.mrr.toLocaleString()}/mo {"\u00B7"} {p.tms} TMs</span>
                    </div>
                    <div style={{ height: "20px", borderRadius: "10px", background: "#F3F4F6", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: p.bar + "%", borderRadius: "10px", background: `linear-gradient(135deg, #059669, #10B981)`, transition: "width 0.5s" }} />
                    </div>
                  </div>))}
              </div>
              <div style={{ marginTop: "20px", padding: "16px", borderRadius: "12px", background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#065F46", marginBottom: "4px" }}>{"\u{1F680}"} 12-MONTH TARGET</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#059669" }}>{"\u00A3"}{(months12 * 12).toLocaleString()} ARR</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>{"\u{1F3AF}"} Pricing Tiers</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {[
                { tier: "Starter", price: 39, companies: "Up to 5", admins: "1 per company", color: "#059669", features: ["Multi-company dashboard", "Walkaround QR codes", "Defect tracking", "CSV/PDF exports"] },
                { tier: "Professional", price: 79, companies: "Up to 15", admins: "3 per company", color: "#2563EB", features: ["Everything in Starter", "Company Admin logins", "Priority support", "Custom branding"] },
                { tier: "Enterprise", price: 149, companies: "Unlimited", admins: "Unlimited", color: "#7C3AED", features: ["Everything in Pro", "API access", "Dedicated support", "SLA guarantee"] },
              ].map(t => (
                <div key={t.tier} style={{ padding: "24px", borderRadius: "16px", border: "2px solid " + t.color + "30", background: t.color + "08" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: t.color, textTransform: "uppercase", marginBottom: "8px" }}>{t.tier}</div>
                  <div style={{ fontSize: "36px", fontWeight: 800, color: "#0F172A" }}>{"\u00A3"}{t.price}<span style={{ fontSize: "14px", color: "#6B7280", fontWeight: 500 }}>/mo</span></div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "8px", marginBottom: "16px" }}>{t.companies} companies {"\u00B7"} {t.admins}</div>
                  {t.features.map(f => <div key={f} style={{ fontSize: "12px", color: "#374151", padding: "4px 0" }}>{"\u2705"} {f}</div>)}
                </div>))}
            </div>
          </div>
        </>)}

        {/* ========== USERS TAB ========== */}
        {tab === "users" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800 }}>{"\u{1F465}"} User Management</h1><p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{profiles.length} total users</p></div>
            <button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Create TM</button>
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {[{ k: "all", l: "All", c: profiles.length }, { k: "platform_owner", l: "Owner", c: profiles.filter(p => p.role === "platform_owner").length }, { k: "tm", l: "TMs", c: tms.length }, { k: "company_admin", l: "Admins", c: profiles.filter(p => p.role === "company_admin").length }].map(f => (
              <button key={f.k} onClick={() => setUserFilter(f.k)} style={{ padding: "6px 14px", borderRadius: "20px", border: userFilter === f.k ? "none" : "1px solid #E5E7EB", background: userFilter === f.k ? "#0F172A" : "white", color: userFilter === f.k ? "white" : "#6B7280", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{f.l} ({f.c})</button>))}
          </div>
          {filteredUsers.map(p => { const linked = p.role === "tm" ? getLinkedCompanies(p.id) : []; return (
            <div key={p.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "18px 24px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: roleColors[p.role] || "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px" }}>{p.full_name ? p.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: "15px", fontWeight: 700 }}>{p.full_name || "No name"}</div><div style={{ fontSize: "12px", color: "#6B7280" }}>{p.email} {"\u00B7"} Joined {formatDate(p.created_at)}</div></div>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: (roleColors[p.role] || "#6B7280") + "15", color: roleColors[p.role], fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{(p.role || "").replace("_", " ")}</span>
                {p.role !== "platform_owner" && (<div style={{ display: "flex", gap: "6px" }}>
                  <select value={p.role} onChange={e => changeRole(p.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}><option value="tm">TM</option><option value="company_admin">Company Admin</option><option value="company_viewer">Viewer</option></select>
                  <button onClick={() => deleteUser(p.id, p.email)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>{"\u{1F5D1}"}</button>
                </div>)}
              </div>
              {p.role === "tm" && (<div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F3F4F6", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>Companies:</span>
                {linked.map(c => (<span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: "11px", fontWeight: 600, color: "#2563EB" }}>{c.name} <button onClick={() => unlinkCompany(p.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: "12px", fontWeight: 700 }}>{"\u2715"}</button></span>))}
                <button onClick={() => setShowLinkCompany(p.id)} style={{ padding: "3px 10px", borderRadius: "20px", border: "1px dashed #D1D5DB", background: "none", fontSize: "11px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>{"\u2795"} Link</button>
              </div>)}
            </div>); })}
        </>)}

        {/* ========== COMPANIES TAB ========== */}
        {tab === "companies" && !selectedCompany && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "24px" }}>{"\u{1F3E2}"} All Companies ({companies.length})</h1>
          {companies.map(c => { const vCount = getCompanyVehicles(c.id).length; const dCount = getCompanyDefects(c.id).filter(d => d.status === "open" || d.status === "in_progress").length; const chCount = getCompanyChecks(c.id).length; const linkedTMs = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => profiles.find(p => p.id === l.tm_id)).filter(Boolean); return (
            <div key={c.id} onClick={() => setSelectedCompany(c)} style={{ background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: "28px" }}>{"\u{1F3E2}"}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: "15px", fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: "12px", color: "#6B7280" }}>{c.operator_licence || "No licence"}</div>{linkedTMs.length > 0 && <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "4px" }}>{"\u{1F464}"} {linkedTMs.map(t => t.full_name).join(", ")}</div>}</div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }}>{vCount}</div><div style={{ fontSize: "9px", color: "#6B7280" }}>vehicles</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: dCount > 0 ? "#DC2626" : "#10B981" }}>{dCount}</div><div style={{ fontSize: "9px", color: "#6B7280" }}>defects</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 800, color: "#7C3AED" }}>{chCount}</div><div style={{ fontSize: "9px", color: "#6B7280" }}>checks</div></div>
              </div>
              <span style={{ color: "#94A3B8" }}>{"\u2192"}</span>
            </div>); })}
        </>)}

        {tab === "companies" && selectedCompany && (() => { const c = selectedCompany; const cv = getCompanyVehicles(c.id); const cd = getCompanyDefects(c.id); const cc = getCompanyChecks(c.id); const openD = cd.filter(d => d.status === "open" || d.status === "in_progress"); return (<>
          <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", fontSize: "13px", color: "#2563EB", fontWeight: 600, cursor: "pointer", marginBottom: "16px", fontFamily: "inherit" }}>{"\u2190"} Back</button>
          <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "24px" }}>{"\u{1F3E2}"} {c.name}</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[{ i: "\u{1F69B}", v: cv.length, l: "Vehicles", a: "#059669" }, { i: "\u26A0\uFE0F", v: openD.length, l: "Defects", a: "#DC2626" }, { i: "\u{1F4CB}", v: cc.length, l: "Checks", a: "#7C3AED" }].map(s => (
              <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB" }}><div style={{ fontSize: "22px", marginBottom: "4px" }}>{s.i}</div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{s.l}</div></div>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Vehicles</h2>
              {cv.map(v => (<div key={v.id} onClick={() => window.location.href = "/vehicles"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}><div style={{ fontSize: "13px", fontWeight: 700 }}>{v.reg}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div>))}
            </div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px" }}>Defects</h2>
              {cd.slice(0, 10).map(d => (<div key={d.id} onClick={() => window.location.href = "/defects"} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "6px", cursor: "pointer", background: d.severity === "dangerous" ? "#FEF2F2" : "", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#FECACA"} onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}><div style={{ fontSize: "13px", fontWeight: 700 }}>{d.title}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{d.vehicle_reg} {"\u00B7"} {d.severity}</div></div>))}
              {cd.length === 0 && <p style={{ color: "#10B981" }}>{"\u2705"} Clean</p>}
            </div>
          </div>
        </>); })()}

        </>)}
      </main>

      {/* MODALS */}
      {showInviteTM && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowInviteTM(false)}>
        <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{"\u2795"} Create Transport Manager</h2></div>
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Full Name *</label><input value={inviteForm.full_name} onChange={e => setInviteForm({...inviteForm, full_name: e.target.value})} placeholder="John Smith" style={inputStyle} /></div>
            <div><label style={labelStyle}>Email *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="john@example.com" style={inputStyle} /></div>
            <div><label style={labelStyle}>Temporary Password *</label><input value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} placeholder="min 6 characters" style={inputStyle} /></div>
            {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
          </div>
          <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={() => setShowInviteTM(false)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
            <button onClick={createTMAccount} disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name || !inviteForm.password} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: inviteForm.email && inviteForm.full_name && inviteForm.password ? "#2563EB" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{inviteLoading ? "Creating..." : "Create TM"}</button>
          </div>
        </div>
      </div>)}

      {showLinkCompany && (() => { const unlinked = getUnlinkedCompanies(showLinkCompany); return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowLinkCompany(null)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{"\u{1F517}"} Link Company</h2></div>
            <div style={{ padding: "24px 28px" }}>{unlinked.length === 0 ? <p style={{ color: "#94A3B8" }}>All linked</p> : unlinked.map(c => (
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

