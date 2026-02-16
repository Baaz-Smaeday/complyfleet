"use client";
import { useState } from "react";

// ============================================================
// COMPLYFLEET — Company Detail Page
// Full operator profile: fleet, contacts, compliance, checks
// ============================================================

const TODAY = new Date("2026-02-16");

function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "HIGH" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "MEDIUM" },
  low: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "LOW" },
  green: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
};
const TYPES = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };

const COMPANIES = [
  {
    id: "c1", name: "Hargreaves Haulage Ltd", oLicence: "OB1234567",
    operatingCentre: "Unit 4, Leeds Industrial Estate, Pontefract Lane, Leeds, LS9 8AB",
    address: "Hargreaves House, 12 Commercial Road, Leeds, LS1 4AP",
    phone: "0113 496 2100", email: "office@hargreaves-haulage.co.uk",
    authorisedVehicles: 8, authorisedTrailers: 4,
    licenceStatus: "Valid", licenceExpiry: "2027-08-15",
    contacts: [
      { id: "ct1", name: "Ian Hargreaves", role: "Director / O-Licence Holder", phone: "07700 900123", email: "ian@hargreaves-haulage.co.uk", isPrimary: true },
      { id: "ct2", name: "Julie Hargreaves", role: "Office Manager", phone: "07700 900124", email: "julie@hargreaves-haulage.co.uk", isPrimary: false },
      { id: "ct3", name: "Dave Pearson", role: "Workshop Foreman", phone: "07700 900125", email: "dave@hargreaves-haulage.co.uk", isPrimary: false },
    ],
    vehicles: [
      { id: "v1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", year: 2020, motDue: "2026-02-18", pmiDue: "2026-02-14", insuranceDue: "2026-06-15", tachoDue: "2026-09-01", status: "defect_reported", checksThisWeek: 5, lastCheck: "2026-02-16", openDefects: 1 },
      { id: "v2", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", year: 2019, motDue: "2026-05-22", pmiDue: "2026-02-20", insuranceDue: "2026-08-30", tachoDue: "2026-07-15", status: "active", checksThisWeek: 5, lastCheck: "2026-02-16", openDefects: 0 },
      { id: "v3", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", year: 2020, motDue: "2026-07-11", pmiDue: "2026-03-28", insuranceDue: "2026-11-05", tachoDue: null, status: "active", checksThisWeek: 4, lastCheck: "2026-02-15", openDefects: 0 },
      { id: "v4", reg: "PQ21 GHI", type: "Trailer", make: "SDC", model: "Curtainsider", year: 2021, motDue: "2026-04-30", pmiDue: "2026-03-01", insuranceDue: "2026-12-01", tachoDue: null, status: "active", checksThisWeek: 3, lastCheck: "2026-02-14", openDefects: 0 },
    ],
    recentChecks: [
      { date: "2026-02-16", driver: "Mark Thompson", vehicle: "BD63 XYZ", result: "fail", defects: 1 },
      { date: "2026-02-16", driver: "Alan Davies", vehicle: "KL19 ABC", result: "pass", defects: 0 },
      { date: "2026-02-16", driver: "Paul Rogers", vehicle: "MN20 DEF", result: "pass", defects: 0 },
      { date: "2026-02-15", driver: "Mark Thompson", vehicle: "BD63 XYZ", result: "pass", defects: 0 },
      { date: "2026-02-15", driver: "Alan Davies", vehicle: "KL19 ABC", result: "pass", defects: 0 },
      { date: "2026-02-15", driver: "Paul Rogers", vehicle: "MN20 DEF", result: "pass", defects: 0 },
    ],
    defects: [
      { id: "DEF-001", vehicleReg: "BD63 XYZ", description: "Nearside brake pad worn below limit", severity: "dangerous", status: "open", date: "2026-02-15", category: "Brakes" },
    ],
  },
  {
    id: "c2", name: "Northern Express Transport", oLicence: "OB2345678",
    operatingCentre: "Wakefield Commercial Depot, Calder Vale Road, Wakefield, WF1 2AB",
    address: "Northern Express House, 45 Westgate, Wakefield, WF1 1JY",
    phone: "01924 331 200", email: "ops@northern-express.co.uk",
    authorisedVehicles: 6, authorisedTrailers: 2,
    licenceStatus: "Valid", licenceExpiry: "2028-03-20",
    contacts: [
      { id: "ct4", name: "Sarah Mitchell", role: "Managing Director", phone: "07700 900456", email: "sarah@northern-express.co.uk", isPrimary: true },
      { id: "ct5", name: "Tom Bennett", role: "Transport Clerk", phone: "07700 900457", email: "tom@northern-express.co.uk", isPrimary: false },
    ],
    vehicles: [
      { id: "v5", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", year: 2022, motDue: "2026-02-19", pmiDue: "2026-03-05", insuranceDue: "2026-05-20", tachoDue: "2026-10-12", status: "active", checksThisWeek: 6, lastCheck: "2026-02-16", openDefects: 0 },
      { id: "v6", reg: "FG34 HIJ", type: "HGV", make: "Scania", model: "R450", year: 2021, motDue: "2026-06-14", pmiDue: "2026-02-21", insuranceDue: "2026-09-18", tachoDue: "2026-08-03", status: "active", checksThisWeek: 6, lastCheck: "2026-02-16", openDefects: 0 },
      { id: "v7", reg: "JK56 LMN", type: "Van", make: "Mercedes", model: "Sprinter 314", year: 2022, motDue: "2026-08-25", pmiDue: "2026-04-10", insuranceDue: "2026-07-22", tachoDue: null, status: "active", checksThisWeek: 5, lastCheck: "2026-02-15", openDefects: 0 },
    ],
    recentChecks: [
      { date: "2026-02-16", driver: "James Ward", vehicle: "AB12 CDE", result: "pass", defects: 0 },
      { date: "2026-02-16", driver: "Peter Clarke", vehicle: "FG34 HIJ", result: "pass", defects: 0 },
    ],
    defects: [],
  },
  {
    id: "c3", name: "Yorkshire Fleet Services", oLicence: "OB3456789",
    operatingCentre: "Bradford Business Park, Euroway Estate, Bradford, BD4 7TJ",
    address: "Yorkshire Fleet House, 8 Manor Row, Bradford, BD1 4PB",
    phone: "01274 882 400", email: "fleet@yorkshirefleet.co.uk",
    authorisedVehicles: 10, authorisedTrailers: 6,
    licenceStatus: "Valid", licenceExpiry: "2027-11-30",
    contacts: [
      { id: "ct6", name: "David Brooks", role: "Owner / Director", phone: "07700 900789", email: "david@yorkshirefleet.co.uk", isPrimary: true },
      { id: "ct7", name: "Lisa Brooks", role: "Finance Manager", phone: "07700 900790", email: "lisa@yorkshirefleet.co.uk", isPrimary: false },
      { id: "ct8", name: "Gary Firth", role: "Yard Manager", phone: "07700 900791", email: "gary@yorkshirefleet.co.uk", isPrimary: false },
    ],
    vehicles: [
      { id: "v8", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480", year: 2020, motDue: "2026-03-15", pmiDue: "2026-02-10", insuranceDue: "2026-04-28", tachoDue: "2026-06-20", status: "active", checksThisWeek: 6, lastCheck: "2026-02-16", openDefects: 1 },
      { id: "v9", reg: "RS89 TUV", type: "HGV", make: "Volvo", model: "FM 330", year: 2019, motDue: "2026-09-30", pmiDue: "2026-03-22", insuranceDue: "2026-11-15", tachoDue: "2026-12-01", status: "active", checksThisWeek: 6, lastCheck: "2026-02-16", openDefects: 0 },
      { id: "v10", reg: "WX01 YZA", type: "Van", make: "VW", model: "Crafter", year: 2021, motDue: "2026-10-20", pmiDue: "2026-04-05", insuranceDue: "2026-08-10", tachoDue: null, status: "active", checksThisWeek: 3, lastCheck: "2026-02-14", openDefects: 0 },
      { id: "v11", reg: "BC23 DEF", type: "Trailer", make: "Montracon", model: "Flatbed", year: 2020, motDue: "2026-05-18", pmiDue: "2026-03-10", insuranceDue: "2026-10-05", tachoDue: null, status: "active", checksThisWeek: 4, lastCheck: "2026-02-15", openDefects: 0 },
      { id: "v12", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450", year: 2019, motDue: "2026-02-12", pmiDue: "2026-02-28", insuranceDue: "2026-06-30", tachoDue: "2026-07-25", status: "defect_reported", checksThisWeek: 1, lastCheck: "2026-02-12", openDefects: 1 },
    ],
    recentChecks: [
      { date: "2026-02-16", driver: "Steve Williams", vehicle: "LM67 OPQ", result: "pass", defects: 0 },
      { date: "2026-02-16", driver: "David Brooks Jr", vehicle: "RS89 TUV", result: "pass", defects: 0 },
    ],
    defects: [
      { id: "DEF-002", vehicleReg: "GH45 IJK", description: "MOT expired — vehicle must not be used", severity: "dangerous", status: "in_progress", date: "2026-02-13", category: "MOT" },
      { id: "DEF-003", vehicleReg: "LM67 OPQ", description: "Offside indicator intermittent", severity: "minor", status: "open", date: "2026-02-14", category: "Lights" },
    ],
  },
];

function getVehicleRisk(v) {
  const dates = [v.motDue, v.pmiDue, v.insuranceDue, v.tachoDue].filter(Boolean);
  const risks = dates.map(d => getRisk(getDaysUntil(d)));
  const pri = { high: 3, medium: 2, low: 1, green: 0 };
  let worst = "green";
  risks.forEach(r => { if (pri[r] > pri[worst]) worst = r; });
  if (v.openDefects > 0 && v.status === "defect_reported") worst = "high";
  return worst;
}

function getCompanyRisk(c) {
  const vehicleRisks = c.vehicles.map(getVehicleRisk);
  const pri = { high: 3, medium: 2, low: 1, green: 0 };
  let worst = "green";
  vehicleRisks.forEach(r => { if (pri[r] > pri[worst]) worst = r; });
  return worst;
}

// ============================================================
// MAIN APP
// ============================================================

export default function CompanyDetail() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("c1");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingContact, setEditingContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", role: "", phone: "", email: "" });
  const [successMsg, setSuccessMsg] = useState(null);

  const company = COMPANIES.find(c => c.id === selectedCompanyId);
  const companyRisk = getCompanyRisk(company);
  const rCfg = RISK[companyRisk];
  const openDefects = company.defects.filter(d => d.status !== "closed");
  const totalChecksThisWeek = company.vehicles.reduce((s, v) => s + v.checksThisWeek, 0);
  const vehiclesCheckedToday = company.vehicles.filter(v => v.lastCheck === "2026-02-16").length;

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        input:focus, select:focus { outline: none; border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><span style={{ fontSize: "18px" }}>🔔</span></div>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
        </div>
      </header>

      {successMsg && (
        <div style={{ position: "fixed", top: "76px", left: "50%", transform: "translateX(-50%)", padding: "12px 24px", borderRadius: "12px", background: "#059669", color: "white", fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(5,150,105,0.3)", zIndex: 200, animation: "slideDown 0.3s ease" }}>✅ {successMsg}</div>
      )}

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Company Selector */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "20px" }}>
          {COMPANIES.map(c => {
            const sel = c.id === selectedCompanyId;
            const risk = getCompanyRisk(c);
            return (
              <button key={c.id} onClick={() => { setSelectedCompanyId(c.id); setActiveTab("overview"); }}
                style={{
                  padding: "10px 16px", borderRadius: "12px", border: "none", cursor: "pointer",
                  background: sel ? "#1E293B" : "white", color: sel ? "white" : "#374151",
                  boxShadow: sel ? "0 4px 12px rgba(30,41,59,0.2)" : "0 1px 3px rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap",
                  transition: "all 0.2s ease", flexShrink: 0, fontSize: "13px", fontWeight: 700,
                }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: RISK[risk].dot }} />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Company Header */}
        <div style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", borderRadius: "20px", padding: "28px", color: "white", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{company.name}</h1>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "12px", opacity: 0.7, flexWrap: "wrap" }}>
                <span>📋 {company.oLicence}</span>
                <span>📍 {company.operatingCentre.split(",").slice(-2).join(",").trim()}</span>
                <span>📞 {company.phone}</span>
              </div>
            </div>
            <div style={{ padding: "10px 18px", borderRadius: "14px", background: rCfg.dot + "22", border: `1px solid ${rCfg.dot}44`, textAlign: "center" }}>
              <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>Risk</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: rCfg.dot }}>
                {companyRisk === "high" ? "🔴 HIGH" : companyRisk === "medium" ? "🟡 MED" : companyRisk === "low" ? "🔵 LOW" : "🟢 OK"}
              </div>
            </div>
          </div>

          {/* Primary contact + stats */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
            <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.07)", flex: "1.5 1 200px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #60A5FA)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                {company.contacts[0].name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{company.contacts[0].name}</div>
                <div style={{ fontSize: "11px", opacity: 0.6 }}>{company.contacts[0].role}</div>
                <div style={{ fontSize: "11px", opacity: 0.5 }}>{company.contacts[0].phone}</div>
              </div>
            </div>
            {[
              { val: company.vehicles.length, label: "Vehicles", icon: "🚛" },
              { val: openDefects.length, label: "Open Defects", icon: "⚠️", alert: openDefects.length > 0 },
              { val: vehiclesCheckedToday, label: "Checked Today", icon: "✅" },
              { val: totalChecksThisWeek, label: "Checks/Week", icon: "📊" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "12px 16px", borderRadius: "12px", background: s.alert ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)", flex: "1 1 90px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: s.alert ? "#FCA5A5" : "inherit" }}>{s.val}</div>
                <div style={{ fontSize: "10px", opacity: 0.5, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "white", borderRadius: "14px", padding: "4px", border: "1px solid #E2E8F0" }}>
          {[
            { key: "overview", label: "📋 Overview" },
            { key: "fleet", label: `🚛 Fleet (${company.vehicles.length})` },
            { key: "contacts", label: `👥 Contacts (${company.contacts.length})` },
            { key: "checks", label: `🔍 Checks` },
            { key: "defects", label: `⚠️ Defects (${openDefects.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: "10px 8px", borderRadius: "10px", border: "none",
              background: activeTab === tab.key ? "#1E293B" : "transparent",
              color: activeTab === tab.key ? "white" : "#64748B",
              fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeIn 0.3s ease", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {/* O-Licence Details */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>📋 O-Licence Details</h3>
              {[
                { label: "Licence Number", value: company.oLicence },
                { label: "Status", value: company.licenceStatus, badge: true, color: "#059669", bg: "#ECFDF5" },
                { label: "Expiry", value: formatDate(company.licenceExpiry) },
                { label: "Authorised Vehicles", value: `${company.vehicles.filter(v=>v.type!=="Trailer").length} / ${company.authorisedVehicles}` },
                { label: "Authorised Trailers", value: `${company.vehicles.filter(v=>v.type==="Trailer").length} / ${company.authorisedTrailers}` },
                { label: "Operating Centre", value: company.operatingCentre },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: i < 5 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>{row.label}</span>
                  {row.badge ? (
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "10px", background: row.bg, color: row.color }}>{row.value}</span>
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Company Contact */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>🏢 Company Details</h3>
              {[
                { label: "Registered Address", value: company.address },
                { label: "Phone", value: company.phone },
                { label: "Email", value: company.email },
                { label: "Operating Centre", value: company.operatingCentre.split(",")[0] },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: i < 3 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>{row.label}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Fleet Summary */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "14px" }}>🚛 Fleet Compliance Summary</h3>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                {["green", "low", "medium", "high"].map(level => {
                  const count = company.vehicles.filter(v => getVehicleRisk(v) === level).length;
                  return (
                    <div key={level} style={{ flex: 1, textAlign: "center", padding: "10px 8px", borderRadius: "10px", background: RISK[level].bg, border: `1px solid ${RISK[level].border}` }}>
                      <div style={{ fontSize: "20px", fontWeight: 800, color: RISK[level].text }}>{count}</div>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: RISK[level].text, textTransform: "uppercase" }}>{RISK[level].label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {company.vehicles.map(v => {
                  const risk = getVehicleRisk(v);
                  return (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", borderRadius: "8px", background: "#F8FAFC" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: RISK[risk].dot, flexShrink: 0 }} />
                      <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#0F172A", minWidth: "80px" }}>{v.reg}</span>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>{v.type}</span>
                      <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: RISK[risk].text }}>{RISK[risk].label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: "white", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "14px" }}>📊 Recent Activity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {company.recentChecks.slice(0, 6).map((ch, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: ch.result === "fail" ? "#FEF2F2" : "#F8FAFC" }}>
                    <span style={{ fontSize: "14px" }}>{ch.result === "pass" ? "✅" : "⚠️"}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{ch.driver}</span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}> — {ch.vehicle}</span>
                    </div>
                    <span style={{ fontSize: "10px", color: "#94A3B8" }}>{formatDate(ch.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== FLEET TAB ========== */}
        {activeTab === "fleet" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid #E2E8F0", background: "white" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Vehicle", "Type", "Risk", "MOT Due", "PMI Due", "Insurance", "Tacho", "Checks/Wk", "Defects"].map(h => (
                      <th key={h} style={{ padding: "12px 12px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {company.vehicles.map(v => {
                    const risk = getVehicleRisk(v);
                    const DateCell = ({ date }) => {
                      const days = getDaysUntil(date);
                      const r = getRisk(days);
                      const c = RISK[r];
                      return (
                        <td style={{ padding: "12px" }}>
                          {date ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: c.bg }}>
                              <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 600, color: c.text }}>{formatDate(date)}</span>
                            </div>
                          ) : <span style={{ color: "#D1D5DB", fontSize: "12px" }}>—</span>}
                        </td>
                      );
                    };
                    return (
                      <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "14px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>{TYPES[v.type]}</span>
                            <div>
                              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>{v.reg}</div>
                              <div style={{ fontSize: "10px", color: "#94A3B8" }}>{v.year} {v.make} {v.model}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px", fontSize: "12px", color: "#475569" }}>{v.type}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", background: RISK[risk].bg, border: `1px solid ${RISK[risk].border}`, fontSize: "10px", fontWeight: 700, color: RISK[risk].text }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: RISK[risk].dot }} />{RISK[risk].label}
                          </span>
                        </td>
                        <DateCell date={v.motDue} />
                        <DateCell date={v.pmiDue} />
                        <DateCell date={v.insuranceDue} />
                        <DateCell date={v.tachoDue} />
                        <td style={{ padding: "12px", fontSize: "13px", fontWeight: 700, color: "#2563EB", textAlign: "center" }}>{v.checksThisWeek}</td>
                        <td style={{ padding: "12px" }}>
                          {v.openDefects > 0 ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: "12px" }}>{v.openDefects}</span>
                          ) : <span style={{ color: "#10B981", fontSize: "12px", fontWeight: 600 }}>0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== CONTACTS TAB ========== */}
        {activeTab === "contacts" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>Company Contacts</h3>
              <button onClick={() => setShowAddContact(true)} style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#2563EB", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>+ Add Contact</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {company.contacts.map(ct => (
                <div key={ct.id} style={{ background: "white", borderRadius: "14px", padding: "20px", border: ct.isPrimary ? "2px solid #2563EB" : "1px solid #E2E8F0" }}>
                  {ct.isPrimary && (
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "#EFF6FF", color: "#1E40AF", marginBottom: "10px", display: "inline-block" }}>PRIMARY CONTACT</span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "50%",
                      background: ct.isPrimary ? "linear-gradient(135deg, #2563EB, #3B82F6)" : "linear-gradient(135deg, #64748B, #94A3B8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: "16px", flexShrink: 0,
                    }}>{ct.name.split(" ").map(n => n[0]).join("")}</div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>{ct.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>{ct.role}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <a href={`tel:${ct.phone}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "#F0FDF4", textDecoration: "none", color: "#059669", fontSize: "13px", fontWeight: 600, border: "1px solid #A7F3D0" }}>
                      📞 {ct.phone}
                    </a>
                    <a href={`mailto:${ct.email}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "#EFF6FF", textDecoration: "none", color: "#1E40AF", fontSize: "13px", fontWeight: 600, border: "1px solid #BFDBFE", overflow: "hidden", textOverflow: "ellipsis" }}>
                      📧 {ct.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Contact Modal */}
            {showAddContact && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "20px", backdropFilter: "blur(4px)" }} onClick={() => setShowAddContact(false)}>
                <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "20px", padding: "28px", maxWidth: "420px", width: "100%", animation: "scaleIn 0.2s ease", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", marginBottom: "16px" }}>Add Contact</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                      { label: "Name *", key: "name", placeholder: "Full name" },
                      { label: "Role", key: "role", placeholder: "e.g. Yard Manager" },
                      { label: "Phone *", key: "phone", placeholder: "07700 000000" },
                      { label: "Email", key: "email", placeholder: "name@company.co.uk" },
                    ].map(f => (
                      <label key={f.key}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "4px" }}>{f.label}</span>
                        <input type="text" placeholder={f.placeholder} value={newContact[f.key]}
                          onChange={e => setNewContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1.5px solid #D1D5DB", fontSize: "14px", fontFamily: "inherit" }} />
                      </label>
                    ))}
                    <button onClick={() => { setShowAddContact(false); setNewContact({ name: "", role: "", phone: "", email: "" }); showSuccess("Contact added"); }}
                      disabled={!newContact.name || !newContact.phone}
                      style={{
                        padding: "12px", borderRadius: "10px", border: "none",
                        background: newContact.name && newContact.phone ? "#2563EB" : "#E2E8F0",
                        color: newContact.name && newContact.phone ? "white" : "#94A3B8",
                        fontSize: "14px", fontWeight: 700, cursor: newContact.name && newContact.phone ? "pointer" : "not-allowed", marginTop: "4px",
                      }}>Add Contact</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== CHECKS TAB ========== */}
        {activeTab === "checks" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ padding: "14px 20px", borderRadius: "12px", background: "white", border: "1px solid #E2E8F0", textAlign: "center", flex: "1 1 120px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#2563EB" }}>{totalChecksThisWeek}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>This week</div>
              </div>
              <div style={{ padding: "14px 20px", borderRadius: "12px", background: "white", border: "1px solid #E2E8F0", textAlign: "center", flex: "1 1 120px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#059669" }}>{vehiclesCheckedToday}/{company.vehicles.length}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>Checked today</div>
              </div>
              <div style={{ padding: "14px 20px", borderRadius: "12px", background: company.vehicles.length - vehiclesCheckedToday > 0 ? "#FEF2F2" : "#ECFDF5", border: `1px solid ${company.vehicles.length - vehiclesCheckedToday > 0 ? "#FECACA" : "#A7F3D0"}`, textAlign: "center", flex: "1 1 120px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: company.vehicles.length - vehiclesCheckedToday > 0 ? "#DC2626" : "#059669" }}>{company.vehicles.length - vehiclesCheckedToday}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>Missing today</div>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
              {company.recentChecks.map((ch, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderBottom: i < company.recentChecks.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ fontSize: "18px" }}>{ch.result === "pass" ? "✅" : "⚠️"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{ch.driver} <span style={{ color: "#94A3B8", fontWeight: 400 }}>checked</span> <span style={{ fontFamily: "monospace" }}>{ch.vehicle}</span></div>
                    {ch.defects > 0 && <div style={{ fontSize: "11px", color: "#DC2626", fontWeight: 700 }}>{ch.defects} defect reported</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{formatDate(ch.date)}</div>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", color: ch.result === "pass" ? "#059669" : "#DC2626" }}>{ch.result === "pass" ? "PASS" : "FAIL"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== DEFECTS TAB ========== */}
        {activeTab === "defects" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {openDefects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {company.defects.map(d => {
                  const sevColors = { dangerous: "#DC2626", major: "#F97316", minor: "#F59E0B" };
                  const stColors = { open: "#DC2626", in_progress: "#F59E0B", rectified: "#2563EB", closed: "#10B981" };
                  return (
                    <div key={d.id} style={{ background: "white", borderRadius: "14px", padding: "18px 20px", border: `1.5px solid ${d.status === "open" ? "#FECACA" : "#E2E8F0"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#64748B" }}>{d.id}</span>
                          <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>{d.vehicleReg}</span>
                          <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 800, background: sevColors[d.severity], color: "white" }}>{d.severity.toUpperCase()}</span>
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: stColors[d.status], background: stColors[d.status] + "18", border: `1px solid ${stColors[d.status]}44`, textTransform: "uppercase" }}>{d.status.replace("_", " ")}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5, margin: 0 }}>{d.description}</p>
                      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "6px" }}>{d.category} • Opened {formatDate(d.date)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "48px 20px", background: "white", borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>✅</span>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#059669" }}>No open defects</div>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>All vehicles in good standing</div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>
        ComplyFleet v1.0 • DVSA Compliance Management Platform • © 2026
      </footer>
    </div>
  );
}
