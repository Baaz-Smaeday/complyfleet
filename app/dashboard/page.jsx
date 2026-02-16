"use client";
import { useState, useEffect } from "react";

// ============================================================
// COMPLYFLEET DASHBOARD — UK Transport Manager Compliance Hub
// ============================================================

// --- Mock Data ---
const MOCK_COMPANIES = [
  {
    id: "c1",
    name: "Hargreaves Haulage Ltd",
    oLicence: "OB1234567",
    operatingCentre: "Leeds Industrial Estate, LS9 8AB",
    manager: "Ian Hargreaves",
    managerPhone: "07700 900123",
    managerEmail: "ian@hargreaves-haulage.co.uk",
    vehicles: [
      { id: "v1", reg: "BD63 XYZ", type: "HGV", motDue: "2026-02-18", pmiDue: "2026-02-14", insuranceDue: "2026-06-15", tachoDue: "2026-09-01", serviceDue: "2026-03-20", status: "defect_reported", pmiInterval: 6 },
      { id: "v2", reg: "KL19 ABC", type: "HGV", motDue: "2026-05-22", pmiDue: "2026-02-20", insuranceDue: "2026-08-30", tachoDue: "2026-07-15", serviceDue: "2026-04-10", status: "active", pmiInterval: 6 },
      { id: "v3", reg: "MN20 DEF", type: "Van", motDue: "2026-07-11", pmiDue: "2026-03-28", insuranceDue: "2026-11-05", tachoDue: null, serviceDue: "2026-05-15", status: "active", pmiInterval: 8 },
      { id: "v4", reg: "PQ21 GHI", type: "Trailer", motDue: "2026-04-30", pmiDue: "2026-03-01", insuranceDue: "2026-12-01", tachoDue: null, serviceDue: null, status: "active", pmiInterval: 6 },
    ],
    defects: [
      { id: "d1", vehicleReg: "BD63 XYZ", description: "Nearside brake pad worn below limit", severity: "dangerous", status: "open", openedDate: "2026-02-15", category: "Brakes" },
    ],
  },
  {
    id: "c2",
    name: "Northern Express Transport",
    oLicence: "OB2345678",
    operatingCentre: "Wakefield Depot, WF1 2AB",
    manager: "Sarah Mitchell",
    managerPhone: "07700 900456",
    managerEmail: "sarah@northern-express.co.uk",
    vehicles: [
      { id: "v5", reg: "AB12 CDE", type: "HGV", motDue: "2026-02-19", pmiDue: "2026-03-05", insuranceDue: "2026-05-20", tachoDue: "2026-10-12", serviceDue: "2026-04-22", status: "active", pmiInterval: 6 },
      { id: "v6", reg: "FG34 HIJ", type: "HGV", motDue: "2026-06-14", pmiDue: "2026-02-21", insuranceDue: "2026-09-18", tachoDue: "2026-08-03", serviceDue: "2026-05-30", status: "active", pmiInterval: 6 },
      { id: "v7", reg: "JK56 LMN", type: "Van", motDue: "2026-08-25", pmiDue: "2026-04-10", insuranceDue: "2026-07-22", tachoDue: null, serviceDue: "2026-06-01", status: "active", pmiInterval: 10 },
    ],
    defects: [],
  },
  {
    id: "c3",
    name: "Yorkshire Fleet Services",
    oLicence: "OB3456789",
    operatingCentre: "Bradford Business Park, BD4 7TJ",
    manager: "David Brooks",
    managerPhone: "07700 900789",
    managerEmail: "david@yorkshirefleet.co.uk",
    vehicles: [
      { id: "v8", reg: "LM67 OPQ", type: "HGV", motDue: "2026-03-15", pmiDue: "2026-02-10", insuranceDue: "2026-04-28", tachoDue: "2026-06-20", serviceDue: "2026-03-25", status: "active", pmiInterval: 6 },
      { id: "v9", reg: "RS89 TUV", type: "HGV", motDue: "2026-09-30", pmiDue: "2026-03-22", insuranceDue: "2026-11-15", tachoDue: "2026-12-01", serviceDue: "2026-07-18", status: "active", pmiInterval: 6 },
      { id: "v10", reg: "WX01 YZA", type: "Van", motDue: "2026-10-20", pmiDue: "2026-04-05", insuranceDue: "2026-08-10", tachoDue: null, serviceDue: "2026-06-22", status: "active", pmiInterval: 8 },
      { id: "v11", reg: "BC23 DEF", type: "Trailer", motDue: "2026-05-18", pmiDue: "2026-03-10", insuranceDue: "2026-10-05", tachoDue: null, serviceDue: null, status: "active", pmiInterval: 6 },
      { id: "v12", reg: "GH45 IJK", type: "HGV", motDue: "2026-02-12", pmiDue: "2026-02-28", insuranceDue: "2026-06-30", tachoDue: "2026-07-25", serviceDue: "2026-04-15", status: "active", pmiInterval: 6 },
    ],
    defects: [
      { id: "d2", vehicleReg: "GH45 IJK", description: "MOT expired — vehicle must not be used", severity: "dangerous", status: "open", openedDate: "2026-02-13", category: "MOT" },
      { id: "d3", vehicleReg: "LM67 OPQ", description: "Offside indicator intermittent", severity: "minor", status: "open", openedDate: "2026-02-14", category: "Lights" },
    ],
  },
  {
    id: "c4",
    name: "Pennine Logistics Group",
    oLicence: "OB4567890",
    operatingCentre: "Huddersfield Trade Park, HD1 6QF",
    manager: "Karen Whitfield",
    managerPhone: "07700 900321",
    managerEmail: "karen@penninelogistics.co.uk",
    vehicles: [
      { id: "v13", reg: "LN54 BCD", type: "HGV", motDue: "2026-08-10", pmiDue: "2026-04-20", insuranceDue: "2026-09-25", tachoDue: "2026-11-10", serviceDue: "2026-06-05", status: "active", pmiInterval: 6 },
      { id: "v14", reg: "OP67 EFG", type: "Van", motDue: "2026-11-30", pmiDue: "2026-05-01", insuranceDue: "2026-12-20", tachoDue: null, serviceDue: "2026-07-28", status: "active", pmiInterval: 10 },
    ],
    defects: [],
  },
];

const TODAY = new Date("2026-02-16");

// --- Risk Calculation ---
function getDaysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return Math.floor((d - TODAY) / (1000 * 60 * 60 * 24));
}

function getVehicleRisk(vehicle, companyDefects) {
  const openDefects = companyDefects.filter(d => d.vehicleReg === vehicle.reg && d.status === "open");
  const hasSafetyDefect = openDefects.some(d => d.severity === "dangerous" || d.severity === "major");
  
  const dates = [
    { label: "MOT", days: getDaysUntil(vehicle.motDue), date: vehicle.motDue },
    { label: "PMI", days: getDaysUntil(vehicle.pmiDue), date: vehicle.pmiDue },
    { label: "Insurance", days: getDaysUntil(vehicle.insuranceDue), date: vehicle.insuranceDue },
    { label: "Tacho", days: getDaysUntil(vehicle.tachoDue), date: vehicle.tachoDue },
    { label: "Service", days: getDaysUntil(vehicle.serviceDue), date: vehicle.serviceDue },
  ].filter(d => d.days !== Infinity);

  const overdue = dates.filter(d => d.days < 0);
  const dueSoon = dates.filter(d => d.days >= 0 && d.days <= 7);
  const upcoming = dates.filter(d => d.days > 7 && d.days <= 30);

  let level = "green";
  if (upcoming.length > 0) level = "low";
  if (dueSoon.length > 0) level = "medium";
  if (overdue.length > 0 || hasSafetyDefect) level = "high";

  return { level, overdue, dueSoon, upcoming, openDefects };
}

function getCompanyRisk(company) {
  const vehicleRisks = company.vehicles.map(v => getVehicleRisk(v, company.defects));
  const priority = { high: 3, medium: 2, low: 1, green: 0 };
  let worst = "green";
  vehicleRisks.forEach(vr => {
    if (priority[vr.level] > priority[worst]) worst = vr.level;
  });
  
  const allOverdue = vehicleRisks.flatMap(vr => vr.overdue);
  const allDueSoon = vehicleRisks.flatMap(vr => vr.dueSoon);
  const allOpenDefects = company.defects.filter(d => d.status === "open");
  const counts = { green: 0, low: 0, medium: 0, high: 0 };
  vehicleRisks.forEach(vr => counts[vr.level]++);

  return { level: worst, vehicleRisks, counts, allOverdue, allDueSoon, allOpenDefects };
}

// --- Theme & Styling ---
const RISK_CONFIG = {
  high: { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444", label: "HIGH RISK", icon: "🔴" },
  medium: { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", dot: "#F59E0B", label: "MEDIUM", icon: "🟡" },
  low: { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", dot: "#3B82F6", label: "LOW", icon: "🔵" },
  green: { bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981", label: "COMPLIANT", icon: "🟢" },
};

// --- Components ---

function RiskPill({ level, size = "md" }) {
  const cfg = RISK_CONFIG[level];
  const sizes = {
    sm: { padding: "2px 8px", fontSize: "10px", dotSize: "6px" },
    md: { padding: "4px 12px", fontSize: "11px", dotSize: "8px" },
    lg: { padding: "6px 16px", fontSize: "13px", dotSize: "10px" },
  };
  const s = sizes[size];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: s.padding, borderRadius: "20px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: s.fontSize, fontWeight: 700, color: cfg.text,
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: s.dotSize, height: s.dotSize, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon, value, label, accent, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px",
      border: "1px solid #E5E7EB", cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", alignItems: "center", gap: "16px", minWidth: 0,
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px",
        background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px", letterSpacing: "0.02em" }}>{label}</div>
      </div>
    </div>
  );
}

function AlertItem({ icon, text, severity, subtext }) {
  const colors = { high: "#EF4444", medium: "#F59E0B", low: "#3B82F6" };
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px",
      borderRadius: "10px", background: severity === "high" ? "#FEF2F2" : severity === "medium" ? "#FFFBEB" : "#EFF6FF",
      border: `1px solid ${severity === "high" ? "#FECACA" : severity === "medium" ? "#FDE68A" : "#BFDBFE"}`,
    }}>
      <span style={{ fontSize: "16px", marginTop: "1px" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{text}</div>
        {subtext && <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{subtext}</div>}
      </div>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors[severity], marginTop: "5px", flexShrink: 0 }} />
    </div>
  );
}

function CompanyCard({ company, risk, onSelect, isSelected }) {
  const openDefectCount = risk.allOpenDefects.length;
  const cfg = RISK_CONFIG[risk.level];
  
  return (
    <div
      onClick={() => onSelect(company.id)}
      style={{
        background: "#FFFFFF",
        borderRadius: "20px",
        border: isSelected ? `2px solid #1D4ED8` : "1px solid #E5E7EB",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: isSelected ? "0 8px 32px rgba(29,78,216,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}}
    >
      {/* Risk strip */}
      <div style={{ height: "4px", background: cfg.dot }} />
      
      <div style={{ padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.3 }}>{company.name}</h3>
            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px", fontFamily: "monospace" }}>{company.oLicence}</div>
          </div>
          <RiskPill level={risk.level} />
        </div>

        {/* Manager */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", borderRadius: "10px",
          background: "#F8FAFC", marginBottom: "16px",
        }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "13px", flexShrink: 0,
          }}>
            {company.manager.split(" ").map(n => n[0]).join("")}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{company.manager}</div>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>{company.managerPhone}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "8px", marginBottom: openDefectCount > 0 || risk.allOverdue.length > 0 ? "16px" : 0 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "10px", background: "#F0F9FF" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#1E40AF" }}>{company.vehicles.length}</div>
            <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Vehicles</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "10px", background: risk.counts.high > 0 ? "#FEF2F2" : "#F0FDF4" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: risk.counts.high > 0 ? "#DC2626" : "#16A34A" }}>{risk.counts.high}</div>
            <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>High Risk</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "10px", background: openDefectCount > 0 ? "#FEF2F2" : "#F0FDF4" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: openDefectCount > 0 ? "#DC2626" : "#16A34A" }}>{openDefectCount}</div>
            <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Defects</div>
          </div>
        </div>

        {/* Alerts */}
        {(risk.allOverdue.length > 0 || risk.allDueSoon.length > 0 || openDefectCount > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {risk.allOpenDefects.filter(d => d.severity === "dangerous" || d.severity === "major").map((d, i) => (
              <AlertItem key={`def-${i}`} icon="⚠️" text={`${d.vehicleReg} — ${d.description}`} severity="high" subtext={`${d.category} • Opened ${d.openedDate}`} />
            ))}
            {risk.allOverdue.map((item, i) => (
              <AlertItem key={`over-${i}`} icon="🚨" text={`${item.label} OVERDUE`} severity="high" subtext={`Due: ${item.date} (${Math.abs(item.days)} days overdue)`} />
            ))}
            {risk.allDueSoon.map((item, i) => (
              <AlertItem key={`soon-${i}`} icon="⏰" text={`${item.label} due in ${item.days} days`} severity="medium" subtext={`Due: ${item.date}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleRow({ vehicle, risk }) {
  const cfg = RISK_CONFIG[risk.level];
  const typeIcons = { HGV: "🚛", Van: "🚐", Trailer: "🚛" };
  
  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const DateCell = ({ date, label }) => {
    const days = getDaysUntil(date);
    let color = "#059669";
    let bg = "#ECFDF5";
    if (days !== Infinity && days < 0) { color = "#DC2626"; bg = "#FEF2F2"; }
    else if (days !== Infinity && days <= 7) { color = "#D97706"; bg = "#FFFBEB"; }
    else if (days !== Infinity && days <= 30) { color = "#2563EB"; bg = "#EFF6FF"; }

    return (
      <td style={{ padding: "12px 10px", fontSize: "12px" }}>
        {date ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: bg }}>
            <span style={{ color, fontWeight: 600, fontFamily: "monospace", fontSize: "11px" }}>{formatDate(date)}</span>
          </div>
        ) : (
          <span style={{ color: "#D1D5DB" }}>—</span>
        )}
      </td>
    );
  };

  return (
    <tr style={{ borderBottom: "1px solid #F3F4F6" }}
      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
      onMouseLeave={e => e.currentTarget.style.background = ""}
    >
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>{typeIcons[vehicle.type]}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", fontFamily: "monospace" }}>{vehicle.reg}</div>
            <div style={{ fontSize: "11px", color: "#6B7280" }}>{vehicle.type} • {vehicle.pmiInterval}wk PMI</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 10px" }}><RiskPill level={risk.level} size="sm" /></td>
      <DateCell date={vehicle.motDue} label="MOT" />
      <DateCell date={vehicle.pmiDue} label="PMI" />
      <DateCell date={vehicle.insuranceDue} label="Insurance" />
      <DateCell date={vehicle.tachoDue} label="Tacho" />
      <DateCell date={vehicle.serviceDue} label="Service" />
      <td style={{ padding: "12px 10px" }}>
        {risk.openDefects.length > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: "12px" }}>
            {risk.openDefects.length} open
          </span>
        ) : (
          <span style={{ color: "#10B981", fontSize: "12px", fontWeight: 600 }}>None</span>
        )}
      </td>
    </tr>
  );
}

function CompanyDetail({ company, risk }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        color: "white",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{company.name}</h2>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "13px", opacity: 0.8, flexWrap: "wrap" }}>
              <span>📋 {company.oLicence}</span>
              <span>📍 {company.operatingCentre}</span>
            </div>
          </div>
          <RiskPill level={risk.level} size="lg" />
        </div>
        {/* Manager bar */}
        <div style={{
          marginTop: "16px", padding: "12px 16px", borderRadius: "12px",
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
        }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: "14px", flexShrink: 0,
          }}>
            {company.manager.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px" }}>{company.manager}</div>
            <div style={{ fontSize: "12px", opacity: 0.7 }}>{company.managerPhone} • {company.managerEmail}</div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0" }}>
          Fleet — {company.vehicles.length} Vehicles
        </h3>
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Vehicle", "Status", "MOT Due", "PMI Due", "Insurance", "Tacho Cal", "Service", "Defects"].map(h => (
                  <th key={h} style={{
                    padding: "10px 10px", textAlign: "left", fontSize: "10px", fontWeight: 700,
                    color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em",
                    borderBottom: "2px solid #E5E7EB",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.vehicles.map(v => {
                const vRisk = getVehicleRisk(v, company.defects);
                return <VehicleRow key={v.id} vehicle={v} risk={vRisk} />;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Defects */}
      {risk.allOpenDefects.length > 0 && (
        <div style={{ padding: "0 24px 24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#DC2626", margin: "0 0 12px 0" }}>
            ⚠️ Open Defects ({risk.allOpenDefects.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {risk.allOpenDefects.map(d => (
              <div key={d.id} style={{
                padding: "14px 18px", borderRadius: "12px",
                background: d.severity === "dangerous" ? "#FEF2F2" : d.severity === "major" ? "#FFFBEB" : "#F8FAFC",
                border: `1px solid ${d.severity === "dangerous" ? "#FECACA" : d.severity === "major" ? "#FDE68A" : "#E5E7EB"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827" }}>
                    {d.vehicleReg} — {d.description}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                    {d.category} • Opened {d.openedDate}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700,
                  textTransform: "uppercase",
                  background: d.severity === "dangerous" ? "#DC2626" : d.severity === "major" ? "#F59E0B" : "#6B7280",
                  color: "white",
                }}>{d.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main App ---
export default function ComplyFleetDashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const companyRisks = MOCK_COMPANIES.map(c => ({ company: c, risk: getCompanyRisk(c) }));
  
  // Totals
  const totalVehicles = MOCK_COMPANIES.reduce((sum, c) => sum + c.vehicles.length, 0);
  const totalDefects = MOCK_COMPANIES.reduce((sum, c) => sum + c.defects.filter(d => d.status === "open").length, 0);
  const riskCounts = { green: 0, low: 0, medium: 0, high: 0 };
  companyRisks.forEach(cr => {
    cr.risk.vehicleRisks.forEach(vr => riskCounts[vr.level]++);
  });
  const overdueCount = companyRisks.reduce((sum, cr) => sum + cr.risk.allOverdue.length, 0);

  const selected = selectedCompany ? companyRisks.find(cr => cr.company.id === selectedCompany) : null;

  // Sort companies by risk (high first)
  const priority = { high: 3, medium: 2, low: 1, green: 0 };
  const sortedCompanies = [...companyRisks].sort((a, b) => priority[b.risk.level] - priority[a.risk.level]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>

      {/* Top Navigation */}
      <header style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px",
          }}>🚛</div>
          <div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px", letterSpacing: "-0.02em" }}>
              Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
            </span>
            <span style={{ color: "#64748B", fontSize: "11px", marginLeft: "8px", display: "none" }}>Transport Compliance</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Date & Time */}
          <div style={{ color: "#94A3B8", fontSize: "12px", textAlign: "right", display: "none" }}>
            <div style={{ fontWeight: 600 }}>{currentTime.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          
          {/* Notifications */}
          <div style={{
            position: "relative", width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <span style={{ fontSize: "18px" }}>🔔</span>
            {(overdueCount + totalDefects) > 0 && (
              <span style={{
                position: "absolute", top: "-4px", right: "-4px",
                width: "20px", height: "20px", borderRadius: "50%",
                background: "#EF4444", color: "white", fontSize: "10px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid #0F172A",
              }}>{overdueCount + totalDefects}</span>
            )}
          </div>

          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: "13px",
            }}>JH</div>
            <div style={{ color: "white", display: "none" }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>James Henderson</div>
              <div style={{ fontSize: "11px", color: "#94A3B8" }}>External Transport Manager</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        
        {/* Page Title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            Compliance Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {currentTime.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • {MOCK_COMPANIES.length} operators • {totalVehicles} vehicles
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}>
          <StatCard icon="🟢" value={riskCounts.green} label="Fully Compliant" accent="#059669" />
          <StatCard icon="🔵" value={riskCounts.low} label="Due Within 30 Days" accent="#2563EB" />
          <StatCard icon="🟡" value={riskCounts.medium} label="Due Within 7 Days" accent="#D97706" />
          <StatCard icon="🔴" value={riskCounts.high} label="High Risk / Overdue" accent="#DC2626" />
          <StatCard icon="⚠️" value={totalDefects} label="Open Defects" accent="#DC2626" />
          <StatCard icon="🚛" value={totalVehicles} label="Total Fleet" accent="#475569" />
        </div>

        {/* Two Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: selected ? "380px 1fr" : "1fr", gap: "24px" }}>
          
          {/* Company Cards */}
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "14px" }}>
              Operator Companies ({MOCK_COMPANIES.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {sortedCompanies.map(({ company, risk }) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  risk={risk}
                  onSelect={setSelectedCompany}
                  isSelected={selectedCompany === company.id}
                />
              ))}
            </div>
          </div>

          {/* Selected Company Detail */}
          {selected && (
            <div style={{ position: "sticky", top: "88px", alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Company Detail</h2>
                <button
                  onClick={() => setSelectedCompany(null)}
                  style={{
                    background: "none", border: "1px solid #E5E7EB", borderRadius: "8px",
                    padding: "6px 14px", fontSize: "12px", color: "#6B7280", cursor: "pointer",
                    fontWeight: 600,
                  }}
                >✕ Close</button>
              </div>
              <CompanyDetail company={selected.company} risk={selected.risk} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "40px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 • DVSA Compliance Management Platform • © 2026
      </footer>
    </div>
  );
}
