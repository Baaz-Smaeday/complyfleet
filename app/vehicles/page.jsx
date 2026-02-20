"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ConfirmDialog, Toast } from "../../components/ConfirmDialog";
import ExportDropdown from "../../components/ExportDropdown";
import { exportFleetCSV, printReport } from "../../lib/utils";

const TODAY = new Date();
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "na"; if (days < 0) return "overdue"; if (days <= 7) return "critical"; if (days <= 30) return "warning"; return "ok"; }

const RISK = {
  overdue: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "OVERDUE" },
  critical: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "DUE SOON" },
  warning: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "UPCOMING" },
  ok: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
  na: { bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF", label: "N/A" },
};
const TYPES = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };
const DATE_FIELDS = [
  { key: "mot_due", label: "MOT", icon: "📋" }, { key: "pmi_due", label: "PMI", icon: "🔧" },
  { key: "insurance_due", label: "Insurance", icon: "🛡️" }, { key: "tacho_due", label: "Tacho", icon: "⏱️" },
  { key: "service_due", label: "Service", icon: "⚙️" },
];

function DateBadge({ date }) {
  const days = getDaysUntil(date); const risk = getRisk(days); const cfg = RISK[risk];
  if (!date) return <span style={{ color: "#D1D5DB", fontSize: "12px" }}>—</span>;
  return (<div style={{ display: "inline-flex", flexDirection: "column", padding: "4px 10px", borderRadius: "8px", background: cfg.bg, border: `1px solid ${cfg.border}` }}>
    <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.text, fontFamily: "monospace" }}>{formatDate(date)}</span>
    <span style={{ fontSize: "10px", fontWeight: 600, color: cfg.text, opacity: 0.8, marginTop: "1px" }}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}</span>
  </div>);
}

function VehicleRiskPill({ vehicle }) {
  const allDays = DATE_FIELDS.map(f => getDaysUntil(vehicle[f.key])).filter(d => d !== null);
  const worst = allDays.length ? Math.min(...allDays) : 9999;
  const risk = getRisk(worst); const cfg = RISK[risk];
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, letterSpacing: "0.05em" }}>
    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
  </span>);
}

function EditVehicleModal({ vehicle, onSave, onClose }) {
  const [form, setForm] = useState({ ...vehicle });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "520px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>✏️ Edit {vehicle.reg}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>✕</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BFDBFE" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "10px" }}>📅 Update Compliance Dates</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {DATE_FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>{f.icon} {f.label}</label>
                  <input type="date" value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>PMI Interval (wks)</label>
                <input type="number" value={form.pmi_interval || 6} onChange={e => set("pmi_interval", parseInt(e.target.value) || 6)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "💾 Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ComplyFleetVehicle() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [riskFilter, setRiskFilter] = useState("all");

  // ✅ NEW: detect company admin
  const isCompanyAdmin = profile?.role === "company_admin" || profile?.role === "company_viewer";

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("filter")) setRiskFilter(params.get("filter"));
    if (params.get("showArchived") === "1") setShowArchived(true);
    if (params.get("company")) setSelectedCompany(params.get("company"));
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) { setProfile(data); loadData(data); }
        });
      });
    } else { loadData(null); }
  }, []);

  async function loadData(userProfile) {
    setLoading(true);
    if (isSupabaseReady()) {
      let companyIds = null;

      if (userProfile?.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (userProfile?.role === "company_admin" || userProfile?.role === "company_viewer") {
        // ✅ Company admin: only their own company
        const { data: comp } = await supabase.from("companies").select("id").eq("user_id", userProfile.id).single();
        companyIds = comp ? [comp.id] : [];
      }

      const ids = companyIds?.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"];
      let cQuery = supabase.from("companies").select("*").is("archived_at", null).order("name");
      if (companyIds) cQuery = cQuery.in("id", ids);
      let vQuery = supabase.from("vehicles").select("*").order("reg");
      if (companyIds) vQuery = vQuery.in("company_id", ids);

      const [cRes, vRes] = await Promise.all([cQuery, vQuery]);
      setCompanies(cRes.data || []); setVehicles(vRes.data || []);
    }
    setLoading(false);
  }

  async function saveVehicle(form) {
    const updates = {};
    DATE_FIELDS.forEach(f => { updates[f.key] = form[f.key] || null; });
    updates.pmi_interval = form.pmi_interval;
    await supabase.from("vehicles").update(updates).eq("id", form.id);
    await loadData(profile);
    flash("Vehicle dates updated"); setEditVehicle(null);
  }

  async function archiveVehicle(id, reg) {
    const ts = new Date().toISOString();
    await supabase.from("vehicles").update({ archived_at: ts }).eq("id", id);
    await loadData(profile);
    flash(`${reg} archived`); setConfirm(null);
  }

  async function restoreVehicle(id, reg) {
    await supabase.from("vehicles").update({ archived_at: null }).eq("id", id);
    await loadData(profile);
    flash(`${reg} restored`);
  }

  const allActive = vehicles.filter(v => !v.archived_at);
  const allArchived = vehicles.filter(v => v.archived_at);
  const displayVehicles = showArchived ? allArchived : allActive;

  const filtered = useMemo(() => {
    let vehs = displayVehicles;
    if (selectedCompany !== "all") vehs = vehs.filter(v => v.company_id === selectedCompany);
    if (typeFilter !== "all") vehs = vehs.filter(v => v.type === typeFilter);
    if (search) { const q = search.toLowerCase(); vehs = vehs.filter(v => v.reg.toLowerCase().includes(q) || (v.make || "").toLowerCase().includes(q) || (v.model || "").toLowerCase().includes(q)); }
    if (riskFilter === "overdue") vehs = vehs.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d < 0; }));
    else if (riskFilter === "due7") vehs = vehs.filter(v => { const w = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f.key]) ?? 9999)); return w >= 0 && w <= 7; });
    else if (riskFilter === "compliant") vehs = vehs.filter(v => { const w = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f.key]) ?? 9999)); return w > 7; });
    if (!showArchived) {
      vehs = [...vehs].sort((a, b) => {
        const aDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(a[f.key]) ?? 9999));
        const bDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(b[f.key]) ?? 9999));
        return aDays - bDays;
      });
    }
    return vehs;
  }, [displayVehicles, selectedCompany, typeFilter, search, showArchived, riskFilter]);

  const overdue = allActive.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d < 0; })).length;
  const dueSoon = allActive.filter(v => { const w = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f.key]) ?? 9999)); return w >= 0 && w <= 7; }).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* ✅ Back button */}
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", color: "white", fontSize: "12px", fontWeight: 700, textDecoration: "none", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>🚛 Vehicle Compliance</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{filtered.length} vehicles — sorted by risk</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <ExportDropdown
              onCSV={() => exportFleetCSV(filtered, `fleet-${riskFilter !== "all" ? riskFilter + "-" : ""}${new Date().toISOString().split("T")[0]}.csv`)}
              onPDF={() => printReport("Vehicle Compliance", `${filtered.length} vehicles`, ["Reg", "Type", "Make/Model", "MOT", "PMI", "Insurance", "Tacho", "Service"], filtered.map(v => { const fd = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-"; return [v.reg, v.type, `${v.make||""} ${v.model||""}`, fd(v.mot_due), fd(v.pmi_due), fd(v.insurance_due), fd(v.tacho_due), fd(v.service_due)]; }), () => "")}
            />
            <button onClick={() => setShowArchived(!showArchived)} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid", borderColor: showArchived ? "#FDE68A" : "#E5E7EB", background: showArchived ? "#FEF3C7" : "#FFF", fontSize: "12px", fontWeight: 700, color: showArchived ? "#92400E" : "#6B7280", cursor: "pointer" }}>
              {showArchived ? `📦 Archived (${allArchived.length})` : `📦 Show Archived (${allArchived.length})`}
            </button>
          </div>
        </div>

        {!showArchived && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { icon: "🔴", value: overdue, label: "Overdue", accent: "#DC2626", f: "overdue" },
              { icon: "🟡", value: dueSoon, label: "Due ≤ 7 Days", accent: "#D97706", f: "due7" },
              { icon: "🟢", value: allActive.length - overdue - dueSoon, label: "Compliant", accent: "#059669", f: "compliant" },
              { icon: "📦", value: allArchived.length, label: "Archived", accent: "#64748B", f: "archived" },
            ].map(s => (
              <div key={s.label} onClick={() => { if (s.f === "archived") setShowArchived(true); else { setShowArchived(false); setRiskFilter(riskFilter === s.f ? "all" : s.f); } }}
                style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: `2px solid ${riskFilter === s.f ? s.accent : "#E5E7EB"}`, display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{s.icon}</div>
                <div><div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{s.label}</div></div>
              </div>
            ))}
          </div>
        )}

        {riskFilter !== "all" && (
          <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>Filtered: <strong>{riskFilter}</strong></span>
            <button onClick={() => setRiskFilter("all")} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "11px", fontWeight: 700, color: "#6B7280", cursor: "pointer" }}>✕ Clear</button>
          </div>
        )}

        {overdue > 0 && !showArchived && (
          <div style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>🚨</span>
            <div><div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{overdue} vehicle{overdue > 1 ? "s have" : " has"} overdue dates</div><div style={{ fontSize: "12px", color: "#DC2626" }}>Overdue MOT/PMI may result in DVSA prohibition</div></div>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          {/* ✅ Only show company filter for TMs, not company admins */}
          {!isCompanyAdmin && (
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {["all", "HGV", "Van", "Trailer"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: typeFilter === t ? "#0F172A" : "#F1F5F9", color: typeFilter === t ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {t === "all" ? "All" : `${TYPES[t]} ${t}`}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>🔍</span>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "13px", width: "200px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
              <thead><tr style={{ background: "#F8FAFC" }}>
                {/* ✅ Hide Company column for company admins */}
                {["Vehicle", ...(isCompanyAdmin ? [] : ["Company"]), "Risk", "MOT", "PMI", "Insurance", "Tacho", "Service", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>No vehicles match filters</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6", opacity: v.archived_at ? 0.6 : 1, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; }} onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", fontFamily: "monospace" }}>{v.reg}</div>
                          <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model} · {v.type}</div>
                        </div>
                      </div>
                    </td>
                    {/* ✅ Hide company column for company admins */}
                    {!isCompanyAdmin && (
                      <td style={{ padding: "14px", fontSize: "12px", color: "#374151", fontWeight: 500 }}>
                        {(v.company_name || companies.find(c => c.id === v.company_id)?.name || "").split(" ").slice(0, 2).join(" ")}
                      </td>
                    )}
                    <td style={{ padding: "14px" }}>{v.archived_at ? <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F3F4F6", fontSize: "10px", fontWeight: 700, color: "#6B7280" }}>ARCHIVED</span> : <VehicleRiskPill vehicle={v} />}</td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.mot_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.pmi_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.insurance_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.tacho_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.service_due} /></td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {v.archived_at ? (
                          <button onClick={() => restoreVehicle(v.id, v.reg)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6EE7B7", background: "#ECFDF5", fontSize: "10px", fontWeight: 700, color: "#065F46", cursor: "pointer" }}>🔄 Restore</button>
                        ) : (<>
                          <button onClick={() => setEditVehicle(v)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>✏️ Edit</button>
                          <button onClick={() => setConfirm({ title: "Archive Vehicle?", message: `${v.reg} will be removed from active fleet. You can restore it anytime.`, icon: "📦", confirmLabel: "Archive", confirmColor: "#D97706", onConfirm: () => archiveVehicle(v.id, v.reg) })} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FFFBEB", fontSize: "10px", fontWeight: 700, color: "#92400E", cursor: "pointer" }}>📦</button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: "16px", padding: "14px 20px", borderRadius: "12px", background: "#FFF", border: "1px solid #E5E7EB", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280" }}>KEY:</span>
          {[{ c: "#EF4444", l: "Overdue" }, { c: "#F59E0B", l: "≤ 7 days" }, { c: "#3B82F6", l: "≤ 30 days" }, { c: "#10B981", l: "Compliant" }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: x.c }} />
              <span style={{ fontSize: "11px", color: "#374151", fontWeight: 500 }}>{x.l}</span>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 · DVSA Compliance Platform · © 2026</footer>

      {editVehicle && <EditVehicleModal vehicle={editVehicle} onSave={saveVehicle} onClose={() => setEditVehicle(null)} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
