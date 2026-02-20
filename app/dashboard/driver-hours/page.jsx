"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../../lib/supabase";

const VIOLATION_META = {
  DAILY_DRIVING_EXCEEDED:   { label: "Daily Driving Exceeded",   color: "#dc2626", bg: "#fef2f2", icon: "🚛" },
  BREAK_NOT_TAKEN:          { label: "Break Not Taken",           color: "#d97706", bg: "#fffbeb", icon: "⏸️" },
  WEEKLY_HOURS_EXCEEDED:    { label: "Weekly Hours Exceeded",     color: "#7c3aed", bg: "#f5f3ff", icon: "📅" },
  DAILY_REST_INSUFFICIENT:  { label: "Daily Rest Insufficient",   color: "#0369a1", bg: "#eff6ff", icon: "🌙" },
  EXTENSION_LIMIT_EXCEEDED: { label: "Extension Limit Exceeded",  color: "#be123c", bg: "#fff1f2", icon: "⚠️" },
};

function fmtMins(mins) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function ViolationBadge({ code }) {
  const meta = VIOLATION_META[code] || { label: code, color: "#6b7280", bg: "#f9fafb", icon: "⚡" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}22`, whiteSpace: "nowrap" }}>
      {meta.icon} {meta.label}
    </span>
  );
}

// ── Log Hours Modal ───────────────────────────────────────────────────────────
function LogHoursModal({ drivers, defaultCompanyId, onClose, onSave }) {
  const [driverId, setDriverId] = useState(drivers[0]?.id || "");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split("T")[0]);
  const [drivingHrs, setDrivingHrs] = useState("");
  const [drivingMins, setDrivingMins] = useState("");
  const [breakMins, setBreakMins] = useState("");
  const [restHrs, setRestHrs] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function calcViolations(drivingMinutes, breakMinutes, restMinutes) {
    const violations = [];
    if (drivingMinutes > 540) violations.push("DAILY_DRIVING_EXCEEDED");
    if (drivingMinutes > 270 && breakMinutes < 45) violations.push("BREAK_NOT_TAKEN");
    if (restMinutes > 0 && restMinutes < 660) violations.push("DAILY_REST_INSUFFICIENT");
    if (drivingMinutes > 600) violations.push("EXTENSION_LIMIT_EXCEEDED");
    return violations;
  }

  async function handleSave() {
    if (!driverId || !shiftDate) return;
    setSaving(true);
    const drivingMinutes = (parseInt(drivingHrs) || 0) * 60 + (parseInt(drivingMins) || 0);
    const breakMinutes = parseInt(breakMins) || 0;
    const restMinutes = (parseInt(restHrs) || 0) * 60;
    const violations = calcViolations(drivingMinutes, breakMinutes, restMinutes);
    const driver = drivers.find(d => d.id === driverId);
    await onSave({ driver_id: driverId, company_id: driver?.company_id || defaultCompanyId, shift_date: shiftDate, driving_minutes: drivingMinutes, break_minutes: breakMinutes, rest_minutes: restMinutes, violations, notes: notes || null });
    setSaving(false);
    onClose();
  }

  const drivingMinutes = (parseInt(drivingHrs) || 0) * 60 + (parseInt(drivingMins) || 0);
  const breakMinutes = parseInt(breakMins) || 0;
  const restMinutes = (parseInt(restHrs) || 0) * 60;
  const previewViolations = drivingMinutes > 0 ? calcViolations(drivingMinutes, breakMinutes, restMinutes) : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>⏱️ Log Driver Hours</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Violations are auto-calculated from DVSA limits</div>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Driver *</label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit", background: "#FFF" }}>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Shift Date *</label>
            <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Driving Time *</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" value={drivingHrs} onChange={e => setDrivingHrs(e.target.value)} placeholder="Hrs" min="0" max="24" style={{ flex: 1, padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit" }} />
              <input type="number" value={drivingMins} onChange={e => setDrivingMins(e.target.value)} placeholder="Mins" min="0" max="59" style={{ flex: 1, padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Break Taken (minutes)</label>
            <input type="number" value={breakMins} onChange={e => setBreakMins(e.target.value)} placeholder="e.g. 45" min="0" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Daily Rest (hours, optional)</label>
            <input type="number" value={restHrs} onChange={e => setRestHrs(e.target.value)} placeholder="e.g. 11" min="0" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} />
          </div>
          {previewViolations.length > 0 && (
            <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#991B1B", marginBottom: "6px" }}>⚠️ Violations detected:</div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {previewViolations.map(v => <ViolationBadge key={v} code={v} />)}
              </div>
            </div>
          )}
          {previewViolations.length === 0 && drivingMinutes > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#ECFDF5", border: "1px solid #A7F3D0", fontSize: "12px", color: "#065F46" }}>
              ✅ No violations detected — compliant shift
            </div>
          )}
        </div>
        <div style={{ padding: "18px 26px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!driverId || !shiftDate || drivingMinutes === 0 || saving} style={{ padding: "10px 22px", border: "none", borderRadius: "10px", background: (driverId && shiftDate && drivingMinutes > 0) ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Hours"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverHoursPage() {
  const [records, setRecords] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState("All");
  const [driverFilter, setDriverFilter] = useState("All Drivers");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [myCompanyId, setMyCompanyId] = useState(null);

  const isCompanyAdmin = profile?.role === "company_admin" || profile?.role === "company_viewer";

  useEffect(() => {
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) {
            if (data.account_status === "inactive") { window.location.href = "/suspended?reason=inactive"; return; }
            setProfile(data);
            loadData(data);
          }
        });
      });
    } else { setLoading(false); }
  }, []);

  async function loadData(userProfile) {
    setLoading(true);
    try {
      let companyIds = null;

      if (userProfile?.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (userProfile?.role === "company_admin" || userProfile?.role === "company_viewer") {
        // ✅ COMPANY ADMIN: only their own company
        const { data: comp } = await supabase.from("companies").select("id, name").eq("user_id", userProfile.id).single();
        if (comp) { companyIds = [comp.id]; setMyCompanyId(comp.id); }
        else companyIds = [];
      }

      const nullId = ["00000000-0000-0000-0000-000000000000"];
      const ids = companyIds?.length > 0 ? companyIds : nullId;

      let cQ = supabase.from("companies").select("id, name").is("archived_at", null);
      let dQ = supabase.from("drivers").select("id, name, company_id").is("archived_at", null).order("name");
      let rQ = supabase.from("driver_hours").select("*").order("shift_date", { ascending: false }).limit(100);

      if (companyIds) { cQ = cQ.in("id", ids); dQ = dQ.in("company_id", ids); rQ = rQ.in("company_id", ids); }

      const [{ data: cos }, { data: drvs }, { data: recs }] = await Promise.all([cQ, dQ, rQ]);

      setCompanies(cos || []);
      setDrivers(drvs || []);

      // Build driver name map
      const dMap = {};
      (drvs || []).forEach(d => { dMap[d.id] = d.name; });
      const cMap = {};
      (cos || []).forEach(c => { cMap[c.id] = c.name; });

      setRecords((recs || []).map(r => ({
        ...r,
        driver: dMap[r.driver_id] || r.driver_name || "Unknown",
        company: cMap[r.company_id] || "Unknown",
        violations: Array.isArray(r.violations) ? r.violations : (r.violations ? JSON.parse(r.violations) : []),
      })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSaveHours(data) {
    await supabase.from("driver_hours").insert(data);
    loadData(profile);
  }

  const uniqueDrivers = ["All Drivers", ...new Set(records.map(r => r.driver))];
  const totalViolations = records.filter(r => r.violations.length > 0).length;
  const compliant = records.filter(r => r.violations.length === 0).length;
  const uniqueViolators = new Set(records.filter(r => r.violations.length > 0).map(r => r.driver)).size;
  const hasViolations = records.some(r => r.violations.length > 0);

  const filtered = records.filter(row => {
    const matchDriver = driverFilter === "All Drivers" || row.driver === driverFilter;
    const matchFilter = filter === "All" ? true : filter === "Violations" ? row.violations.length > 0 : row.violations.length === 0;
    return matchDriver && matchFilter;
  });

  const initials = (name) => (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const headerName = isCompanyAdmin ? (companies[0]?.name || "Company") : (profile?.full_name || "User");

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#F1F5F9", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
      `}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          {isCompanyAdmin && <span style={{ padding: "3px 10px", borderRadius: "6px", background: "rgba(5,150,105,0.2)", color: "#6EE7B7", fontSize: "10px", fontWeight: 700 }}>COMPANY</span>}
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{headerName}</div>
              <div style={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}>{(profile?.role || "").replace("_", " ")}</div>
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "13px", border: "2px solid rgba(255,255,255,0.15)" }}>{initials(headerName)}</div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "52px", background: "white", borderRadius: "14px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", padding: "8px", minWidth: "180px", zIndex: 200 }}>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 20px" }}>
        {/* Single back button */}
        <div style={{ marginBottom: "20px" }}>
          <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", background: "white", border: "1px solid #E2E8F0", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none" }}>← Back to Dashboard</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 10 }}>⏱️ Driver Hours</h1>
            <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "13px" }}>Daily limit 9hrs · Break 45min after 4.5hrs · Weekly max 56hrs · DVSA legal requirements</p>
          </div>
          <button onClick={() => setShowLogModal(true)} style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)", color: "#FFF", border: "none", borderRadius: "12px", padding: "10px 20px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            + Log Hours
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          {[
            { icon: "👥", value: new Set(records.map(r => r.driver)).size, label: "Total Drivers", color: "#2563EB" },
            { icon: "🚨", value: totalViolations, label: "Shifts with Violations", color: "#DC2626", danger: totalViolations > 0 },
            { icon: "⚠️", value: uniqueViolators, label: "Drivers in Breach", color: "#D97706", danger: uniqueViolators > 0 },
            { icon: "✅", value: compliant, label: "Compliant Shifts", color: "#16A34A" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.danger ? "#FFF5F5" : "#FFF", borderRadius: "12px", padding: "20px 24px", border: s.danger ? "1px solid #FECACA" : "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", background: s.danger ? "#FEE2E2" : "#F1F5F9" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "26px", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {hasViolations && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "10px", padding: "14px 18px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>🚨</span>
            <div>
              <div style={{ fontWeight: 600, color: "#991B1B", fontSize: "14px" }}>DVSA compliance risk</div>
              <div style={{ color: "#DC2626", fontSize: "13px" }}>{uniqueViolators} driver{uniqueViolators > 1 ? "s" : ""} with hours violations in the last 7 days</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px", background: "#FFF", color: "#1E293B", fontFamily: "inherit" }}>
            {uniqueDrivers.map(d => <option key={d}>{d}</option>)}
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            {["All", "Violations", "Compliant"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: filter === f ? "#0F172A" : "#FFF", color: filter === f ? "#FFF" : "#64748B", transition: "all 0.15s" }}>
                {f === "All" ? "📋 All" : f === "Violations" ? "🚨 Violations" : "✅ Compliant"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#94A3B8" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏱️</div>
            <p style={{ fontWeight: 600 }}>Loading driver hours...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#94A3B8" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏱️</div>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#374151", marginBottom: "8px" }}>No hours logged yet</div>
            <div style={{ fontSize: "13px", marginBottom: "24px" }}>Start logging driver shifts to track DVSA compliance</div>
            <button onClick={() => setShowLogModal(true)} style={{ padding: "12px 24px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>+ Log First Shift</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map(row => {
              const isBreached = row.violations.length > 0;
              return (
                <div key={row.id} style={{ background: "#FFF", border: isBreached ? "1px solid #FECACA" : "1px solid #DCFCE7", borderLeft: isBreached ? "4px solid #DC2626" : "4px solid #16A34A", borderRadius: "12px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", background: isBreached ? "#FEE2E2" : "#DCFCE7" }}>
                        {isBreached ? "🚨" : "✅"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "#0F172A" }}>{row.driver}</div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>{row.company} · {row.shift_date}</div>
                      </div>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 600, background: isBreached ? "#FEF2F2" : "#F0FDF4", color: isBreached ? "#DC2626" : "#16A34A", border: `1px solid ${isBreached ? "#FECACA" : "#BBF7D0"}` }}>
                      {isBreached ? `● ${row.violations.length} Violation${row.violations.length > 1 ? "s" : ""}` : "● Compliant"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "24px", margin: "14px 0 12px", flexWrap: "wrap" }}>
                    {[
                      { label: "Driving", val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
                      { label: "Break",   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
                      { label: "Rest",    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : "—", warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
                    ].map(({ label, val, warn }) => (
                      <div key={label}>
                        <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: warn ? "#DC2626" : "#1E293B" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {row.violations.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                      {row.violations.map(v => <ViolationBadge key={v} code={v} />)}
                    </div>
                  )}
                  {row.notes && (
                    <div style={{ fontSize: "13px", color: "#64748B", borderTop: "1px solid #F1F5F9", paddingTop: "10px" }}>
                      📝 {row.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>
        ComplyFleet v1.0 · DVSA Compliance Platform · © 2026
      </footer>

      {showLogModal && drivers.length > 0 && (
        <LogHoursModal drivers={drivers} defaultCompanyId={myCompanyId} onClose={() => setShowLogModal(false)} onSave={handleSaveHours} />
      )}
      {showLogModal && drivers.length === 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowLogModal(false)}>
          <div style={{ background: "#FFF", borderRadius: "20px", padding: "32px", maxWidth: "400px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>👤</div>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A", marginBottom: "8px" }}>No drivers found</div>
            <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Add drivers in Tacho Compliance first before logging hours</div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setShowLogModal(false)} style={{ padding: "10px 18px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Close</button>
              <a href="/tacho" style={{ padding: "10px 18px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Go to Tacho</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
