"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { calcComplianceScore, scoreColor, exportFleetCSV, exportDefectsCSV, exportChecksCSV, printReport } from "../../lib/utils";
import { ComplianceDonutInline } from "../../components/ComplianceDonut";
import ExportDropdown from "../../components/ExportDropdown";

const TODAY = new Date();
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "HIGH RISK" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "MEDIUM" },
  low: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "LOW" },
  green: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
};
const SEVERITY = {
  dangerous: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444", label: "DANGEROUS" },
  major: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", dot: "#F97316", label: "MAJOR" },
  minor: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B", label: "MINOR" },
};
const STATUS_COLORS = { open: "#EF4444", in_progress: "#3B82F6", resolved: "#10B981", closed: "#9CA3AF" };
const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };
const DATE_FIELDS = ["mot_due", "pmi_due", "insurance_due", "tacho_due", "service_due"];

function RiskPill({ level }) {
  const cfg = RISK[level];
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, letterSpacing: "0.05em" }}>
    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
  </span>);
}

function SevPill({ level }) {
  const cfg = SEVERITY[level]; if (!cfg) return null;
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text }}>
    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
  </span>);
}

function StatCard({ icon, value, label, accent, sub, href }) {
  const card = (<div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "16px", cursor: href ? "pointer" : "default", transition: "all 0.15s" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{icon}</div>
    <div><div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div><div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{label}</div>{sub && <div style={{ fontSize: "11px", color: accent, fontWeight: 600, marginTop: "2px" }}>{sub}</div>}</div>
  </div>);
  if (href) return <a href={href} style={{ textDecoration: "none", color: "inherit" }}
    onMouseEnter={e => { e.currentTarget.firstChild.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.firstChild.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.firstChild.style.boxShadow = ""; e.currentTarget.firstChild.style.transform = ""; }}>{card}</a>;
  return card;
}

export default function ComplyFleetDashboard() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [profile, setProfile] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Auth check
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      });
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    if (isSupabaseReady()) {
      const [cRes, vRes, dRes, chRes] = await Promise.all([
        supabase.from("companies").select("*").is("archived_at", null).order("name"),
        supabase.from("vehicles").select("*").is("archived_at", null).order("reg"),
        supabase.from("defects").select("*").in("status", ["open", "in_progress"]).order("reported_date", { ascending: false }),
        supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }).limit(20),
      ]);
      setCompanies(cRes.data || []);
      setVehicles(vRes.data || []);
      setDefects(dRes.data || []);
      setChecks(chRes.data || []);
    }
    setLoading(false);
  }

  const filteredVehicles = selectedCompany === "all" ? vehicles : vehicles.filter(v => v.company_id === selectedCompany);
  const filteredDefects = selectedCompany === "all" ? defects : defects.filter(d => d.company_id === selectedCompany);
  const overdue = filteredVehicles.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f]); return d !== null && d < 0; })).length;
  const dueSoon = filteredVehicles.filter(v => { const w = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f]) ?? 9999)); return w >= 0 && w <= 7; }).length;
  const dangerousOpen = filteredDefects.filter(d => d.severity === "dangerous").length;

  function getCompanyRisk(cid) {
    const vehs = vehicles.filter(v => v.company_id === cid);
    let worst = "green";
    const p = { high: 3, medium: 2, low: 1, green: 0 };
    vehs.forEach(v => { DATE_FIELDS.forEach(f => { const r = getRisk(getDaysUntil(v[f])); if (p[r] > p[worst]) worst = r; }); });
    return worst;
  }

  const urgentVehicles = [...filteredVehicles].map(v => {
    const worstDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f]) ?? 9999));
    const worstField = DATE_FIELDS.find(f => getDaysUntil(v[f]) === worstDays);
    return { ...v, worstDays, worstField, risk: getRisk(worstDays) };
  }).filter(v => v.worstDays <= 30).sort((a, b) => a.worstDays - b.worstDays).slice(0, 10);

  const FIELD_LABELS = { mot_due: "MOT", pmi_due: "PMI", insurance_due: "Insurance", tacho_due: "Tacho", service_due: "Service" };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <span style={{ color: "#94A3B8", fontSize: "12px" }}>{formatDate(TODAY)}</span>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>{profile?.full_name || "User"}</div>
              <div style={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}>{(profile?.role || "").replace("_", " ")}</div>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>{profile?.full_name ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) : "??"}</div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "52px", background: "white", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: "8px", minWidth: "200px", zIndex: 200 }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{profile?.full_name}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>{profile?.email}</div>
                <div style={{ fontSize: "10px", color: "#2563EB", fontWeight: 600, textTransform: "uppercase", marginTop: "4px" }}>{(profile?.role || "").replace("_", " ")}</div>
              </div>
              {profile?.role === "platform_owner" && (
                <a href="/admin" style={{ display: "block", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none", borderRadius: "8px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F6E0}\uFE0F"} Super Admin</a>
              )}
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }} style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>{"\u{1F6AA}"} Sign Out</button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4CA}"} TM Dashboard</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Compliance overview across all operators</p></div>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "13px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
            <option value="all">All Companies ({companies.length})</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading dashboard...</div> : (<>
          {/* Stats — all clickable */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <StatCard icon={"\u{1F3E2}"} value={selectedCompany === "all" ? companies.length : 1} label="Companies" accent="#2563EB" href="/company" />
            <StatCard icon={"\u{1F69B}"} value={filteredVehicles.length} label="Active Vehicles" accent="#0F172A" sub={overdue > 0 ? `${overdue} overdue` : null} href="/vehicles?filter=active" />
            <StatCard icon={"\u26A0\uFE0F"} value={filteredDefects.length} label="Open Defects" accent="#DC2626" sub={dangerousOpen > 0 ? `${dangerousOpen} dangerous` : null} href="/defects?status=open" />
            <StatCard icon={"\u{1F4CB}"} value={checks.length} label="Recent Checks" accent="#059669" href="/checks?range=30d" />
          </div>

          {/* Alert */}
          {(overdue > 0 || dangerousOpen > 0) && (<div style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>Immediate attention required</div>
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px" }}>
                {overdue > 0 && `${overdue} vehicle${overdue > 1 ? "s" : ""} with overdue compliance dates. `}
                {dangerousOpen > 0 && `${dangerousOpen} dangerous defect${dangerousOpen > 1 ? "s" : ""} open.`}
              </div>
            </div>
          </div>)}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Companies with Compliance Donut */}
              {selectedCompany === "all" && (<div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #F3F4F6" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F3E2}"} Operator Companies</h2>
                </div>
                <div style={{ padding: "12px" }}>
                  {companies.map(c => {
                    const risk = getCompanyRisk(c.id);
                    const cVehicles = vehicles.filter(v => v.company_id === c.id);
                    const cDefects = defects.filter(d => d.company_id === c.id);
                    const score = calcComplianceScore(cVehicles, cDefects);
                    return (<a key={c.id} href={`/portal?company=${c.id}`} style={{
                      display: "flex", alignItems: "center", gap: "14px", textDecoration: "none", color: "inherit",
                      padding: "14px 16px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "8px",
                      transition: "all 0.15s",
                    }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <ComplianceDonutInline score={score} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{c.name}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{c.o_licence} {"\u00B7"} {cVehicles.length} vehicles</div>
                      </div>
                      <RiskPill level={risk} />
                      {cDefects.length > 0 && <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626" }}>{cDefects.length} defects</span>}
                    </a>);
                  })}
                </div>
              </div>)}

              {/* Urgent Vehicles */}
              <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #F3F4F6" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u26A0\uFE0F"} Upcoming Compliance</h2>
                </div>
                <div style={{ padding: "12px" }}>
                  {urgentVehicles.length === 0 ? <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: "13px" }}>All vehicles compliant</div> :
                  urgentVehicles.map(v => (
                    <div key={v.id} style={{ padding: "12px 16px", borderRadius: "12px", border: `1px solid ${RISK[v.risk].border}`, background: RISK[v.risk].bg, marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "monospace", color: "#111827" }}>{v.reg}</div><div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model}</div></div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: RISK[v.risk].text }}>{FIELD_LABELS[v.worstField]} {v.worstDays < 0 ? `${Math.abs(v.worstDays)}d overdue` : v.worstDays === 0 ? "Today" : `in ${v.worstDays}d`}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>{formatDate(v[v.worstField])}</div>
                      </div>
                      <RiskPill level={v.risk} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Open Defects */}
              <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F534}"} Open Defects</h2>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <ExportDropdown onCSV={() => exportDefectsCSV(filteredDefects)} onPDF={() => printReport("Open Defects", `${filteredDefects.length} defects`, ["Vehicle", "Description", "Category", "Severity", "Status", "Reported"], filteredDefects.map(d => [d.vehicle_reg, d.description, d.category, (d.severity||"").toUpperCase(), d.status, formatDate(d.reported_date)]), (row) => row[3] === "DANGEROUS" ? "danger" : row[3] === "MAJOR" ? "warn" : "")} />
                    <a href="/defects?status=open" style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>View All {"\u2192"}</a>
                  </div>
                </div>
                <div style={{ padding: "12px" }}>
                  {filteredDefects.length === 0 ? <div style={{ textAlign: "center", padding: "24px", color: "#10B981", fontSize: "13px", fontWeight: 600 }}>{"\u2705"} No open defects</div> :
                  filteredDefects.slice(0, 8).map(d => (
                    <div key={d.id} style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: STATUS_COLORS[d.status], flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{TYPES[d.vehicle_type]} {d.vehicle_reg} {"\u00B7"} {d.category}</div>
                      </div>
                      <SevPill level={d.severity} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Checks */}
              <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F4CB}"} Recent Walkaround Checks</h2>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <ExportDropdown onCSV={() => exportChecksCSV(checks)} onPDF={() => printReport("Walkaround Checks", `${checks.length} checks`, ["Ref", "Vehicle", "Driver", "Result", "Defects", "Date"], checks.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result === "pass" ? "\u2705 PASS" : "\u26A0\uFE0F FAIL", ch.defects_reported || 0, formatDate(ch.completed_at)]), (row) => row[3].includes("FAIL") ? "danger" : "")} />
                    <a href="/checks?range=30d" style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>View All {"\u2192"}</a>
                  </div>
                </div>
                <div style={{ padding: "12px" }}>
                  {checks.length === 0 ? <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: "13px" }}>No checks yet</div> :
                  checks.slice(0, 8).map(ch => (
                    <div key={ch.id} style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{ch.result === "pass" ? "\u2705" : "\u26A0\uFE0F"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{ch.vehicle_reg} {"\u2014"} {ch.driver_name}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{ch.reference_id} {"\u00B7"} {ch.defects_reported > 0 ? `${ch.defects_reported} defects` : "No defects"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "20px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${ch.result === "pass" ? "#A7F3D0" : "#FECACA"}`, fontSize: "10px", fontWeight: 700, color: ch.result === "pass" ? "#059669" : "#DC2626" }}>{ch.result === "pass" ? "SAFE" : "DEFECTS"}</span>
                        <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px" }}>{formatDate(ch.completed_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "24px" }}>
            {[
              { href: "/company", icon: "\u{1F3E2}", label: "Companies & Fleet", desc: "Add/edit companies and vehicles" },
              { href: "/defects?status=open", icon: "\u26A0\uFE0F", label: "Defect Management", desc: "Track and resolve defects" },
              { href: "/vehicles", icon: "\u{1F69B}", label: "Vehicle Compliance", desc: "MOT, PMI, insurance dates" },
              { href: "/checks", icon: "\u{1F4CB}", label: "Walkaround Checks", desc: "View all checks across companies" },
              { href: "/qr-codes", icon: "\u{1F4F1}", label: "QR Codes", desc: "Generate vehicle QR codes" },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ background: "#FFF", padding: "18px 20px", borderRadius: "14px", border: "1px solid #E5E7EB", textDecoration: "none", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
                <span style={{ fontSize: "24px" }}>{l.icon}</span>
                <div><div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{l.label}</div><div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{l.desc}</div></div>
              </a>
            ))}
          </div>
        </>)}
      </main>
      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>
    </div>
  );
}
