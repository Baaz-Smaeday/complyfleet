"use client";
import { useState } from "react";

// ============================================================
// COMPLYFLEET — Defect Management Lifecycle
// TM view: Track, assign, resolve, close defects across all companies
// ============================================================

const TODAY = new Date("2026-02-16");
function getDaysAgo(d) { return Math.floor((TODAY - new Date(d)) / 86400000); }
function formatDate(d) { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };

const SEVERITY = {
  dangerous: { label: "DANGEROUS", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444", desc: "Immediate safety risk \u2014 DO NOT DRIVE" },
  major: { label: "MAJOR", bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", dot: "#F97316", desc: "May affect vehicle safety" },
  minor: { label: "MINOR", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B", desc: "Does not affect vehicle safety" },
};

const STATUS = {
  open: { label: "OPEN", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444", icon: "\u{1F534}" },
  in_progress: { label: "IN PROGRESS", bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", dot: "#3B82F6", icon: "\u{1F527}" },
  resolved: { label: "RESOLVED", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981", icon: "\u2705" },
  closed: { label: "CLOSED", bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF", icon: "\u{1F512}" },
};

const DEFECTS = [
  {
    id: "DEF-001", vehicleReg: "BD63 XYZ", vehicleType: "HGV", company: "Hargreaves Haulage Ltd",
    category: "Brakes", description: "Nearside brake pad worn below limit",
    severity: "dangerous", status: "open",
    reportedBy: "Mark Thompson", reportedDate: "2026-02-15",
    assignedTo: null, notes: [],
    checkId: "CHK-2847",
  },
  {
    id: "DEF-002", vehicleReg: "GH45 IJK", vehicleType: "HGV", company: "Yorkshire Fleet Services",
    category: "MOT", description: "MOT expired \u2014 vehicle must not be used on public roads",
    severity: "dangerous", status: "in_progress",
    reportedBy: "Steve Williams", reportedDate: "2026-02-13",
    assignedTo: "Gary Firth",
    notes: [
      { date: "2026-02-13", author: "James Henderson", text: "Vehicle immediately taken off road. MOT booked at ATF for 17 Feb." },
      { date: "2026-02-14", author: "Gary Firth", text: "Preparation work done. Pre-MOT check complete." },
    ],
    checkId: "CHK-2831",
  },
  {
    id: "DEF-003", vehicleReg: "LM67 OPQ", vehicleType: "HGV", company: "Yorkshire Fleet Services",
    category: "Lights", description: "Offside indicator intermittent \u2014 works sometimes, fails on cold start",
    severity: "minor", status: "open",
    reportedBy: "Steve Williams", reportedDate: "2026-02-14",
    assignedTo: null, notes: [],
    checkId: "CHK-2839",
  },
  {
    id: "DEF-004", vehicleReg: "KL19 ABC", vehicleType: "HGV", company: "Hargreaves Haulage Ltd",
    category: "Tyres & Wheels", description: "Offside rear outer tyre \u2014 cut in sidewall approx 25mm",
    severity: "major", status: "resolved",
    reportedBy: "Alan Davies", reportedDate: "2026-02-10",
    assignedTo: "Dave Pearson",
    notes: [
      { date: "2026-02-10", author: "James Henderson", text: "Reported to Dave Pearson. Tyre supplier contacted." },
      { date: "2026-02-11", author: "Dave Pearson", text: "Replacement tyre fitted. Old tyre disposed." },
      { date: "2026-02-11", author: "James Henderson", text: "Inspected \u2014 confirmed repaired. Vehicle cleared for use." },
    ],
    resolvedDate: "2026-02-11", resolvedBy: "James Henderson",
    checkId: "CHK-2805",
  },
  {
    id: "DEF-005", vehicleReg: "AB12 CDE", vehicleType: "HGV", company: "Northern Express Transport",
    category: "Mirrors & Glass", description: "Nearside wide-angle mirror \u2014 bracket loose, vibrates at speed",
    severity: "minor", status: "resolved",
    reportedBy: "James Ward", reportedDate: "2026-02-08",
    assignedTo: "Tom Bennett",
    notes: [
      { date: "2026-02-08", author: "James Henderson", text: "Low risk but needs fixing. Assigned to Tom." },
      { date: "2026-02-09", author: "Tom Bennett", text: "Bracket tightened and secured with new bolt. Mirror tested \u2014 solid." },
    ],
    resolvedDate: "2026-02-09", resolvedBy: "James Henderson",
    checkId: "CHK-2790",
  },
  {
    id: "DEF-006", vehicleReg: "FG34 HIJ", vehicleType: "HGV", company: "Northern Express Transport",
    category: "Exhaust & Emissions", description: "Slight exhaust blow from flexi joint \u2014 audible when idling",
    severity: "minor", status: "closed",
    reportedBy: "Peter Clarke", reportedDate: "2026-01-28",
    assignedTo: "Tom Bennett",
    notes: [
      { date: "2026-01-29", author: "Tom Bennett", text: "Exhaust flexi joint replaced. No further leak." },
      { date: "2026-01-30", author: "James Henderson", text: "Verified repair. Defect closed." },
    ],
    resolvedDate: "2026-01-29", resolvedBy: "James Henderson",
    closedDate: "2026-01-30",
    checkId: "CHK-2756",
  },
  {
    id: "DEF-007", vehicleReg: "PQ21 GHI", vehicleType: "Trailer", company: "Hargreaves Haulage Ltd",
    category: "Body & Security", description: "Rear curtain strap torn \u2014 3rd from nearside",
    severity: "minor", status: "closed",
    reportedBy: "Mark Thompson", reportedDate: "2026-01-22",
    assignedTo: "Dave Pearson",
    notes: [
      { date: "2026-01-23", author: "Dave Pearson", text: "Replacement strap fitted." },
      { date: "2026-01-23", author: "James Henderson", text: "Confirmed. Closed." },
    ],
    resolvedDate: "2026-01-23", resolvedBy: "James Henderson",
    closedDate: "2026-01-23",
    checkId: "CHK-2720",
  },
];

// --- Components ---

function Pill({ config }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", borderRadius: "20px",
      background: config.bg, border: `1px solid ${config.border}`,
      fontSize: "10px", fontWeight: 700, color: config.text,
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: config.dot, flexShrink: 0 }} />
      {config.label}
    </span>
  );
}

function StatCard({ icon, value, label, accent }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px",
      border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px",
        background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{label}</div>
      </div>
    </div>
  );
}

function DefectDetailModal({ defect, onClose, onStatusChange }) {
  const sev = SEVERITY[defect.severity];
  const stat = STATUS[defect.status];
  const daysOpen = getDaysAgo(defect.reportedDate);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "680px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {/* Severity strip */}
        <div style={{ height: "4px", background: sev.dot }} />

        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, color: "#64748B" }}>{defect.id}</span>
                <Pill config={stat} />
                <Pill config={sev} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0, lineHeight: 1.3 }}>
                {defect.description}
              </h2>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8", padding: "4px",
            }}>{"\u2715"}</button>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6" }}>
          {[
            { icon: TYPES[defect.vehicleType] || "\u{1F69B}", label: "Vehicle", value: defect.vehicleReg },
            { icon: "\u{1F3E2}", label: "Company", value: defect.company.split(" ").slice(0, 2).join(" ") },
            { icon: "\u{1F4C5}", label: "Reported", value: `${formatDate(defect.reportedDate)} (${daysOpen}d ago)` },
          ].map(item => (
            <div key={item.label} style={{ padding: "16px 20px", borderRight: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: "16px", marginBottom: "4px" }}>{item.icon}</div>
              <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px 28px" }}>
          {/* Detail fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {[
              { icon: "\u{1F3F7}\uFE0F", label: "Category", value: defect.category },
              { icon: "\u{1F464}", label: "Reported By", value: defect.reportedBy },
              { icon: "\u{1F527}", label: "Assigned To", value: defect.assignedTo || "Unassigned" },
              { icon: "\u{1F4CB}", label: "Check ID", value: defect.checkId },
            ].map(item => (
              <div key={item.label} style={{ padding: "12px 14px", borderRadius: "12px", background: "#F8FAFC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: item.value === "Unassigned" ? "#DC2626" : "#111827", marginTop: "2px" }}>{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          {defect.notes.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>{"\u{1F4DD}"} Activity Timeline</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0px", position: "relative" }}>
                {defect.notes.map((note, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", paddingBottom: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #1E40AF, #3B82F6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 700, fontSize: "11px",
                      }}>
                        {note.author.split(" ").map(n => n[0]).join("")}
                      </div>
                      {i < defect.notes.length - 1 && (
                        <div style={{ width: "2px", flex: 1, background: "#E5E7EB", marginTop: "4px" }} />
                      )}
                    </div>
                    <div style={{
                      flex: 1, padding: "12px 16px", borderRadius: "12px",
                      background: "#F8FAFC", border: "1px solid #E5E7EB",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{note.author}</span>
                        <span style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(note.date)}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: 1.5 }}>{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Info */}
          {defect.resolvedDate && (
            <div style={{
              padding: "16px 20px", borderRadius: "12px",
              background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>{"\u2705"}</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#065F46" }}>
                    Resolved by {defect.resolvedBy} on {formatDate(defect.resolvedDate)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#059669", marginTop: "2px" }}>
                    {getDaysAgo(defect.reportedDate) - getDaysAgo(defect.resolvedDate)} day(s) to resolve
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {defect.status !== "closed" && (
            <div style={{ display: "flex", gap: "10px" }}>
              {defect.status === "open" && (
                <>
                  <button onClick={() => onStatusChange(defect.id, "in_progress")} style={{
                    flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                    background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white",
                    fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  }}>{"\u{1F527}"} Assign & Start Work</button>
                  <button style={{
                    padding: "12px 16px", borderRadius: "12px",
                    border: "1px solid #E5E7EB", background: "#F8FAFC",
                    fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer",
                  }}>{"\u{1F4DD}"} Add Note</button>
                </>
              )}
              {defect.status === "in_progress" && (
                <>
                  <button onClick={() => onStatusChange(defect.id, "resolved")} style={{
                    flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                    background: "linear-gradient(135deg, #059669, #10B981)", color: "white",
                    fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  }}>{"\u2705"} Mark Resolved</button>
                  <button style={{
                    padding: "12px 16px", borderRadius: "12px",
                    border: "1px solid #E5E7EB", background: "#F8FAFC",
                    fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer",
                  }}>{"\u{1F4DD}"} Add Note</button>
                </>
              )}
              {defect.status === "resolved" && (
                <button onClick={() => onStatusChange(defect.id, "closed")} style={{
                  flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
                  fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}>{"\u{1F512}"} Close Defect</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function ComplyFleetDefects() {
  const [filter, setFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [defects, setDefects] = useState(DEFECTS);

  const handleStatusChange = (id, newStatus) => {
    setDefects(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    setSelectedDefect(null);
  };

  const filtered = defects.filter(d => {
    if (filter !== "all" && d.status !== filter) return false;
    if (severityFilter !== "all" && d.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.description.toLowerCase().includes(q) || d.vehicleReg.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: defects.length, open: defects.filter(d => d.status === "open").length,
    in_progress: defects.filter(d => d.status === "in_progress").length,
    resolved: defects.filter(d => d.status === "resolved").length,
    closed: defects.filter(d => d.status === "closed").length,
  };

  const dangerousOpen = defects.filter(d => d.severity === "dangerous" && (d.status === "open" || d.status === "in_progress")).length;

  return (
    <div style={{
      minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; }
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
            position: "relative", width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <span style={{ fontSize: "18px" }}>{"\u{1F514}"}</span>
            {dangerousOpen > 0 && <span style={{
              position: "absolute", top: "-4px", right: "-4px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#EF4444", color: "white", fontSize: "10px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0F172A",
            }}>{dangerousOpen}</span>}
          </div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "13px",
          }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {"\u26A0\uFE0F"} Defect Management
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            Track, assign and resolve defects across all operator companies
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <StatCard icon={"\u{1F534}"} value={counts.open} label="Open Defects" accent="#DC2626" />
          <StatCard icon={"\u{1F527}"} value={counts.in_progress} label="In Progress" accent="#2563EB" />
          <StatCard icon={"\u2705"} value={counts.resolved} label="Resolved" accent="#059669" />
          <StatCard icon={"\u{1F512}"} value={counts.closed} label="Closed" accent="#64748B" />
        </div>

        {/* Dangerous alert */}
        {dangerousOpen > 0 && (
          <div style={{
            padding: "16px 20px", borderRadius: "16px",
            background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>
                {dangerousOpen} dangerous defect{dangerousOpen > 1 ? "s" : ""} require immediate action
              </div>
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px" }}>
                Vehicles with dangerous defects must not be used on public roads
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { key: "all", label: "All" }, { key: "open", label: "Open" },
            { key: "in_progress", label: "In Progress" }, { key: "resolved", label: "Resolved" },
            { key: "closed", label: "Closed" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: filter === f.key ? "#0F172A" : "#F1F5F9",
              color: filter === f.key ? "white" : "#64748B",
              fontSize: "12px", fontWeight: 700, transition: "all 0.15s ease",
            }}>
              {f.label} <span style={{ opacity: 0.6, marginLeft: "4px" }}>{counts[f.key]}</span>
            </button>
          ))}

          <div style={{ width: "1px", height: "24px", background: "#E5E7EB", margin: "0 4px" }} />

          {["all", "dangerous", "major", "minor"].map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)} style={{
              padding: "6px 10px", borderRadius: "8px", border: "1px solid",
              borderColor: severityFilter === s ? (s === "all" ? "#0F172A" : SEVERITY[s]?.dot || "#0F172A") : "#E5E7EB",
              background: severityFilter === s ? (s === "all" ? "#0F172A" : SEVERITY[s]?.bg || "#0F172A") : "#FFFFFF",
              color: severityFilter === s ? (s === "all" ? "white" : SEVERITY[s]?.text || "white") : "#6B7280",
              fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
            }}>
              {s === "all" ? "All Severity" : s}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{"\u{1F50D}"}</span>
            <input
              type="text" placeholder="Search defects..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px",
                fontSize: "13px", width: "220px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Defect Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(defect => {
            const sev = SEVERITY[defect.severity];
            const stat = STATUS[defect.status];
            const daysOpen = getDaysAgo(defect.reportedDate);

            return (
              <div key={defect.id} onClick={() => setSelectedDefect(defect)}
                style={{
                  background: "#FFFFFF", borderRadius: "16px",
                  border: `1px solid ${defect.severity === "dangerous" && defect.status !== "closed" ? sev.border : "#E5E7EB"}`,
                  overflow: "hidden", cursor: "pointer", transition: "all 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}
              >
                {/* Severity strip */}
                <div style={{ height: "3px", background: sev.dot }} />

                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Status icon */}
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "12px",
                    background: stat.bg, border: `1px solid ${stat.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", flexShrink: 0,
                  }}>{stat.icon}</div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "#94A3B8" }}>{defect.id}</span>
                      <Pill config={sev} />
                      <Pill config={stat} />
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {defect.description}
                    </h3>
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <span>{TYPES[defect.vehicleType]} {defect.vehicleReg}</span>
                      <span>{"\u{1F3E2}"} {defect.company}</span>
                      <span>{"\u{1F3F7}\uFE0F"} {defect.category}</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(defect.reportedDate)}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: daysOpen > 3 && defect.status === "open" ? "#DC2626" : "#6B7280", marginTop: "2px" }}>
                      {defect.status === "closed" ? "Closed" : `${daysOpen}d open`}
                    </div>
                    {defect.assignedTo && (
                      <div style={{ fontSize: "11px", color: "#2563EB", marginTop: "4px", fontWeight: 600 }}>
                        {"\u{1F527}"} {defect.assignedTo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8", fontSize: "14px" }}>
              No defects match your filters
            </div>
          )}
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "40px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Management Platform {"\u00B7"} {"\u00A9"} 2026
      </footer>

      {selectedDefect && (
        <DefectDetailModal
          defect={selectedDefect}
          onClose={() => setSelectedDefect(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
