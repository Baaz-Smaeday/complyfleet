"use client";
import { useState, useMemo } from "react";

// ============================================================
// COMPLYFLEET — Vehicle Compliance Dates
// TM view: MOT, PMI, insurance, tacho cal, service dates for every vehicle
// ============================================================

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

const COMPANIES = [
  {
    id: "c1", name: "Hargreaves Haulage Ltd", oLicence: "OB1234567",
    vehicles: [
      { id: "v1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", year: 2020, motDue: "2026-02-18", pmiDue: "2026-02-14", insuranceDue: "2026-06-15", tachoDue: "2026-09-01", serviceDue: "2026-03-20", pmiInterval: 6, openDefects: 1 },
      { id: "v2", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", year: 2019, motDue: "2026-05-22", pmiDue: "2026-02-20", insuranceDue: "2026-08-30", tachoDue: "2026-07-15", serviceDue: "2026-04-10", pmiInterval: 6, openDefects: 0 },
      { id: "v3", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", year: 2020, motDue: "2026-07-11", pmiDue: "2026-03-28", insuranceDue: "2026-11-05", tachoDue: null, serviceDue: "2026-05-15", pmiInterval: 8, openDefects: 0 },
      { id: "v4", reg: "PQ21 GHI", type: "Trailer", make: "SDC", model: "Curtainsider", year: 2021, motDue: "2026-04-30", pmiDue: "2026-03-01", insuranceDue: "2026-12-01", tachoDue: null, serviceDue: null, pmiInterval: 6, openDefects: 0 },
    ],
  },
  {
    id: "c2", name: "Northern Express Transport", oLicence: "OB2345678",
    vehicles: [
      { id: "v5", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", year: 2022, motDue: "2026-02-19", pmiDue: "2026-03-05", insuranceDue: "2026-05-20", tachoDue: "2026-10-12", serviceDue: "2026-04-22", pmiInterval: 6, openDefects: 0 },
      { id: "v6", reg: "FG34 HIJ", type: "HGV", make: "Scania", model: "R450", year: 2021, motDue: "2026-06-14", pmiDue: "2026-02-21", insuranceDue: "2026-09-18", tachoDue: "2026-08-03", serviceDue: "2026-05-30", pmiInterval: 6, openDefects: 0 },
      { id: "v7", reg: "JK56 LMN", type: "Van", make: "Mercedes", model: "Sprinter 314", year: 2022, motDue: "2026-08-25", pmiDue: "2026-04-10", insuranceDue: "2026-07-22", tachoDue: null, serviceDue: "2026-06-01", pmiInterval: 10, openDefects: 0 },
    ],
  },
  {
    id: "c3", name: "Yorkshire Fleet Services", oLicence: "OB3456789",
    vehicles: [
      { id: "v8", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480", year: 2020, motDue: "2026-03-15", pmiDue: "2026-02-10", insuranceDue: "2026-04-28", tachoDue: "2026-06-20", serviceDue: "2026-03-25", pmiInterval: 6, openDefects: 1 },
      { id: "v9", reg: "RS89 TUV", type: "HGV", make: "Volvo", model: "FM 330", year: 2019, motDue: "2026-09-30", pmiDue: "2026-03-22", insuranceDue: "2026-11-15", tachoDue: "2026-12-01", serviceDue: "2026-07-18", pmiInterval: 6, openDefects: 0 },
      { id: "v10", reg: "WX01 YZA", type: "Van", make: "VW", model: "Crafter", year: 2021, motDue: "2026-10-20", pmiDue: "2026-04-05", insuranceDue: "2026-08-10", tachoDue: null, serviceDue: "2026-06-22", pmiInterval: 8, openDefects: 0 },
      { id: "v11", reg: "BC23 DEF", type: "Trailer", make: "Montracon", model: "Flatbed", year: 2020, motDue: "2026-05-18", pmiDue: "2026-03-10", insuranceDue: "2026-10-05", tachoDue: null, serviceDue: null, pmiInterval: 6, openDefects: 0 },
      { id: "v12", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450", year: 2019, motDue: "2026-02-12", pmiDue: "2026-02-28", insuranceDue: "2026-06-30", tachoDue: "2026-07-25", serviceDue: "2026-04-15", pmiInterval: 6, openDefects: 1 },
    ],
  },
  {
    id: "c4", name: "Pennine Logistics Group", oLicence: "OB4567890",
    vehicles: [
      { id: "v13", reg: "LN54 BCD", type: "HGV", make: "MAN", model: "TGX 18.470", year: 2021, motDue: "2026-08-10", pmiDue: "2026-04-20", insuranceDue: "2026-09-25", tachoDue: "2026-11-10", serviceDue: "2026-06-05", pmiInterval: 6, openDefects: 0 },
      { id: "v14", reg: "OP67 EFG", type: "Van", make: "Ford", model: "Transit Custom", year: 2022, motDue: "2026-11-30", pmiDue: "2026-05-01", insuranceDue: "2026-12-20", tachoDue: null, serviceDue: "2026-07-28", pmiInterval: 10, openDefects: 0 },
    ],
  },
];

const DATE_FIELDS = [
  { key: "motDue", label: "MOT", icon: "\u{1F4CB}" },
  { key: "pmiDue", label: "PMI", icon: "\u{1F527}" },
  { key: "insuranceDue", label: "Insurance", icon: "\u{1F6E1}\uFE0F" },
  { key: "tachoDue", label: "Tacho Cal", icon: "\u23F1\uFE0F" },
  { key: "serviceDue", label: "Service", icon: "\u2699\uFE0F" },
];

// --- Components ---
function DateBadge({ date }) {
  const days = getDaysUntil(date);
  const risk = getRisk(days);
  const cfg = RISK[risk];

  if (!date) return <span style={{ color: "#D1D5DB", fontSize: "12px" }}>{"\u2014"}</span>;

  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "flex-start",
      padding: "4px 10px", borderRadius: "8px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: cfg.text, fontFamily: "monospace" }}>
        {formatDate(date)}
      </span>
      <span style={{ fontSize: "10px", fontWeight: 600, color: cfg.text, opacity: 0.8, marginTop: "1px" }}>
        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
      </span>
    </div>
  );
}

function VehicleRiskLevel({ vehicle }) {
  const allDays = DATE_FIELDS.map(f => getDaysUntil(vehicle[f.key])).filter(d => d !== null);
  const worst = Math.min(...allDays);
  const risk = getRisk(worst);
  const cfg = RISK[risk];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", borderRadius: "20px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: "10px", fontWeight: 700, color: cfg.text,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function ComplyFleetVehicle() {
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("risk");

  const allVehicles = useMemo(() => {
    return COMPANIES.flatMap(c => c.vehicles.map(v => ({ ...v, companyName: c.name, companyId: c.id })));
  }, []);

  const filtered = useMemo(() => {
    let veh = allVehicles;
    if (selectedCompany !== "all") veh = veh.filter(v => v.companyId === selectedCompany);
    if (typeFilter !== "all") veh = veh.filter(v => v.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      veh = veh.filter(v => v.reg.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) || v.companyName.toLowerCase().includes(q));
    }
    if (sortBy === "risk") {
      veh = [...veh].sort((a, b) => {
        const aDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(a[f.key]) ?? 9999));
        const bDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(b[f.key]) ?? 9999));
        return aDays - bDays;
      });
    }
    return veh;
  }, [allVehicles, selectedCompany, typeFilter, searchQuery, sortBy]);

  // Counts
  const overdue = allVehicles.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d < 0; })).length;
  const dueSoon = allVehicles.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f.key]); return d !== null && d >= 0 && d <= 7; })).length;
  const upcoming = allVehicles.filter(v => {
    const worst = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f.key]) ?? 9999));
    return worst > 7 && worst <= 30;
  }).length;
  const compliant = allVehicles.length - overdue - dueSoon - upcoming;

  return (
    <div style={{
      minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        input:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }
      `}</style>

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
          }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px", letterSpacing: "-0.02em" }}>
            Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}><span style={{ fontSize: "18px" }}>{"\u{1F514}"}</span></div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "13px",
          }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {"\u{1F69B}"} Vehicle Compliance
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {allVehicles.length} vehicles across {COMPANIES.length} operators {"\u2014"} {formatDate(TODAY.toISOString())}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { icon: "\u{1F534}", value: overdue, label: "Overdue", accent: "#DC2626" },
            { icon: "\u{1F7E1}", value: dueSoon, label: "Due Within 7 Days", accent: "#D97706" },
            { icon: "\u{1F535}", value: upcoming, label: "Due Within 30 Days", accent: "#2563EB" },
            { icon: "\u{1F7E2}", value: compliant, label: "Fully Compliant", accent: "#059669" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px",
              border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: "16px",
            }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: s.accent + "15", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "28px", fontWeight: 800, color: s.accent, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {overdue > 0 && (
          <div style={{
            padding: "16px 20px", borderRadius: "16px",
            background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>
                {overdue} vehicle{overdue > 1 ? "s have" : " has"} overdue compliance dates
              </div>
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px" }}>
                Overdue MOT/PMI may result in DVSA prohibition or prosecution
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{
            padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB",
            fontSize: "12px", fontWeight: 600, background: "#FFFFFF", cursor: "pointer", fontFamily: "inherit",
          }}>
            <option value="all">All Companies</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {["all", "HGV", "Van", "Trailer"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: typeFilter === t ? "#0F172A" : "#F1F5F9",
              color: typeFilter === t ? "white" : "#64748B",
              fontSize: "12px", fontWeight: 700,
            }}>
              {t === "all" ? "All Types" : `${TYPES[t]} ${t}`}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{"\u{1F50D}"}</span>
            <input
              type="text" placeholder="Search vehicles..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px",
                fontSize: "13px", width: "220px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Vehicle Table */}
        <div style={{
          background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB",
          overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Vehicle", "Company", "Risk", "MOT Due", "PMI Due", "Insurance", "Tacho Cal", "Service", "Defects"].map(h => (
                    <th key={h} style={{
                      padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700,
                      color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: "2px solid #E5E7EB",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #F3F4F6" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", fontFamily: "monospace" }}>{v.reg}</div>
                          <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model} {"\u00B7"} {v.type} {"\u00B7"} {v.pmiInterval}wk PMI</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px", fontSize: "12px", color: "#374151", fontWeight: 500 }}>{v.companyName.split(" ").slice(0, 2).join(" ")}</td>
                    <td style={{ padding: "14px" }}><VehicleRiskLevel vehicle={v} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.motDue} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.pmiDue} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.insuranceDue} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.tachoDue} /></td>
                    <td style={{ padding: "14px" }}><DateBadge date={v.serviceDue} /></td>
                    <td style={{ padding: "14px" }}>
                      {v.openDefects > 0 ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "3px 8px", borderRadius: "6px",
                          background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: "12px",
                        }}>{"\u26A0\uFE0F"} {v.openDefects} open</span>
                      ) : (
                        <span style={{ color: "#10B981", fontSize: "12px", fontWeight: 600 }}>{"\u2705"} None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8", fontSize: "14px" }}>
              No vehicles match your filters
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: "16px", padding: "14px 20px", borderRadius: "12px",
          background: "#FFFFFF", border: "1px solid #E5E7EB",
          display: "flex", gap: "24px", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280" }}>DATE KEY:</span>
          {[
            { color: "#EF4444", label: "Overdue" },
            { color: "#F59E0B", label: "\u2264 7 days" },
            { color: "#3B82F6", label: "\u2264 30 days" },
            { color: "#10B981", label: "Compliant" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: "11px", color: "#374151", fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "40px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Management Platform {"\u00B7"} {"\u00A9"} 2026
      </footer>
    </div>
  );
}
