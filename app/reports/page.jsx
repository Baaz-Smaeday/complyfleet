"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

// Dynamic import — generate-pdf uses browser APIs
let pdfLib = null;
async function getPdfLib() {
  if (pdfLib) return pdfLib;
  pdfLib = await import("../../lib/generate-pdf");
  return pdfLib;
}

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [checks, setChecks] = useState([]);
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null); // which PDF is generating
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        setUser(session.user);
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          setProfile(data);
          loadData(data);
        });
      });
    } else {
      loadMockData();
    }
  }, []);

  async function loadData(prof) {
    setLoading(true);
    try {
      let companyIds = null;
      if (prof?.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", prof.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (prof?.role === "company_admin" && prof.company_id) {
        companyIds = [prof.company_id];
      }

      // Companies
      let cQuery = supabase.from("companies").select("*").is("archived_at", null).order("name");
      if (companyIds) cQuery = cQuery.in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: cos } = await cQuery;
      setCompanies(cos || []);

      // Vehicles
      let vQuery = supabase.from("vehicles").select("*").is("archived_at", null).order("reg");
      if (companyIds) vQuery = vQuery.in("company_id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: vehs } = await vQuery;
      setVehicles(vehs || []);

      // Checks
      let chQuery = supabase.from("checks").select("*").order("created_at", { ascending: false }).limit(500);
      if (companyIds) chQuery = chQuery.in("company_id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: chs } = await chQuery;
      setChecks(chs || []);

      // Defects
      let dQuery = supabase.from("defects").select("*, vehicles(registration, company_id, make, model, vehicle_type)").order("created_at", { ascending: false }).limit(500);
      const { data: defs } = await dQuery;
      // Filter defects to only matching vehicles if TM
      const vehIds = new Set((vehs || []).map(v => v.id));
      const filteredDefs = companyIds ? (defs || []).filter(d => vehIds.has(d.vehicle_id)) : (defs || []);
      setDefects(filteredDefs);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  }

  function loadMockData() {
    setCompanies([
      { id: "c1", name: "Hargreaves Haulage Ltd", operator_licence: "OB1234567" },
      { id: "c2", name: "Northern Express" },
    ]);
    setVehicles([
      { id: "v1", registration: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", company_id: "c1", mot_expiry: "2026-05-15", tax_expiry: "2026-08-20" },
      { id: "v2", registration: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", company_id: "c1", mot_expiry: "2026-03-01", tax_expiry: "2026-06-10" },
      { id: "v3", registration: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", company_id: "c1", mot_expiry: "2026-12-01", tax_expiry: "2026-12-01" },
      { id: "v5", registration: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", company_id: "c2", mot_expiry: "2026-02-25", tax_expiry: "2026-04-30" },
    ]);
    setChecks([
      { id: "ch1", vehicle_id: "v1", vehicle_registration: "BD63 XYZ", company_id: "c1", driver_name: "Dave Smith", result: "pass", defects_found: 0, created_at: new Date().toISOString(), odometer: 234567, items: [
        { name: "Tyres", status: "ok" }, { name: "Lights", status: "ok" }, { name: "Brakes", status: "ok" }, { name: "Mirrors", status: "ok" },
        { name: "Windscreen", status: "ok" }, { name: "Horn", status: "ok" }, { name: "Fuel/Oil Leaks", status: "ok" }, { name: "Exhaust", status: "ok" },
        { name: "Bodywork", status: "ok" }, { name: "Load Security", status: "ok" }, { name: "Number Plates", status: "ok" }, { name: "Reflectors", status: "ok" },
      ]},
      { id: "ch2", vehicle_id: "v2", vehicle_registration: "KL19 ABC", company_id: "c1", driver_name: "Mike Jones", result: "fail", defects_found: 2, created_at: new Date(Date.now() - 86400000).toISOString(), odometer: 189234 },
      { id: "ch3", vehicle_id: "v5", vehicle_registration: "AB12 CDE", company_id: "c2", driver_name: "Tom Brown", result: "pass", defects_found: 0, created_at: new Date(Date.now() - 172800000).toISOString(), odometer: 345678 },
    ]);
    setDefects([
      { id: "d1", vehicle_id: "v2", severity: "dangerous", status: "open", description: "Nearside front tyre below legal limit — 0.8mm tread remaining", item: "Tyres", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "d2", vehicle_id: "v2", severity: "minor", status: "open", description: "Offside mirror housing cracked", item: "Mirrors", created_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "d3", vehicle_id: "v1", severity: "major", status: "resolved", description: "Brake warning light intermittent", item: "Brakes", created_at: new Date(Date.now() - 604800000).toISOString(), resolved_at: new Date(Date.now() - 259200000).toISOString(), resolution_notes: "Brake sensor replaced and tested" },
    ]);
    setLoading(false);
  }

  // Filter data by selected company and date range
  function getFilteredData() {
    let fVehicles = vehicles;
    let fChecks = checks;
    let fDefects = defects;

    if (selectedCompany !== "all") {
      fVehicles = vehicles.filter(v => v.company_id === selectedCompany);
      fChecks = checks.filter(c => c.company_id === selectedCompany);
      const vIds = new Set(fVehicles.map(v => v.id));
      fDefects = defects.filter(d => vIds.has(d.vehicle_id));
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      fChecks = fChecks.filter(c => new Date(c.created_at) >= from);
      fDefects = fDefects.filter(d => new Date(d.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      fChecks = fChecks.filter(c => new Date(c.created_at) <= to);
      fDefects = fDefects.filter(d => new Date(d.created_at) <= to);
    }

    return { fVehicles, fChecks, fDefects };
  }

  // PDF generation handlers
  async function handleFleetSummary() {
    setGenerating("fleet");
    try {
      const pdf = await getPdfLib();
      const { fVehicles, fChecks, fDefects } = getFilteredData();
      const comp = selectedCompany !== "all" ? companies.find(c => c.id === selectedCompany) : null;
      await pdf.generateFleetSummaryPDF({
        vehicles: fVehicles, checks: fChecks, defects: fDefects, company: comp,
        dateRange: dateFrom || dateTo ? { from: dateFrom || "Start", to: dateTo || "Today" } : null,
      });
    } catch (err) { alert("Error generating PDF: " + err.message); }
    finally { setGenerating(null); }
  }

  async function handleCheckLog() {
    setGenerating("checks");
    try {
      const pdf = await getPdfLib();
      const { fVehicles, fChecks } = getFilteredData();
      const comp = selectedCompany !== "all" ? companies.find(c => c.id === selectedCompany) : null;
      await pdf.generateBatchChecksPDF(fChecks, fVehicles, comp);
    } catch (err) { alert("Error generating PDF: " + err.message); }
    finally { setGenerating(null); }
  }

  async function handleSingleCheck(check) {
    setGenerating("check-" + check.id);
    try {
      const pdf = await getPdfLib();
      const vehicle = vehicles.find(v => v.id === check.vehicle_id);
      const checkDefects = defects.filter(d => d.vehicle_id === check.vehicle_id && new Date(d.created_at).toDateString() === new Date(check.created_at).toDateString());
      const comp = vehicle ? companies.find(c => c.id === vehicle.company_id) : null;
      await pdf.generateCheckPDF(check, vehicle, checkDefects, comp);
    } catch (err) { alert("Error generating PDF: " + err.message); }
    finally { setGenerating(null); }
  }

  async function handleSingleDefect(defect) {
    setGenerating("defect-" + defect.id);
    try {
      const pdf = await getPdfLib();
      const vehicle = vehicles.find(v => v.id === defect.vehicle_id) || defect.vehicles;
      const comp = vehicle ? companies.find(c => c.id === (vehicle.company_id || vehicle.company_id)) : null;
      await pdf.generateDefectPDF(defect, vehicle, comp);
    } catch (err) { alert("Error generating PDF: " + err.message); }
    finally { setGenerating(null); }
  }

  const { fVehicles, fChecks, fDefects } = getFilteredData();
  const openDefects = fDefects.filter(d => d.status === "open");
  const dangerousCount = openDefects.filter(d => d.severity === "dangerous").length;

  const btnStyle = (isActive, color = "#0F172A") => ({
    padding: "12px 24px", borderRadius: "12px", border: "none",
    background: isActive ? "#E2E8F0" : `linear-gradient(135deg, ${color}, ${color}dd)`,
    color: isActive ? "#64748B" : "white", fontSize: "13px", fontWeight: 700,
    cursor: isActive ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "8px",
    opacity: isActive ? 0.7 : 1, transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "13px", textDecoration: "none", fontWeight: 600 }}>{"\u2190"} Dashboard</a>
          {!isSupabaseReady() && <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(251,191,36,0.2)", color: "#FCD34D", fontSize: "10px", fontWeight: 700 }}>DEMO MODE</span>}
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Page title */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4C4}"} Reports & PDF Downloads</h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Generate DVSA-compliant PDFs for walkaround checks, defects, and fleet summaries.</p>
        </div>

        {/* Filters */}
        <div style={{ background: "white", borderRadius: "16px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company</label>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "13px", fontWeight: 600, background: "#FFF", fontFamily: "inherit", minWidth: "200px" }}>
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "13px", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748B", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "13px", fontFamily: "inherit" }} />
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8", alignSelf: "center", padding: "8px 0" }}>
            {fVehicles.length} vehicles {"\u00B7"} {fChecks.length} checks {"\u00B7"} {fDefects.length} defects
          </div>
        </div>

        {/* Summary Report Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "28px" }}>

          {/* Fleet Summary PDF */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderTop: "4px solid #1E40AF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4CA}"} Fleet Compliance Summary</h3>
                <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Vehicles, MOT/Tax status, open defects overview</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#EFF6FF", color: "#1E40AF", fontSize: "11px", fontWeight: 700 }}>{fVehicles.length} vehicles</span>
              {openDefects.length > 0 && <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#FEF3C7", color: "#92400E", fontSize: "11px", fontWeight: 700 }}>{openDefects.length} open defects</span>}
              {dangerousCount > 0 && <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 700 }}>{dangerousCount} dangerous</span>}
            </div>
            <button onClick={handleFleetSummary} disabled={!!generating} style={btnStyle(generating === "fleet", "#1E40AF")}>
              {generating === "fleet" ? "Generating..." : "\u{2B07}\uFE0F Download Fleet Summary PDF"}
            </button>
          </div>

          {/* Check Log PDF */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderTop: "4px solid #10B981" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4CB}"} Walkaround Check Log</h3>
              <p style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>All checks in a table format — landscape PDF</p>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <span style={{ padding: "4px 10px", borderRadius: "8px", background: "#ECFDF5", color: "#065F46", fontSize: "11px", fontWeight: 700 }}>{fChecks.length} checks</span>
            </div>
            <button onClick={handleCheckLog} disabled={!!generating || fChecks.length === 0} style={btnStyle(generating === "checks", "#10B981")}>
              {generating === "checks" ? "Generating..." : "\u{2B07}\uFE0F Download Check Log PDF"}
            </button>
          </div>
        </div>

        {/* Recent Checks — individual download */}
        <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{"\u2705"} Recent Checks — Download Individual PDFs</h3>
          </div>
          {fChecks.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>No checks found for the selected filters.</div>
          )}
          {fChecks.slice(0, 20).map(c => {
            const veh = vehicles.find(v => v.id === c.vehicle_id);
            const isPass = c.result === "pass";
            return (
              <div key={c.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.15s", cursor: "default" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isPass ? "#10B981" : "#DC2626", flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>{veh?.registration || veh?.reg || c.vehicle_registration || "—"}</span>
                    <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "8px" }}>{c.driver_name || "Unknown driver"}</span>
                    <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "8px" }}>{c.created_at ? new Date(c.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                </div>
                <button onClick={() => handleSingleCheck(c)} disabled={!!generating}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "white", fontSize: "11px", fontWeight: 700, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  {generating === "check-" + c.id ? "..." : "\u{1F4E5} PDF"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Open Defects — individual download */}
        <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>{"\u26A0\uFE0F"} Defects — Download Individual PDFs</h3>
          </div>
          {fDefects.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>No defects found.</div>
          )}
          {fDefects.slice(0, 30).map(d => {
            const veh = vehicles.find(v => v.id === d.vehicle_id);
            const sevColors = { dangerous: { bg: "#FEF2F2", text: "#991B1B", badge: "#DC2626" }, major: { bg: "#FFFBEB", text: "#92400E", badge: "#F59E0B" }, minor: { bg: "#EFF6FF", text: "#1E40AF", badge: "#3B82F6" } };
            const sev = sevColors[d.severity] || sevColors.minor;
            return (
              <div key={d.id} style={{ padding: "12px 20px", borderBottom: "1px solid #F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <span style={{ padding: "2px 8px", borderRadius: "6px", background: sev.badge, color: "white", fontSize: "9px", fontWeight: 800, textTransform: "uppercase", flexShrink: 0 }}>{d.severity}</span>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#0F172A" }}>{d.description || d.item}</span>
                    <span style={{ fontSize: "12px", color: "#64748B", marginLeft: "8px" }}>{veh?.registration || veh?.reg || ""}</span>
                    <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "8px" }}>{d.status === "open" ? "Open" : d.status === "resolved" ? "Resolved" : d.status?.replace("_", " ")}</span>
                  </div>
                </div>
                <button onClick={() => handleSingleDefect(d)} disabled={!!generating}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "white", fontSize: "11px", fontWeight: 700, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  {generating === "defect-" + d.id ? "..." : "\u{1F4E5} PDF"}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>
    </div>
  );
}
