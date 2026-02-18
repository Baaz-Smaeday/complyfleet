"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ConfirmDialog, Toast } from "../../components/ConfirmDialog";
import ComplianceDonut from "../../components/ComplianceDonut";
import ExportDropdown from "../../components/ExportDropdown";
import { calcComplianceScore, exportFleetCSV, exportDefectsCSV, exportChecksCSV, printReport } from "../../lib/utils";

const TODAY = new Date("2026-02-16");
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "OVERDUE" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "DUE SOON" },
  low: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "UPCOMING" },
  green: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
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
  return (<span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: "8px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "12px", fontWeight: 700, color: cfg.text, fontFamily: "monospace" }}>
    {formatDate(date)} <span style={{ marginLeft: "6px", opacity: 0.8, fontSize: "10px" }}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span>
  </span>);
}

function FormField({ label, value, onChange, placeholder, type = "text" }) {
  return (<div>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>{label}</label>
    <input type={type} placeholder={placeholder} value={value || ""}
      onChange={e => onChange(type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
      style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
  </div>);
}

export default function CompanyPortal() {
  const [step, setStep] = useState("select"); // select, portal
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview, fleet, checks, defects
  const [vehicleForm, setVehicleForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    async function init() {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const cid = params.get("company");

      if (isSupabaseReady()) {
        // Get user profile to filter by TM
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = "/login"; return; }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

        let companyIds = null;
        if (prof && prof.role === "tm") {
          const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", prof.id);
          companyIds = (links || []).map(l => l.company_id);
        }

        let cQuery = supabase.from("companies").select("*").is("archived_at", null).order("name");
        if (companyIds) cQuery = cQuery.in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);

        const { data: cos } = await cQuery;
        setCompanies(cos || []);
        if (cid) {
          const co = (cos || []).find(c => c.id === cid);
          if (co) { setSelectedCompany(co); setStep("portal"); await loadCompanyData(cid); }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function loadCompanyData(companyId) {
    if (!isSupabaseReady()) return;
    const [vRes, dRes, chRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("company_id", companyId).is("archived_at", null).order("reg"),
      supabase.from("defects").select("*").eq("company_id", companyId).order("reported_date", { ascending: false }).limit(20),
      supabase.from("walkaround_checks").select("*").eq("company_id", companyId).order("completed_at", { ascending: false }).limit(20),
    ]);
    setVehicles(vRes.data || []);
    setDefects(dRes.data || []);
    setChecks(chRes.data || []);
  }

  async function selectCompany(co) {
    setSelectedCompany(co);
    setStep("portal");
    setLoading(true);
    await loadCompanyData(co.id);
    setLoading(false);
  }

  async function saveVehicle(form, editId) {
    if (!isSupabaseReady()) return;
    if (editId) {
      await supabase.from("vehicles").update(form).eq("id", editId);
    } else {
      await supabase.from("vehicles").insert({ ...form, company_id: selectedCompany.id });
    }
    await loadCompanyData(selectedCompany.id);
    flash(editId ? "Vehicle updated" : "Vehicle added"); setVehicleForm(null);
  }

  async function archiveVehicle(id, reg) {
    if (!isSupabaseReady()) return;
    await supabase.from("vehicles").update({ archived_at: new Date().toISOString() }).eq("id", id);
    await loadCompanyData(selectedCompany.id);
    flash(`${reg} archived`); setConfirm(null);
  }

  const overdue = vehicles.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d < 0; })).length;
  const openDefects = defects.filter(d => d.status === "open" || d.status === "in_progress").length;

  // Company Selector
  if (step === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
        <div style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "60px 20px", textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>{"\u{1F69B}"}</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span> Portal</h1>
          <p style={{ color: "#94A3B8", fontSize: "14px" }}>Select your company to access the fleet portal</p>
        </div>
        <div style={{ maxWidth: "500px", margin: "-20px auto 0", padding: "0 20px" }}>
          {loading ? <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading...</div> :
          companies.length === 0 ? <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>No companies found</div> :
          companies.map(c => (
            <button key={c.id} onClick={() => selectCompany(c)} style={{
              width: "100%", padding: "20px 24px", background: "#FFF", borderRadius: "16px",
              border: "1px solid #E5E7EB", marginBottom: "12px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "16px", textAlign: "left",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s",
            }} onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
               onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #0F172A, #1E293B)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "16px" }}>
                {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>{c.name}</div>
                <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{c.o_licence} {"\u00B7"} {c.operating_centre?.split(",")[0]}</div>
              </div>
              <span style={{ color: "#94A3B8", fontSize: "18px" }}>{"\u2192"}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Portal
  const co = selectedCompany;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          </a>
          <span style={{ color: "#475569", fontSize: "14px", marginLeft: "4px" }}>|</span>
          <span style={{ color: "#94A3B8", fontSize: "13px" }}>{co.name}</span>
        </div>
        <button onClick={() => { setStep("select"); setSelectedCompany(null); }} style={{ padding: "6px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "none", color: "#94A3B8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{"\u2190"} Switch Company</button>
      </header>

      {/* Tabs */}
      <div style={{ background: "#FFF", borderBottom: "1px solid #E5E7EB", padding: "0 24px", display: "flex", gap: "4px" }}>
        {[{ k: "overview", l: "\u{1F4CA} Overview" }, { k: "fleet", l: "\u{1F69B} Fleet" }, { k: "checks", l: "\u{1F4CB} Checks" }, { k: "defects", l: "\u26A0\uFE0F Defects" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "14px 18px", border: "none", borderBottom: `3px solid ${tab === t.k ? "#2563EB" : "transparent"}`,
            background: "none", fontSize: "13px", fontWeight: tab === t.k ? 700 : 500,
            color: tab === t.k ? "#0F172A" : "#6B7280", cursor: "pointer",
          }}>{t.l}</button>
        ))}
      </div>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> : (<>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[{ i: "\u{1F69B}", v: vehicles.length, l: "Vehicles", a: "#0F172A", tab: "fleet" }, { i: "\u{1F534}", v: overdue, l: "Overdue", a: "#DC2626", tab: "fleet" }, { i: "\u26A0\uFE0F", v: openDefects, l: "Open Defects", a: "#F59E0B", tab: "defects" }, { i: "\u{1F4CB}", v: checks.length, l: "Checks (30d)", a: "#2563EB", tab: "checks" }].map(s => (
                <div key={s.l} onClick={() => setTab(s.tab)} style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: s.a + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{s.i}</div>
                  <div><div style={{ fontSize: "28px", fontWeight: 800, color: s.a, lineHeight: 1 }}>{s.v}</div><div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{s.l}</div></div>
                </div>))}
            </div>

            <div style={{ background: "#FFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>{"\u{1F3E2}"} Company Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[{ l: "O-Licence", v: co.o_licence }, { l: "Status", v: co.licence_status || "Valid" }, { l: "Operating Centre", v: co.operating_centre }, { l: "Licence Expiry", v: formatDate(co.licence_expiry) }, { l: "Phone", v: co.phone }, { l: "Email", v: co.email }, { l: "Auth. Vehicles", v: co.authorised_vehicles }, { l: "Auth. Trailers", v: co.authorised_trailers }].map(f => (
                  <div key={f.l} style={{ padding: "10px 14px", borderRadius: "10px", background: "#F8FAFC" }}>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>{f.l}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", marginTop: "2px" }}>{f.v || "\u2014"}</div>
                  </div>))}
              </div>
            </div>
          </>)}

          {/* FLEET TAB */}
          {tab === "fleet" && (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>Fleet ({vehicles.length} vehicles)</h2>
              <button onClick={() => setVehicleForm(false)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Add Vehicle</button>
            </div>
            <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                  <thead><tr style={{ background: "#F8FAFC" }}>
                    {["Vehicle", "Type", "MOT", "PMI", "Insurance", "Tacho", "Service", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", borderBottom: "2px solid #E5E7EB" }}>{h}</th>))}
                  </tr></thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                            <div><div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "monospace" }}>{v.reg}</div>
                              <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div>
                          </div>
                        </td>
                        <td style={{ padding: "14px", fontSize: "12px", fontWeight: 600 }}>{v.type}</td>
                        {DATE_FIELDS.map(f => (<td key={f.key} style={{ padding: "14px" }}><DateBadge date={v[f.key]} /></td>))}
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => setVehicleForm(v)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>{"\u270F\uFE0F"} Edit</button>
                            <button onClick={() => setConfirm({ title: "Archive Vehicle?", message: `${v.reg} will be removed from your active fleet.`, icon: "\u{1F4E6}", confirmLabel: "Archive", confirmColor: "#D97706", onConfirm: () => archiveVehicle(v.id, v.reg) })} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FFFBEB", fontSize: "10px", fontWeight: 700, color: "#92400E", cursor: "pointer" }}>{"\u{1F4E6}"}</button>
                          </div>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}

          {/* CHECKS TAB */}
          {tab === "checks" && (<>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>Recent Walkaround Checks</h2>
            {checks.length === 0 ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8", background: "#FFF", borderRadius: "16px" }}>No checks recorded yet</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {checks.map(ch => (
                <div key={ch.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{ch.result === "pass" ? "\u2705" : "\u26A0\uFE0F"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{ch.vehicle_reg}</div>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>Driver: {ch.driver_name} {"\u00B7"} {ch.reference_id}</div>
                  </div>
                  <button onClick={async (e) => { e.stopPropagation(); let items = []; if (isSupabaseReady()) { const { data } = await supabase.from("check_items").select("*").eq("check_id", ch.id).order("id"); items = data || []; } const win = window.open("", "_blank"); const passC = items.filter(i => i.status === "pass").length; const failC = items.filter(i => i.status === "fail").length; win.document.write('<!DOCTYPE html><html><head><title>Check - ' + ch.vehicle_reg + '</title><style>@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap");body{font-family:"DM Sans",sans-serif;padding:30px;max-width:800px;margin:0 auto;color:#0F172A}.header{display:flex;justify-content:space-between;border-bottom:3px solid #0F172A;padding-bottom:14px;margin-bottom:20px}.logo{font-size:18px;font-weight:800}.logo span{color:#2563EB}.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px}.info-item{padding:8px 12px;background:#F8FAFC;border-radius:6px}.info-label{font-size:9px;color:#6B7280;text-transform:uppercase;font-weight:700}.info-value{font-size:13px;font-weight:700;margin-top:2px}.result{text-align:center;margin:16px 0;padding:14px;border-radius:10px;font-weight:800;font-size:16px}.pass{background:#D1FAE5;color:#065F46}.fail{background:#FEE2E2;color:#991B1B}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#0F172A;color:white;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;font-weight:700}td{padding:7px 10px;border-bottom:1px solid #E5E7EB;font-size:11px}tr.fail-row td{background:#FEF2F2}.footer{margin-top:20px;text-align:center;font-size:9px;color:#94A3B8;border-top:1px solid #E5E7EB;padding-top:10px}@media print{body{padding:15px}@page{margin:1cm}}</style></head><body><div class="header"><div><div class="logo">\u{1F69B} Comply<span>Fleet</span></div><div style="font-size:12px;color:#6B7280">DVSA Walkaround Check Record</div></div><div style="text-align:right"><div style="font-size:22px;font-weight:800;font-family:monospace">' + ch.vehicle_reg + '</div></div></div><div class="info-grid"><div class="info-item"><div class="info-label">Driver</div><div class="info-value">' + (ch.driver_name||"") + '</div></div><div class="info-item"><div class="info-label">Date</div><div class="info-value">' + formatDate(ch.completed_at) + '</div></div><div class="info-item"><div class="info-label">Reference</div><div class="info-value">' + (ch.reference_id||"") + '</div></div><div class="info-item"><div class="info-label">Items</div><div class="info-value">' + passC + ' pass / ' + failC + ' fail</div></div></div><div class="result ' + (ch.result==="pass"?"pass":"fail") + '">' + (ch.result==="pass"?"\u2705 VEHICLE SAFE":"\\u26A0\\uFE0F DEFECTS REPORTED") + '</div>' + (items.length > 0 ? '<table><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Notes</th></tr></thead><tbody>' + items.map(i => '<tr class="' + (i.status==="fail"?"fail-row":"") + '"><td>' + (i.category||"") + '</td><td>' + (i.item_label||"") + '</td><td style="font-weight:700;color:' + (i.status==="pass"?"#059669":"#DC2626") + '">' + (i.status==="pass"?"\u2713 PASS":"\u2717 FAIL") + '</td><td>' + (i.defect_description||"") + '</td></tr>').join("") + '</tbody></table>' : "") + '<div class="footer">ComplyFleet \u00B7 DVSA Compliance Platform</div></body></html>'); win.document.close(); setTimeout(() => win.print(), 500); }} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {"\u{1F4C4}"} PDF
                  </button>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${ch.result === "pass" ? "#A7F3D0" : "#FECACA"}`, fontSize: "10px", fontWeight: 700, color: ch.result === "pass" ? "#059669" : "#DC2626" }}>{ch.result === "pass" ? "PASS" : "DEFECTS"}</span>
                    <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>{formatDate(ch.completed_at)}</div>
                  </div>
                </div>))}
            </div>}
          </>)}

          {/* DEFECTS TAB */}
          {tab === "defects" && (<>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>Defects</h2>
            {defects.length === 0 ? <div style={{ textAlign: "center", padding: "60px", color: "#10B981", background: "#FFF", borderRadius: "16px", fontWeight: 600 }}>{"\u2705"} No defects recorded</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {defects.map(d => {
                const sColors = { dangerous: { bg: "#FEF2F2", b: "#FECACA", t: "#991B1B" }, major: { bg: "#FFF7ED", b: "#FED7AA", t: "#9A3412" }, minor: { bg: "#FFFBEB", b: "#FDE68A", t: "#92400E" } };
                const stColors = { open: "#EF4444", in_progress: "#3B82F6", resolved: "#10B981", closed: "#9CA3AF" };
                const sc = sColors[d.severity] || sColors.minor;
                return (
                  <div key={d.id} style={{ background: "#FFF", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: stColors[d.status], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{d.vehicle_reg} {"\u00B7"} {d.category} {"\u00B7"} {formatDate(d.reported_date)}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: sc.bg, border: `1px solid ${sc.b}`, fontSize: "10px", fontWeight: 700, color: sc.t }}>{(d.severity || "").toUpperCase()}</span>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F3F4F6", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>{(d.status || "").replace("_", " ")}</span>
                  </div>);
              })}
            </div>}
          </>)}
        </>)}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} Company Fleet Portal {"\u00B7"} {"\u00A9"} 2026</footer>

      {/* Vehicle Form Modal */}
      {vehicleForm !== null && (() => {
        const isEdit = !!vehicleForm;
        const v = vehicleForm || {};
        const [form, setForm] = [null, null]; // handled inline
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setVehicleForm(null)}>
            <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "520px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <VehicleFormInner vehicle={vehicleForm || null} onSave={saveVehicle} onClose={() => setVehicleForm(null)} />
            </div>
          </div>
        );
      })()}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function VehicleFormInner({ vehicle, onSave, onClose }) {
  const isEdit = !!vehicle;
  const [form, setForm] = useState({
    reg: vehicle?.reg || "", type: vehicle?.type || "HGV", make: vehicle?.make || "", model: vehicle?.model || "",
    year: vehicle?.year || 2024, mot_due: vehicle?.mot_due || "", pmi_due: vehicle?.pmi_due || "",
    insurance_due: vehicle?.insurance_due || "", tacho_due: vehicle?.tacho_due || "",
    service_due: vehicle?.service_due || "", pmi_interval: vehicle?.pmi_interval || 6,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (<>
    <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{isEdit ? `\u270F\uFE0F Edit ${vehicle.reg}` : "\u2795 Add Vehicle"}</h2>
      <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
    </div>
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
        <FormField label="Registration *" value={form.reg} onChange={v => set("reg", v)} placeholder="BD63 XYZ" />
        <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Type</label>
          <select value={form.type} onChange={e => set("type", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", background: "#FAFAFA", fontFamily: "inherit" }}>
            <option value="HGV">HGV</option><option value="Van">Van</option><option value="Trailer">Trailer</option></select></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <FormField label="Make" value={form.make} onChange={v => set("make", v)} placeholder="DAF" />
        <FormField label="Model" value={form.model} onChange={v => set("model", v)} placeholder="CF 330" />
        <FormField label="Year" value={form.year} onChange={v => set("year", v)} type="number" />
      </div>
      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BFDBFE" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "10px" }}>{"\u{1F4C5}"} Compliance Dates</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <FormField label="MOT Due" value={form.mot_due} onChange={v => set("mot_due", v)} type="date" />
          <FormField label="PMI Due" value={form.pmi_due} onChange={v => set("pmi_due", v)} type="date" />
          <FormField label="Insurance" value={form.insurance_due} onChange={v => set("insurance_due", v)} type="date" />
          <FormField label="Tacho Cal" value={form.tacho_due} onChange={v => set("tacho_due", v)} type="date" />
          <FormField label="Service Due" value={form.service_due} onChange={v => set("service_due", v)} type="date" />
          <FormField label="PMI Interval (wks)" value={form.pmi_interval} onChange={v => set("pmi_interval", v)} type="number" />
        </div>
      </div>
    </div>
    <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
      <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
      <button onClick={async () => { setSaving(true); await onSave(form, vehicle?.id); setSaving(false); }} disabled={saving || !form.reg.trim()} style={{
        padding: "10px 24px", border: "none", borderRadius: "10px",
        background: !form.reg.trim() ? "#E5E7EB" : "linear-gradient(135deg, #0F172A, #1E293B)",
        color: !form.reg.trim() ? "#94A3B8" : "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
      }}>{saving ? "Saving..." : isEdit ? "\u{1F4BE} Save" : "\u2795 Add Vehicle"}</button>
    </div>
  </>);
}
