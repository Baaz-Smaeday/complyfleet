"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ConfirmDialog, Toast } from "../../components/ConfirmDialog";

const TODAY = new Date("2026-02-16");
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "na"; if (days < 0) return "overdue"; if (days <= 7) return "critical"; if (days <= 30) return "warning"; return "ok"; }

const RISK = {
  overdue: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "OVERDUE" },
  critical: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "DUE SOON" },
  warning: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "UPCOMING" },
  ok: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
  na: { bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF", label: "N/A" },
};
const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };
const DATE_FIELDS = [
  { key: "mot_due", label: "MOT", icon: "\u{1F4CB}" }, { key: "pmi_due", label: "PMI", icon: "\u{1F527}" },
  { key: "insurance_due", label: "Insurance", icon: "\u{1F6E1}\uFE0F" }, { key: "tacho_due", label: "Tacho", icon: "\u23F1\uFE0F" },
  { key: "service_due", label: "Service", icon: "\u2699\uFE0F" },
];

function DateBadge({ date }) {
  const days = getDaysUntil(date); const risk = getRisk(days); const cfg = RISK[risk];
  if (!date) return <span style={{ color: "#D1D5DB", fontSize: "12px" }}>{"\u2014"}</span>;
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
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u270F\uFE0F"} Edit {vehicle.reg}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BFDBFE" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "10px" }}>{"\u{1F4C5}"} Update Compliance Dates</div>
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
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving} style={{
            padding: "10px 24px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #0F172A, #1E293B)",
            color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
          }}>{saving ? "Saving..." : "\u{1F4BE} Save Changes"}</button>
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

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    if (isSupabaseReady()) {
      const { data: cos } = await supabase.from("companies").select("*").is("archived_at", null).order("name");
      const { data: vehs } = await supabase.from("vehicles").select("*").order("reg");
      setCompanies(cos || []); setVehicles(vehs || []);
    } else {
      setCompanies([{ id: "c1", name: "Hargreaves Haulage Ltd" }, { id: "c2", name: "Northern Express Transport" }, { id: "c3", name: "Yorkshire Fleet Services" }, { id: "c4", name: "Pennine Logistics Group" }]);
      setVehicles([
        { id: "v1", company_id: "c1", company_name: "Hargreaves Haulage Ltd", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", year: 2020, mot_due: "2026-02-18", pmi_due: "2026-02-14", insurance_due: "2026-06-15", tacho_due: "2026-09-01", service_due: "2026-03-20", pmi_interval: 6, archived_at: null },
        { id: "v2", company_id: "c1", company_name: "Hargreaves Haulage Ltd", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", year: 2019, mot_due: "2026-05-22", pmi_due: "2026-02-20", insurance_due: "2026-08-30", tacho_due: "2026-07-15", service_due: "2026-04-10", pmi_interval: 6, archived_at: null },
        { id: "v3", company_id: "c1", company_name: "Hargreaves Haulage Ltd", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", year: 2020, mot_due: "2026-07-11", pmi_due: "2026-03-28", insurance_due: "2026-11-05", tacho_due: null, service_due: "2026-05-15", pmi_interval: 8, archived_at: null },
        { id: "v5", company_id: "c2", company_name: "Northern Express Transport", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", year: 2022, mot_due: "2026-02-19", pmi_due: "2026-03-05", insurance_due: "2026-05-20", tacho_due: "2026-10-12", service_due: "2026-04-22", pmi_interval: 6, archived_at: null },
        { id: "v8", company_id: "c3", company_name: "Yorkshire Fleet Services", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480", year: 2020, mot_due: "2026-03-15", pmi_due: "2026-02-10", insurance_due: "2026-04-28", tacho_due: "2026-06-20", service_due: "2026-03-25", pmi_interval: 6, archived_at: null },
        { id: "v9", company_id: "c3", company_name: "Yorkshire Fleet Services", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450", year: 2019, mot_due: "2026-02-12", pmi_due: "2026-02-28", insurance_due: "2026-06-30", tacho_due: "2026-07-25", service_due: "2026-04-15", pmi_interval: 6, archived_at: null },
        { id: "v10", company_id: "c4", company_name: "Pennine Logistics Group", reg: "LN54 BCD", type: "HGV", make: "MAN", model: "TGX 18.470", year: 2021, mot_due: "2026-08-10", pmi_due: "2026-04-20", insurance_due: "2026-09-25", tacho_due: "2026-11-10", service_due: "2026-06-05", pmi_interval: 6, archived_at: null },
      ]);
    }
    setLoading(false);
  }

  async function saveVehicle(form) {
    const updates = {};
    DATE_FIELDS.forEach(f => { updates[f.key] = form[f.key] || null; });
    updates.pmi_interval = form.pmi_interval;

    if (isSupabaseReady()) {
      await supabase.from("vehicles").update(updates).eq("id", form.id);
      await loadData();
    } else {
      setVehicles(prev => prev.map(v => v.id === form.id ? { ...v, ...updates } : v));
    }
    flash("Vehicle dates updated"); setEditVehicle(null);
  }

  async function archiveVehicle(id, reg) {
    const ts = new Date().toISOString();
    if (isSupabaseReady()) { await supabase.from("vehicles").update({ archived_at: ts }).eq("id", id); await loadData(); }
    else setVehicles(prev => prev.map(v => v.id === id ? { ...v, archived_at: ts } : v));
    flash(`${reg} archived`); setConfirm(null);
  }

  async function restoreVehicle(id, reg) {
    if (isSupabaseReady()) { await supabase.from("vehicles").update({ archived_at: null }).eq("id", id); await loadData(); }
    else setVehicles(prev => prev.map(v => v.id === id ? { ...v, archived_at: null } : v));
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
    if (!showArchived) {
      vehs = [...vehs].sort((a, b) => {
        const aDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(a[f.key]) ?? 9999));
        const bDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(b[f.key]) ?? 9999));
        return aDays - bDays;
      });
    }
    return vehs;
  }, [displayVehicles, selectedCompany, typeFilter, search, showArchived]);

  const overdue = allActive.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d < 0; })).length;
  const dueSoon = allActive.filter(v => { const w = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f.key]) ?? 9999)); return w >= 0 && w <= 7; }).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!isSupabaseReady() && <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(251,191,36,0.2)", color: "#FCD34D", fontSize: "10px", fontWeight: 700 }}>DEMO MODE</span>}
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F69B}"} Vehicle Compliance</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{filtered.length} vehicles {"\u2014"} sorted by risk</p></div>
          <button onClick={() => setShowArchived(!showArchived)} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid", borderColor: showArchived ? "#FDE68A" : "#E5E7EB", background: showArchived ? "#FEF3C7" : "#FFF", fontSize: "12px", fontWeight: 700, color: showArchived ? "#92400E" : "#6B7280", cursor: "pointer" }}>{showArchived ? `\u{1F4E6} Archived (${allArchived.length})` : `\u{1F4E6} Show Archived (${allArchived.length})`}</button>
        </div>

        {!showArchived && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[{ icon: "\u{1F534}", value: overdue, label: "Overdue", accent: "#DC2626" }, { icon: "\u{1F7E1}", value: dueSoon, label: "Due \u2264 7 Days", accent: "#D97706" }, { icon: "\u{1F7E2}", value: allActive.length - overdue - dueSoon, label: "Compliant", accent: "#059669" }, { icon: "\u{1F4E6}", value: allArchived.length, label: "Archived", accent: "#64748B" }].map(s => (
            <div key={s.label} style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{s.icon}</div>
              <div><div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{s.label}</div></div>
            </div>))}
        </div>}

        {overdue > 0 && !showArchived && <div style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
          <div><div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{overdue} vehicle{overdue > 1 ? "s have" : " has"} overdue dates</div><div style={{ fontSize: "12px", color: "#DC2626" }}>Overdue MOT/PMI may result in DVSA prohibition</div></div>
        </div>}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
            <option value="all">All Companies</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {["all", "HGV", "Van", "Trailer"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: typeFilter === t ? "#0F172A" : "#F1F5F9", color: typeFilter === t ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {t === "all" ? "All" : `${TYPES[t]} ${t}`}</button>))}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{"\u{1F50D}"}</span>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "13px", width: "200px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
              <thead><tr style={{ background: "#F8FAFC" }}>
                {["Vehicle", "Company", "Risk", "MOT", "PMI", "Insurance", "Tacho", "Service", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading...</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>No vehicles match filters</td></tr> :
                filtered.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6", opacity: v.archived_at ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                        <div><div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", fontFamily: "monospace" }}>{v.reg}</div>
                          <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model} {"\u00B7"} {v.type}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: "14px", fontSize: "12px", color: "#374151", fontWeight: 500 }}>{(v.company_name || companies.find(c => c.id === v.company_id)?.name || "").split(" ").slice(0, 2).join(" ")}</td>
                    <td style={{ padding: "14px" }}>{v.archived_at ? <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F3F4F6", fontSize: "10px", fontWeight: 700, color: "#6B7280" }}>ARCHIVED</span> : <VehicleRiskPill vehicle={v} />}</td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.mot_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.pmi_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.insurance_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.tacho_due} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.service_due} /></td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {v.archived_at ? (
                          <button onClick={() => restoreVehicle(v.id, v.reg)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #6EE7B7", background: "#ECFDF5", fontSize: "10px", fontWeight: 700, color: "#065F46", cursor: "pointer" }}>{"\u{1F504}"} Restore</button>
                        ) : (<>
                          <button onClick={() => setEditVehicle(v)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>{"\u270F\uFE0F"} Edit</button>
                          <button onClick={() => setConfirm({ title: "Archive Vehicle?", message: `${v.reg} will be removed from active fleet. You can restore it anytime.`, icon: "\u{1F4E6}", confirmLabel: "Archive", confirmColor: "#D97706", onConfirm: () => archiveVehicle(v.id, v.reg) })} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FFFBEB", fontSize: "10px", fontWeight: 700, color: "#92400E", cursor: "pointer" }}>{"\u{1F4E6}"}</button>
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
          {[{ c: "#EF4444", l: "Overdue" }, { c: "#F59E0B", l: "\u2264 7 days" }, { c: "#3B82F6", l: "\u2264 30 days" }, { c: "#10B981", l: "Compliant" }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: x.c }} /><span style={{ fontSize: "11px", color: "#374151", fontWeight: 500 }}>{x.l}</span></div>))}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>

      {editVehicle && <EditVehicleModal vehicle={editVehicle} onSave={saveVehicle} onClose={() => setEditVehicle(null)} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
