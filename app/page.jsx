"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../lib/supabase";

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

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!isSupabaseReady()) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data);
          if (data.role !== "platform_owner") { window.location.href = "/dashboard"; return; }
        }
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
    setProfiles(pRes.data || []);
    setCompanies(cRes.data || []);
    setVehicles(vRes.data || []);
    setDefects(dRes.data || []);
    setChecks(chRes.data || []);
    setTmCompanyLinks(tcRes.data || []);
    setLoading(false);
  }

  async function createTMAccount() {
    setInviteLoading(true); setInviteMsg("");
    const { data, error } = await supabase.auth.signUp({
      email: inviteForm.email, password: inviteForm.password,
      options: { data: { full_name: inviteForm.full_name, role: "tm" } }
    });
    if (error) { setInviteMsg("Error: " + error.message); setInviteLoading(false); return; }
    flash("TM account created for " + inviteForm.email);
    setShowInviteTM(false); setInviteForm({ email: "", full_name: "", password: "" });
    setInviteLoading(false);
    setTimeout(() => loadData(), 1500);
  }

  async function changeRole(userId, newRole) {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    flash("Role updated to " + newRole.replace("_", " "));
    loadData();
  }

  async function deleteUser(userId, email) {
    if (!confirm("Delete user " + email + "? This cannot be undone.")) return;
    await supabase.from("tm_companies").delete().eq("tm_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    flash("User removed"); loadData();
  }

  async function linkCompanyToTM(tmId, companyId) {
    await supabase.from("tm_companies").insert({ tm_id: tmId, company_id: companyId });
    flash("Company linked"); setShowLinkCompany(null); loadData();
  }

  async function unlinkCompany(tmId, companyId) {
    await supabase.from("tm_companies").delete().match({ tm_id: tmId, company_id: companyId });
    flash("Company unlinked"); loadData();
  }

  const tms = profiles.filter(p => p.role === "tm");
  const openDefects = defects.filter(d => d.status === "open" || d.status === "in_progress").length;
  const dangerousDefects = defects.filter(d => d.severity === "dangerous" && d.status !== "closed").length;

  function getLinkedCompanies(tmId) {
    const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id);
    return companies.filter(c => ids.includes(c.id));
  }
  function getUnlinkedCompanies(tmId) {
    const ids = tmCompanyLinks.filter(l => l.tm_id === tmId).map(l => l.company_id);
    return companies.filter(c => !ids.includes(c.id));
  }

  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" };

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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {["overview", "users", "companies"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: tab === t ? "rgba(255,255,255,0.15)" : "none", color: tab === t ? "white" : "#94A3B8", fontSize: "12px", fontWeight: 700, cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{"\u{1F4CA}"} TM View</a>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #EF4444, #DC2626)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>
              {profile?.full_name ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "SA"}
            </div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "48px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "200px", zIndex: 200 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{profile?.full_name}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>{profile?.email}</div>
                <div style={{ fontSize: "10px", color: "#DC2626", fontWeight: 600, marginTop: "4px" }}>PLATFORM OWNER</div>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F6AA}"} Sign Out</button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> : (<>

        {tab === "overview" && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>{"\u{1F6E0}\uFE0F"} Platform Overview</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>Real-time platform metrics</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "\u{1F464}", value: tms.length, label: "Transport Managers", accent: "#2563EB" },
              { icon: "\u{1F3E2}", value: companies.length, label: "Companies", accent: "#0F172A" },
              { icon: "\u{1F69B}", value: vehicles.length, label: "Active Vehicles", accent: "#059669" },
              { icon: "\u26A0\uFE0F", value: openDefects, label: "Open Defects", accent: "#DC2626" },
              { icon: "\u{1F4CB}", value: checks.length, label: "Total Checks", accent: "#7C3AED" },
              { icon: "\u{1F465}", value: profiles.length, label: "Total Users", accent: "#0891B2" },
            ].map(s => (
              <div key={s.label} style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{s.icon}</div>
                <div><div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{s.label}</div></div>
              </div>))}
          </div>
          {dangerousDefects > 0 && (
            <div style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{dangerousDefects} dangerous defect{dangerousDefects > 1 ? "s" : ""} across platform</div>
            </div>)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>{"\u{1F464}"} Transport Managers ({tms.length})</h2>
              {tms.length === 0 ? <p style={{ color: "#94A3B8", fontSize: "13px" }}>No TMs registered yet</p> :
              tms.map(tm => { const linked = getLinkedCompanies(tm.id); return (
                <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{tm.full_name ? tm.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{tm.full_name || "No name"}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{tm.email} {"\u00B7"} {linked.length} companies</div></div>
                  <span style={{ fontSize: "11px", color: "#059669", fontWeight: 600 }}>{formatDate(tm.created_at)}</span>
                </div>); })}
            </div>
            <div style={{ background: "#FFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>{"\u{1F3E2}"} Companies ({companies.length})</h2>
              {companies.map(c => { const vCount = vehicles.filter(v => v.company_id === c.id).length; return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{"\u{1F3E2}"}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{c.operator_licence || "No licence"} {"\u00B7"} {vCount} vehicles</div></div>
                </div>); })}
            </div>
          </div>
        </>)}

        {tab === "users" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F465}"} User Management</h1><p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Create and manage TMs, Company Admins, and Viewers</p></div>
            <button onClick={() => setShowInviteTM(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Create TM Account</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {profiles.map(p => { const linked = p.role === "tm" ? getLinkedCompanies(p.id) : []; const roleColors = { platform_owner: "#DC2626", tm: "#059669", company_admin: "#2563EB", company_viewer: "#64748B" }; return (
              <div key={p.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "18px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: (roleColors[p.role] || "#6B7280"), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px" }}>{p.full_name ? p.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{p.full_name || "No name"}</div><div style={{ fontSize: "12px", color: "#6B7280" }}>{p.email} {"\u00B7"} Joined {formatDate(p.created_at)}</div></div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", background: (roleColors[p.role] || "#6B7280") + "15", color: roleColors[p.role] || "#6B7280", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>{(p.role || "").replace("_", " ")}</span>
                  {p.role !== "platform_owner" && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <select value={p.role} onChange={e => changeRole(p.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "11px", fontWeight: 600, background: "#FFF", cursor: "pointer" }}>
                        <option value="tm">TM</option><option value="company_admin">Company Admin</option><option value="company_viewer">Company Viewer</option>
                      </select>
                      <button onClick={() => deleteUser(p.id, p.email)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>{"\u{1F5D1}"}</button>
                    </div>)}
                </div>
                {p.role === "tm" && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F3F4F6", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>Companies:</span>
                    {linked.map(c => (
                      <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: "11px", fontWeight: 600, color: "#2563EB" }}>
                        {c.name} <button onClick={() => unlinkCompany(p.id, c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: "12px", fontWeight: 700 }}>{"\u2715"}</button></span>))}
                    <button onClick={() => setShowLinkCompany(p.id)} style={{ padding: "3px 10px", borderRadius: "20px", border: "1px dashed #D1D5DB", background: "none", fontSize: "11px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>{"\u2795"} Link Company</button>
                  </div>)}
              </div>); })}
          </div>
        </>)}

        {tab === "companies" && (<>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>{"\u{1F3E2}"} All Companies</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>{companies.length} companies across all TMs</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {companies.map(c => { const vCount = vehicles.filter(v => v.company_id === c.id).length; const linkedTMs = tmCompanyLinks.filter(l => l.company_id === c.id).map(l => { const tm = profiles.find(p => p.id === l.tm_id); return tm ? tm.full_name || tm.email : "Unknown"; }); return (
              <div key={c.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "28px" }}>{"\u{1F3E2}"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>{c.name}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>{c.operator_licence || "No licence"} {"\u00B7"} {vCount} vehicles {"\u00B7"} {c.contact_email || ""}</div>
                  {linkedTMs.length > 0 && <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, marginTop: "4px" }}>{"\u{1F464}"} Managed by: {linkedTMs.join(", ")}</div>}
                </div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "#6B7280" }}>Added</div><div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{formatDate(c.created_at)}</div></div>
              </div>); })}
          </div>
        </>)}

        </>)}
      </main>

      {showInviteTM && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowInviteTM(false)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u2795"} Create Transport Manager</h2>
              <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>This creates a TM account they can log in with</p>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>Full Name *</label><input value={inviteForm.full_name} onChange={e => setInviteForm({...inviteForm, full_name: e.target.value})} placeholder="John Smith" style={inputStyle} /></div>
              <div><label style={labelStyle}>Email *</label><input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="john@example.com" style={inputStyle} /></div>
              <div><label style={labelStyle}>Temporary Password *</label><input value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} placeholder="min 6 characters" style={inputStyle} /></div>
              {inviteMsg && <div style={{ padding: "10px", borderRadius: "8px", background: "#FEF2F2", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>{inviteMsg}</div>}
            </div>
            <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowInviteTM(false)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
              <button onClick={createTMAccount} disabled={inviteLoading || !inviteForm.email || !inviteForm.full_name || !inviteForm.password} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: inviteForm.email && inviteForm.full_name && inviteForm.password ? "linear-gradient(135deg, #2563EB, #3B82F6)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{inviteLoading ? "Creating..." : "Create TM Account"}</button>
            </div>
          </div>
        </div>)}

      {showLinkCompany && (() => { const unlinked = getUnlinkedCompanies(showLinkCompany); return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowLinkCompany(null)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}><h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F517}"} Link Company to TM</h2></div>
            <div style={{ padding: "24px 28px" }}>
              {unlinked.length === 0 ? <p style={{ color: "#94A3B8", fontSize: "13px" }}>All companies already linked</p> :
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {unlinked.map(c => (
                  <button key={c.id} onClick={() => linkCompanyToTM(showLinkCompany, c.id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "#FFF"}>
                    <span>{"\u{1F3E2}"}</span><div><div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{c.name}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{vehicles.filter(v => v.company_id === c.id).length} vehicles</div></div>
                  </button>))}
              </div>}
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC" }}>
              <button onClick={() => setShowLinkCompany(null)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>); })()}

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} Platform Owner Control Panel {"\u00B7"} {"\u00A9"} 2026</footer>
      {toast && (<div style={{ position: "fixed", top: "80px", right: "20px", zIndex: 2000, padding: "14px 24px", borderRadius: "12px", background: toast.type === "success" ? "#059669" : "#DC2626", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>{toast.type === "success" ? "\u2705" : "\u26A0\uFE0F"} {toast.message}</div>)}
    </div>
  );
}
