"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ShieldIcon } from "../../components/ComplyFleetLogo";

const TODAY = new Date();
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high:   { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "OVERDUE",  glow: "220,38,38" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "7 DAYS",   glow: "217,119,6" },
  low:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "30 DAYS",  glow: "37,99,235" },
  green:  { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK",        glow: "5,150,105" },
};
const DATE_FIELDS = ["mot_due", "pmi_due", "insurance_due", "tacho_due", "service_due"];
const FIELD_LABELS = { mot_due: "MOT", pmi_due: "PMI", insurance_due: "Insurance", tacho_due: "Tacho", service_due: "Service" };
const TYPES = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };

function RiskPill({ level }) {
  const cfg = RISK[level];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text }}>
    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
  </span>;
}

function AddVehicleModal({ onSave, onClose, companies, defaultCompanyId }) {
  const [form, setForm] = useState({ reg: "", make: "", model: "", type: "HGV", company_id: defaultCompanyId || (companies[0]?.id || ""), year: "", mot_due: "", pmi_due: "", insurance_due: "", tacho_due: "", service_due: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>🚛 Add Vehicle</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>✕</button>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Registration *</label>
              <input value={form.reg} onChange={e => set("reg", e.target.value.toUpperCase())} placeholder="BD63 XYZ" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "monospace", outline: "none" }} /></div>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", background: "#FFF", fontFamily: "inherit" }}>
                <option value="HGV">HGV</option><option value="Van">Van</option><option value="Trailer">Trailer</option>
              </select></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Make</label>
              <input value={form.make} onChange={e => set("make", e.target.value)} placeholder="Volvo" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} /></div>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Model</label>
              <input value={form.model} onChange={e => set("model", e.target.value)} placeholder="FH" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} /></div>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Year</label>
              <input value={form.year} onChange={e => set("year", e.target.value)} placeholder="2020" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} /></div>
          </div>
          {!defaultCompanyId && companies.length > 0 && (
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Company</label>
              <select value={form.company_id} onChange={e => set("company_id", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", background: "#FFF", fontFamily: "inherit" }}>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          )}
          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "10px" }}>📅 Compliance Dates</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {DATE_FIELDS.map(f => (
                <div key={f}><label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#6B7280", marginBottom: "5px", textTransform: "uppercase" }}>{FIELD_LABELS[f]}</label>
                  <input type="date" value={form[f]} onChange={e => set(f, e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "inherit" }} /></div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving || !form.reg.trim() || !form.company_id}
            style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: (form.reg.trim() && form.company_id) ? "linear-gradient(135deg, #0F172A, #1E293B)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Adding..." : "Add Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComplyFleetVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myCompany, setMyCompany] = useState(null);

  const isCompanyAdmin = profile?.role === "company_admin" || profile?.role === "company_viewer";

  useEffect(() => {
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) { setProfile(data); loadData(data); }
        });
      });
    }
  }, []);

  async function loadData(userProfile) {
    setLoading(true);
    if (isSupabaseReady()) {
      let companyIds = null;
      if (userProfile?.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (userProfile?.role === "company_admin" || userProfile?.role === "company_viewer") {
        const { data: comp } = await supabase.from("companies").select("id, name").eq("user_id", userProfile.id).single();
        if (comp) { companyIds = [comp.id]; setMyCompany(comp); }
        else companyIds = [];
      }
      const ids = companyIds?.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"];
      let vQ = supabase.from("vehicles").select("*").is("archived_at", null).order("reg");
      let cQ = supabase.from("companies").select("id, name").is("archived_at", null).order("name");
      if (companyIds) { vQ = vQ.in("company_id", ids); cQ = cQ.in("id", ids); }
      const [vR, cR] = await Promise.all([vQ, cQ]);
      setVehicles(vR.data || []); setCompanies(cR.data || []);
    }
    setLoading(false);
  }

  async function addVehicle(form) {
    const payload = { reg: form.reg.trim().toUpperCase(), make: form.make || null, model: form.model || null, type: form.type, year: form.year ? parseInt(form.year) : null, company_id: form.company_id };
    DATE_FIELDS.forEach(f => { payload[f] = form[f] || null; });
    await supabase.from("vehicles").insert(payload);
    await loadData(profile); setShowAdd(false);
  }

  async function archiveVehicle(id) {
    await supabase.from("vehicles").update({ archived_at: new Date().toISOString() }).eq("id", id);
    await loadData(profile); setSelected(null);
  }

  const enriched = vehicles.map(v => {
    const worstDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f]) ?? 9999));
    const worstField = DATE_FIELDS.find(f => getDaysUntil(v[f]) === worstDays);
    const risk = getRisk(worstDays);
    const companyName = companies.find(c => c.id === v.company_id)?.name || "—";
    return { ...v, worstDays, worstField, risk, companyName };
  });

  const filtered = enriched.filter(v => {
    if (filterCompany !== "all" && v.company_id !== filterCompany) return false;
    if (filterRisk !== "all" && v.risk !== filterRisk) return false;
    if (search) { const q = search.toLowerCase(); return v.reg.toLowerCase().includes(q) || (v.make || "").toLowerCase().includes(q) || (v.model || "").toLowerCase().includes(q); }
    return true;
  });

  const overdue = enriched.filter(v => v.risk === "high").length;
  const dueSoon = enriched.filter(v => v.risk === "medium" || v.risk === "low").length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <header style={{ background: "linear-gradient(135deg,#0F172A,#1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}><ShieldIcon size={22} /></div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", color: "white", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
          ← Back to Dashboard
        </a>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>🚛 Vehicle Compliance</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>MOT, PMI, insurance and service tracking across your fleet</p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg,#0F172A,#1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>+ Add Vehicle</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px", marginBottom: "24px" }}>
          {[{ icon: "🚛", value: vehicles.length, label: "Total Vehicles", accent: "#0F172A" }, { icon: "🔴", value: overdue, label: "Overdue", accent: "#DC2626" }, { icon: "⏳", value: dueSoon, label: "Due Soon", accent: "#D97706" }, { icon: "✅", value: enriched.filter(v => v.risk === "green").length, label: "Compliant", accent: "#059669" }].map(s => (
            <div key={s.label} style={{ background: "#FFF", borderRadius: "16px", padding: "18px 20px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.icon}</div>
              <div><div style={{ fontSize: "26px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, marginTop: "3px" }}>{s.label}</div></div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          {!isCompanyAdmin && (
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {["all", "high", "medium", "low", "green"].map(r => (
            <button key={r} onClick={() => setFilterRisk(r)} style={{ padding: "7px 12px", borderRadius: "9px", border: "1px solid", borderColor: filterRisk === r ? (RISK[r]?.dot || "#0F172A") : "#E5E7EB", background: filterRisk === r ? (RISK[r]?.bg || "#0F172A") : "#FFF", color: filterRisk === r ? (RISK[r]?.text || "white") : "#6B7280", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
              {r === "all" ? "All" : RISK[r].label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>🔍</span>
            <input placeholder="Search reg, make, model..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "13px", width: "220px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
          </div>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading vehicles...</div> : (
          <div style={{ background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E5E7EB" }}>
                  {["Vehicle", !isCompanyAdmin && "Company", "Risk", "MOT", "PMI", "Insurance", "Tacho", "Service", ""].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: "#6B7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={isCompanyAdmin ? 7 : 8} style={{ padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: "14px" }}>No vehicles found</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} onClick={() => setSelected(v)} style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{TYPES[v.type] || "🚗"}</div>
                        <div><div style={{ fontWeight: 800, fontSize: "14px", fontFamily: "monospace", color: "#111827" }}>{v.reg}</div>
                          <div style={{ fontSize: "11px", color: "#94A3B8" }}>{v.make} {v.model} {v.year ? `· ${v.year}` : ""}</div></div>
                      </div>
                    </td>
                    {!isCompanyAdmin && <td style={{ padding: "14px 16px", fontSize: "13px", color: "#374151", fontWeight: 500 }}>{v.companyName}</td>}
                    <td style={{ padding: "14px 16px" }}><RiskPill level={v.risk} /></td>
                    {DATE_FIELDS.map(f => {
                      const days = getDaysUntil(v[f]); const risk = getRisk(days); const cfg = RISK[risk];
                      return <td key={f} style={{ padding: "14px 16px" }}>
                        {v[f] ? <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: cfg.text }}>{days !== null && days < 0 ? `${Math.abs(days)}d overdue` : days !== null && days <= 30 ? `${days}d` : formatDate(v[f])}</div>
                          {days !== null && days <= 30 && <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatDate(v[f])}</div>}
                        </div> : <span style={{ color: "#CBD5E1", fontSize: "12px" }}>—</span>}
                      </td>;
                    })}
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(v); }} style={{ padding: "6px 12px", border: "1px solid #E5E7EB", borderRadius: "8px", background: "#F8FAFC", fontSize: "11px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setSelected(null)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{TYPES[selected.type] || "🚗"}</div>
                <div><div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>{selected.reg}</div>
                  <div style={{ fontSize: "12px", color: "#94A3B8" }}>{selected.make} {selected.model} · {selected.type}</div></div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>✕</button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#6B7280", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compliance Dates</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {DATE_FIELDS.map(f => {
                  const days = getDaysUntil(selected[f]); const risk = getRisk(days); const cfg = RISK[risk];
                  return <div key={f} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "10px", background: days !== null && days <= 30 ? cfg.bg : "#F8FAFC", border: `1px solid ${days !== null && days <= 30 ? cfg.border : "#E5E7EB"}` }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{FIELD_LABELS[f]}</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: cfg.text }}>{selected[f] ? formatDate(selected[f]) : "—"}</div>
                      {days !== null && <div style={{ fontSize: "11px", color: cfg.text, marginTop: "2px" }}>{days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}</div>}
                    </div>
                  </div>;
                })}
              </div>
              <div style={{ display: "flex", gap: "8px", paddingTop: "16px", borderTop: "1px solid #F3F4F6" }}>
                <a href={`/qr-codes?vehicle=${selected.id}`} style={{ flex: 1, padding: "10px 0", borderRadius: "10px", background: "#F1F5F9", color: "#374151", fontSize: "12px", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>📱 QR Code</a>
                <a href={`/defects?vehicle=${selected.reg}`} style={{ flex: 1, padding: "10px 0", borderRadius: "10px", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>⚠️ Defects</a>
                <button onClick={() => { if (confirm(`Archive ${selected.reg}?`)) archiveVehicle(selected.id); }} style={{ flex: 1, padding: "10px 0", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", color: "#6B7280", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 · DVSA Compliance Platform · © 2026</footer>
      {showAdd && <AddVehicleModal onSave={addVehicle} onClose={() => setShowAdd(false)} companies={companies} defaultCompanyId={myCompany?.id || null} />}
    </div>
  );
}
