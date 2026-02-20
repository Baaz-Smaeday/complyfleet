"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { calcComplianceScore, scoreColor, exportFleetCSV, exportDefectsCSV, exportChecksCSV, printReport } from "../../lib/utils";
import { ComplianceDonutInline } from "../../components/ComplianceDonut";
import ExportDropdown from "../../components/ExportDropdown";

const TODAY = new Date();
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high:   { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "HIGH RISK",  glow: "220,38,38" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "MEDIUM",     glow: "217,119,6" },
  low:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "LOW",        glow: "37,99,235" },
  green:  { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK",         glow: "5,150,105" },
};
const SEVERITY = {
  dangerous: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444", label: "DANGEROUS", glow: "239,68,68" },
  major:     { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", dot: "#F97316", label: "MAJOR",     glow: "249,115,22" },
  minor:     { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B", label: "MINOR",     glow: "245,158,11" },
};
const STATUS_COLORS = { open: "#EF4444", in_progress: "#3B82F6", resolved: "#10B981", closed: "#9CA3AF" };
const TYPES = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };
const DATE_FIELDS = ["mot_due", "pmi_due", "insurance_due", "tacho_due", "service_due"];
const FIELD_LABELS = { mot_due: "MOT", pmi_due: "PMI", insurance_due: "Insurance", tacho_due: "Tacho", service_due: "Service" };

function GlowCard({ children, glowColor = "59,130,246", style = {}, onClick, href }) {
  const [hovered, setHovered] = useState(false);
  const containerStyle = { position: "relative", borderRadius: "18px", cursor: onClick || href ? "pointer" : "default", ...style };
  const glowStyle = { position: "absolute", inset: "-2px", borderRadius: "20px", background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, rgba(${glowColor},0.4) 40%, transparent 60%, rgba(${glowColor},0.6) 80%, rgba(${glowColor},0.9) 100%)` : "transparent", animation: hovered ? "spin 2s linear infinite" : "none", transition: "opacity 0.3s", zIndex: 0 };
  const innerStyle = { position: "relative", zIndex: 1, borderRadius: "16px", background: "#FFF", height: "100%", transform: hovered ? "translateY(-3px)" : "none", boxShadow: hovered ? `0 16px 40px rgba(${glowColor},0.2), 0 4px 12px rgba(0,0,0,0.08)` : "0 1px 3px rgba(0,0,0,0.06)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease", overflow: "hidden" };
  const content = (<div style={containerStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}><div style={glowStyle} /><div style={innerStyle}>{children}</div></div>);
  if (href) return <a href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{content}</a>;
  return content;
}

function CountUp({ value, prefix = "", suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const num = parseInt(String(value).replace(/[^0-9]/g, "")) || 0;
  useEffect(() => {
    if (num === 0) { setDisplay(0); return; }
    let start = 0; const dur = 800; const step = 16; const inc = num / (dur / step);
    const t = setInterval(() => { start += inc; if (start >= num) { setDisplay(num); clearInterval(t); } else setDisplay(Math.floor(start)); }, step);
    return () => clearInterval(t);
  }, [num]);
  if (isNaN(num)) return <>{value}</>;
  return <>{prefix}{display}{suffix}</>;
}

function StatCard({ icon, value, label, accent, sub, subDanger, href }) {
  return (
    <GlowCard glowColor={accent === "#DC2626" ? "220,38,38" : accent === "#2563EB" ? "37,99,235" : accent === "#059669" ? "5,150,105" : "15,23,42"} href={href}>
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 800, color: accent, lineHeight: 1 }}><CountUp value={value} /></div>
          <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, marginTop: "4px" }}>{label}</div>
          {sub && <div style={{ fontSize: "11px", color: subDanger ? "#DC2626" : accent, fontWeight: 700, marginTop: "2px" }}>{sub}</div>}
        </div>
      </div>
    </GlowCard>
  );
}

function RiskPill({ level }) {
  const cfg = RISK[level];
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, letterSpacing: "0.04em", flexShrink: 0 }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}</span>);
}
function SevPill({ level }) {
  const cfg = SEVERITY[level]; if (!cfg) return null;
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, flexShrink: 0 }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}</span>);
}

function HoverRow({ children, href, glowColor = "59,130,246", borderLeft, style = {} }) {
  const [hovered, setHovered] = useState(false);
  const s = { display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderRadius: "12px", border: `1px solid ${hovered ? `rgba(${glowColor},0.5)` : "#E5E7EB"}`, borderLeft: borderLeft ? `4px solid ${borderLeft}` : (hovered ? `1px solid rgba(${glowColor},0.5)` : "1px solid #E5E7EB"), background: hovered ? `rgba(${glowColor},0.04)` : "#FFF", marginBottom: "8px", cursor: "pointer", transform: hovered ? "translateX(3px)" : "none", boxShadow: hovered ? `0 4px 16px rgba(${glowColor},0.15)` : "none", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", textDecoration: "none", color: "inherit", ...style };
  if (href) return <a href={href} style={s} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{children}</a>;
  return <div style={s} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{children}</div>;
}

function Section({ title, rightContent, children, glowColor = "59,130,246" }) {
  return (
    <GlowCard glowColor={glowColor} style={{ marginBottom: "0" }}>
      <div style={{ borderBottom: "1px solid #F1F5F9", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{title}</h2>
        {rightContent && <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{rightContent}</div>}
      </div>
      <div style={{ padding: "14px" }}>{children}</div>
    </GlowCard>
  );
}

function QuickLink({ href, icon, label, desc, glowColor }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a href={href} style={{ textDecoration: "none", color: "inherit", position: "relative", borderRadius: "16px", display: "block" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "absolute", inset: "-2px", borderRadius: "18px", background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.8) 20%, transparent 50%, rgba(${glowColor},0.4) 80%, transparent 100%)` : "transparent", animation: hovered ? "spin 2s linear infinite" : "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, background: "#FFF", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", transform: hovered ? "translateY(-3px)" : "none", boxShadow: hovered ? `0 12px 32px rgba(${glowColor},0.2)` : "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `rgba(${glowColor},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>{label}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{desc}</div>
        </div>
      </div>
    </a>
  );
}

function CompanyCard({ c, risk, rCfg, score, cVehicles, cDefects, isLowScore, animDelay }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a href={`/portal?company=${c.id}`} className="dash-row" style={{ textDecoration: "none", color: "inherit", display: "block", position: "relative", borderRadius: "16px", animationDelay: `${animDelay}ms` }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "absolute", inset: "-2px", borderRadius: "18px", background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${rCfg.glow},0.9) 20%, rgba(${rCfg.glow},0.3) 40%, transparent 60%, rgba(${rCfg.glow},0.6) 80%, transparent 100%)` : "transparent", animation: hovered ? "spin 2s linear infinite" : "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, background: "#FFF", borderRadius: "14px", borderLeft: `4px solid ${rCfg.dot}`, padding: "16px", transform: hovered ? "translateY(-3px)" : "none", boxShadow: hovered ? `0 12px 32px rgba(${rCfg.glow},0.2)` : "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ animation: isLowScore ? "pulse-ring 2s ease infinite" : "none", flexShrink: 0 }}><ComplianceDonutInline score={score} size={48} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{c.o_licence || "No licence"}</div>
          </div>
          <RiskPill level={risk} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px", textAlign: "center" }}><div style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>{cVehicles.length}</div><div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Vehicles</div></div>
          <div style={{ flex: 1, background: cDefects.length > 0 ? "#FEF2F2" : "#F8FAFC", borderRadius: "8px", padding: "8px", textAlign: "center" }}><div style={{ fontSize: "16px", fontWeight: 800, color: cDefects.length > 0 ? "#DC2626" : "#10B981" }}>{cDefects.length}</div><div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Defects</div></div>
          <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "8px", padding: "8px", textAlign: "center" }}><div style={{ fontSize: "16px", fontWeight: 800, color: "#2563EB" }}>{score}</div><div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>Score</div></div>
        </div>
      </div>
    </a>
  );
}

function DefectCard({ d, sev, sCfg }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a href="/defects" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderRadius: "12px", border: `1px solid ${hovered ? sCfg.border : "#E5E7EB"}`, borderLeft: `4px solid ${sCfg.dot}`, background: hovered ? sCfg.bg : "#FFF", marginBottom: "8px", transform: hovered ? "translateX(3px)" : "none", boxShadow: hovered ? `0 4px 16px rgba(${sCfg.glow},0.15)` : "none", transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)", textDecoration: "none", color: "inherit", cursor: "pointer" }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: sCfg.bg, border: `1px solid ${sCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{sev === "dangerous" ? "🚨" : sev === "major" ? "⚠️" : "🔧"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
        <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{TYPES[d.vehicle_type] || "🚗"} {d.vehicle_reg} · {d.category}</div>
      </div>
      <SevPill level={sev} />
    </a>
  );
}

export default function ComplyFleetDashboard() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", o_licence: "", contact_email: "", contact_phone: "", address: "" });
  const [addingCompany, setAddingCompany] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ✅ NEW: track if this is a company_admin login
  const isCompanyAdmin = profile?.role === "company_admin" || profile?.role === "company_viewer";

  useEffect(() => {
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) {
            if (data.account_status === "inactive") {
              window.location.href = "/suspended?reason=inactive";
              return;
            }
            setProfile(data);
            loadData(data);
          }
        });
      });
    } else { loadData(null); }
  }, []);

  async function addCompany() {
    if (!newCompany.name.trim()) return;
    setAddingCompany(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data: comp, error } = await supabase.from("companies").insert({
      name: newCompany.name.trim(), o_licence: newCompany.o_licence.trim() || null,
      contact_email: newCompany.contact_email.trim() || null, contact_phone: newCompany.contact_phone.trim() || null,
      address: newCompany.address.trim() || null,
    }).select().single();
    if (error) { setAddingCompany(false); return; }
    await supabase.from("tm_companies").insert({ tm_id: session.user.id, company_id: comp.id });
    setShowAddCompany(false);
    setNewCompany({ name: "", o_licence: "", contact_email: "", contact_phone: "", address: "" });
    setAddingCompany(false);
    loadData(profile);
  }

  async function loadData(userProfile) {
    setLoading(true);
    if (isSupabaseReady()) {
      let companyIds = null;

      if (userProfile?.role === "tm") {
        // TM: load only their linked companies
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (userProfile?.role === "company_admin" || userProfile?.role === "company_viewer") {
        // ✅ COMPANY ADMIN: load only their own company via user_id
        const { data: comp } = await supabase.from("companies").select("id").eq("user_id", userProfile.id).single();
        companyIds = comp ? [comp.id] : [];
      }

      const nullId = ["00000000-0000-0000-0000-000000000000"];
      const ids = companyIds?.length > 0 ? companyIds : nullId;

      let cQ = supabase.from("companies").select("*").is("archived_at", null).order("name");
      let vQ = supabase.from("vehicles").select("*").is("archived_at", null).order("reg");
      let dQ = supabase.from("defects").select("*").in("status", ["open", "in_progress"]).order("reported_date", { ascending: false });
      let chQ = supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }).limit(20);

      if (companyIds) { cQ = cQ.in("id", ids); vQ = vQ.in("company_id", ids); dQ = dQ.in("company_id", ids); chQ = chQ.in("company_id", ids); }

      const [cR, vR, dR, chR] = await Promise.all([cQ, vQ, dQ, chQ]);
      setCompanies(cR.data || []); setVehicles(vR.data || []); setDefects(dR.data || []); setChecks(chR.data || []);
    }
    setLoading(false);
  }

  const filteredVehicles = selectedCompany === "all" ? vehicles : vehicles.filter(v => v.company_id === selectedCompany);
  const filteredDefects = selectedCompany === "all" ? defects : defects.filter(d => d.company_id === selectedCompany);
  const overdue = filteredVehicles.filter(v => DATE_FIELDS.some(f => { const d = getDaysUntil(v[f]); return d !== null && d < 0; })).length;
  const dangerousOpen = filteredDefects.filter(d => d.severity === "dangerous").length;

  function getCompanyRisk(cid) {
    const vehs = vehicles.filter(v => v.company_id === cid);
    let worst = "green"; const p = { high: 3, medium: 2, low: 1, green: 0 };
    vehs.forEach(v => DATE_FIELDS.forEach(f => { const r = getRisk(getDaysUntil(v[f])); if (p[r] > p[worst]) worst = r; }));
    return worst;
  }

  const urgentVehicles = [...filteredVehicles].map(v => {
    const worstDays = Math.min(...DATE_FIELDS.map(f => getDaysUntil(v[f]) ?? 9999));
    const worstField = DATE_FIELDS.find(f => getDaysUntil(v[f]) === worstDays);
    return { ...v, worstDays, worstField, risk: getRisk(worstDays) };
  }).filter(v => v.worstDays <= 30).sort((a, b) => a.worstDays - b.worstDays).slice(0, 8);

  const initials = (name) => (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  // ✅ Company admin sees their company name; TM sees their name
  const headerName = isCompanyAdmin ? (companies[0]?.name || "Company") : (profile?.full_name || "User");
  const headerRole = isCompanyAdmin ? "COMPANY ADMIN" : (profile?.role || "").replace("_", " ").toUpperCase();
  const avatarColor = isCompanyAdmin ? "linear-gradient(135deg, #059669, #10B981)" : "linear-gradient(135deg, #10B981, #059669)";

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes pulse-alert { 0%,100% { opacity:1; } 50% { opacity:0.85; } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.06); opacity:0.85; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dash-row { animation: fadeSlideUp 0.4s ease both; }
      `}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          {/* ✅ Show COMPANY badge for company admins */}
          {isCompanyAdmin && <span style={{ padding: "3px 10px", borderRadius: "6px", background: "rgba(5,150,105,0.2)", color: "#6EE7B7", fontSize: "10px", fontWeight: 700 }}>COMPANY</span>}
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <span style={{ color: "#64748B", fontSize: "12px" }}>{formatDate(TODAY)}</span>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{headerName}</div>
              <div style={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{headerRole}</div>
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "13px", border: "2px solid rgba(255,255,255,0.15)" }}>{initials(headerName)}</div>
          </button>
          {showUserMenu && (
            <div style={{ position: "absolute", right: 0, top: "52px", background: "white", borderRadius: "14px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", padding: "8px", minWidth: "210px", zIndex: 200 }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6", marginBottom: "4px" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#111827" }}>{headerName}</div>
                <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{profile?.email}</div>
              </div>
              {profile?.role === "platform_owner" && (
                <a href="/admin" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#374151", textDecoration: "none", borderRadius: "8px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F1F5F9"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  🛠️ Super Admin
                </a>
              )}
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
                style={{ width: "100%", padding: "10px 14px", border: "none", background: "none", textAlign: "left", fontSize: "13px", fontWeight: 600, color: "#DC2626", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            {/* ✅ Company admin sees their company name as title */}
            {isCompanyAdmin ? (
              <>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>🏢 {companies[0]?.name || "Company Dashboard"}</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  {companies[0]?.operator_licence ? `O-Licence: ${companies[0].operator_licence}` : "Compliance overview for your fleet"}
                </p>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0F172A" }}>📊 TM Dashboard</h1>
                <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Compliance overview across all operators</p>
              </>
            )}
          </div>
          {/* ✅ Company admin doesn't get company filter dropdown */}
          {!isCompanyAdmin && (
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "13px", fontWeight: 600, background: "#FFF", fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}>
              <option value="all">All Companies ({companies.length})</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#94A3B8" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🚛</div>
            <p style={{ fontWeight: 600 }}>Loading dashboard...</p>
          </div>
        ) : (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            {/* ✅ Company admin doesn't see "Companies" stat card */}
            {!isCompanyAdmin && <StatCard icon="🏢" value={companies.length} label="Companies" accent="#2563EB" href="/company" />}
            <StatCard icon="🚛" value={filteredVehicles.length} label="Active Vehicles" accent="#0F172A" sub={overdue > 0 ? `${overdue} overdue` : "All compliant"} subDanger={overdue > 0} href="/vehicles?filter=active" />
            <StatCard icon="⚠️" value={filteredDefects.length} label="Open Defects" accent="#DC2626" sub={dangerousOpen > 0 ? `${dangerousOpen} dangerous` : "None dangerous"} subDanger={dangerousOpen > 0} href="/defects?status=open" />
            <StatCard icon="📋" value={checks.length} label="Recent Checks" accent="#059669" href="/checks?range=30d" />
          </div>

          {(overdue > 0 || dangerousOpen > 0) && (
            <div style={{ padding: "16px 22px", borderRadius: "16px", background: "linear-gradient(135deg, #FEF2F2, #FFF5F5)", border: "2px solid #FECACA", marginBottom: "24px", display: "flex", alignItems: "center", gap: "14px", animation: "pulse-alert 3s ease infinite" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>🚨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>Immediate attention required</div>
                <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "3px" }}>
                  {overdue > 0 && `${overdue} vehicle${overdue > 1 ? "s" : ""} with overdue compliance dates. `}
                  {dangerousOpen > 0 && `${dangerousOpen} dangerous defect${dangerousOpen > 1 ? "s" : ""} open.`}
                </div>
              </div>
              <a href="/defects?status=open" style={{ padding: "8px 16px", borderRadius: "10px", background: "#DC2626", color: "white", fontSize: "12px", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>View →</a>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* ✅ Only TMs see the Operator Companies section with Add Company button */}
              {selectedCompany === "all" && !isCompanyAdmin && (
                <Section title="🏢 Operator Companies" glowColor="37,99,235" rightContent={<button onClick={() => setShowAddCompany(true)} style={{ padding: "7px 16px", borderRadius: "10px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontWeight: 700, fontSize: "12px", border: "none", cursor: "pointer" }}>+ Add Company</button>}>
                  {companies.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 32px" }}>
                      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏢</div>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#111827", marginBottom: "6px" }}>No companies yet</div>
                      <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "20px" }}>Add your first operator company to get started</div>
                      <button onClick={() => setShowAddCompany(true)} style={{ display: "inline-block", padding: "10px 24px", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontWeight: 700, fontSize: "13px", border: "none", cursor: "pointer" }}>+ Add Company</button>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                      {companies.map((c, i) => {
                        const risk = getCompanyRisk(c.id);
                        const cVehicles = vehicles.filter(v => v.company_id === c.id);
                        const cDefects = defects.filter(d => d.company_id === c.id);
                        const score = calcComplianceScore(cVehicles, cDefects);
                        const rCfg = RISK[risk];
                        return <CompanyCard key={c.id} c={c} risk={risk} rCfg={rCfg} score={score} cVehicles={cVehicles} cDefects={cDefects} isLowScore={score < 50} animDelay={i * 60} />;
                      })}
                    </div>
                  )}
                </Section>
              )}

              <Section title="⏰ Upcoming Compliance" glowColor="217,119,6">
                {urgentVehicles.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "#10B981", fontWeight: 700, fontSize: "13px" }}>✅ All vehicles compliant</div>
                  : urgentVehicles.map((v, i) => {
                    const rCfg = RISK[v.risk];
                    return (
                      <div key={v.id} className="dash-row" style={{ animationDelay: `${i * 50}ms` }}>
                        <HoverRow href="/vehicles" glowColor={rCfg.glow} borderLeft={rCfg.dot}>
                          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: rCfg.bg, border: `1px solid ${rCfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{TYPES[v.type] || "🚗"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: "14px", fontFamily: "monospace", color: "#111827" }}>{v.reg}</div>
                            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{v.make} {v.model}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: rCfg.text }}>{FIELD_LABELS[v.worstField]} {v.worstDays < 0 ? `${Math.abs(v.worstDays)}d overdue` : v.worstDays === 0 ? "Today" : `in ${v.worstDays}d`}</div>
                            <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatDate(v[v.worstField])}</div>
                          </div>
                          <RiskPill level={v.risk} />
                        </HoverRow>
                      </div>
                    );
                  })
                }
              </Section>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Section title="🔴 Open Defects" glowColor="220,38,38"
                rightContent={<>
                  <ExportDropdown onCSV={() => exportDefectsCSV(filteredDefects)} onPDF={() => printReport("Open Defects", `${filteredDefects.length} defects`, ["Vehicle", "Description", "Category", "Severity", "Status", "Reported"], filteredDefects.map(d => [d.vehicle_reg, d.description, d.category, (d.severity || "").toUpperCase(), d.status, formatDate(d.reported_date)]), row => row[3] === "DANGEROUS" ? "danger" : row[3] === "MAJOR" ? "warn" : "")} />
                  <a href="/defects?status=open" style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>View All →</a>
                </>}>
                {filteredDefects.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "#10B981", fontWeight: 700, fontSize: "13px" }}>✅ No open defects</div>
                  : filteredDefects.slice(0, 8).map((d, i) => {
                    const sev = d.severity || "minor"; const sCfg = SEVERITY[sev] || SEVERITY.minor;
                    return <div key={d.id} className="dash-row" style={{ animationDelay: `${i * 50}ms` }}><DefectCard d={d} sev={sev} sCfg={sCfg} /></div>;
                  })
                }
              </Section>

              <Section title="📋 Recent Walkaround Checks" glowColor="5,150,105"
                rightContent={<>
                  <ExportDropdown onCSV={() => exportChecksCSV(checks)} onPDF={() => printReport("Walkaround Checks", `${checks.length} checks`, ["Ref", "Vehicle", "Driver", "Result", "Defects", "Date"], checks.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result === "pass" ? "✅ PASS" : "⚠️ FAIL", ch.defects_reported || 0, formatDate(ch.completed_at)]), row => row[3].includes("FAIL") ? "danger" : "")} />
                  <a href="/checks?range=30d" style={{ fontSize: "12px", fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>View All →</a>
                </>}>
                {checks.length === 0
                  ? <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8", fontSize: "13px" }}>No checks yet</div>
                  : checks.slice(0, 8).map((ch, i) => {
                    const pass = ch.result === "pass";
                    return (
                      <div key={ch.id} className="dash-row" style={{ animationDelay: `${i * 40}ms` }}>
                        <HoverRow href="/checks" glowColor={pass ? "5,150,105" : "220,38,38"}>
                          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: pass ? "#ECFDF5" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{pass ? "✅" : "⚠️"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{ch.vehicle_reg} — {ch.driver_name}</div>
                            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{ch.reference_id} · {ch.defects_reported > 0 ? `${ch.defects_reported} defects` : "No defects"}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <span style={{ padding: "3px 10px", borderRadius: "20px", background: pass ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${pass ? "#A7F3D0" : "#FECACA"}`, fontSize: "10px", fontWeight: 700, color: pass ? "#059669" : "#DC2626" }}>{pass ? "SAFE" : "DEFECTS"}</span>
                            <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px" }}>{formatDate(ch.completed_at)}</div>
                          </div>
                        </HoverRow>
                      </div>
                    );
                  })
                }
              </Section>
            </div>
          </div>

          {/* ✅ Quick links — TM gets all, company admin gets filtered set */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginTop: "28px" }}>
            {isCompanyAdmin ? (
              // Company admin quick links — no admin/TM tools
              <>
                <QuickLink href="/vehicles"            icon="🚛" label="Vehicle Compliance"  desc="MOT, PMI, insurance dates"          glowColor="15,23,42"   />
                <QuickLink href="/defects?status=open" icon="⚠️" label="Defect Management"   desc="Track and resolve defects"          glowColor="220,38,38"  />
                <QuickLink href="/checks"              icon="📋" label="Walkaround Checks"   desc="View all checks for your fleet"     glowColor="5,150,105"  />
                <QuickLink href="/qr-codes"            icon="📱" label="QR Codes"            desc="Generate vehicle QR codes"          glowColor="124,58,237" />
              </>
            ) : (
              // TM gets all quick links
              <>
                <QuickLink href="/company"            icon="🏢" label="Companies & Fleet"   desc="Add/edit companies and vehicles"    glowColor="37,99,235"  />
                <QuickLink href="/defects?status=open" icon="⚠️" label="Defect Management"   desc="Track and resolve defects"          glowColor="220,38,38"  />
                <QuickLink href="/vehicles"            icon="🚛" label="Vehicle Compliance"  desc="MOT, PMI, insurance dates"          glowColor="15,23,42"   />
                <QuickLink href="/checks"              icon="📋" label="Walkaround Checks"   desc="View all checks across companies"   glowColor="5,150,105"  />
                <QuickLink href="/qr-codes"            icon="📱" label="QR Codes"            desc="Generate vehicle QR codes"          glowColor="124,58,237" />
                <QuickLink href="/tacho"               icon="🗂️" label="Tacho Compliance"   desc="Driver & vehicle download tracking" glowColor="124,58,237" />
                <QuickLink href="/dashboard/driver-hours" icon="⏱️" label="Driver Hours"    desc="Hours violations & DVSA limits"    glowColor="220,38,38" />
                <QuickLink href="/dashboard/tacho-upload" icon="📁" label="Tacho Upload"    desc="Upload .ddd files from card reader" glowColor="124,58,237" />
              </>
            )}
          </div>
        </>)}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>
        ComplyFleet v1.0 · DVSA Compliance Platform · © 2026
      </footer>

      {showAddCompany && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setShowAddCompany(false)}>
          <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>🏢 Add New Company</div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Add an operator company to your account</div>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { key: "name", label: "Company Name *", placeholder: "Hargreaves Haulage Ltd" },
                { key: "o_licence", label: "Operator Licence", placeholder: "OB1234567" },
                { key: "contact_email", label: "Contact Email", placeholder: "ops@company.co.uk" },
                { key: "contact_phone", label: "Contact Phone", placeholder: "0161 234 5678" },
                { key: "address", label: "Address", placeholder: "Manchester, M1 2AB" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>{f.label}</label>
                  <input value={newCompany[f.key]} onChange={e => setNewCompany({...newCompany, [f.key]: e.target.value})} placeholder={f.placeholder} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
                </div>
              ))}
            </div>
            <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowAddCompany(false)} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => addCompany()} disabled={addingCompany || !newCompany.name.trim()} style={{ padding: "10px 24px", border: "none", borderRadius: "10px", background: newCompany.name.trim() ? "linear-gradient(135deg, #2563EB, #3B82F6)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {addingCompany ? "Adding..." : "Add Company"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
