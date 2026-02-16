"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { exportChecksCSV, printReport } from "../../lib/utils";
import ExportDropdown from "../../components/ExportDropdown";

function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }

function printSingleCheck(ch, items) {
  const win = window.open("", "_blank");
  const passCount = items.filter(i => i.status === "pass").length;
  const failCount = items.filter(i => i.status === "fail").length;
  win.document.write(`<!DOCTYPE html><html><head><title>Walkaround - ${ch.vehicle_reg}</title><style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
    body { font-family: 'DM Sans', sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #0F172A; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0F172A; padding-bottom: 14px; margin-bottom: 20px; }
    .logo { font-size: 18px; font-weight: 800; } .logo span { color: #2563EB; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .info-item { padding: 8px 12px; background: #F8FAFC; border-radius: 6px; }
    .info-label { font-size: 9px; color: #6B7280; text-transform: uppercase; font-weight: 700; }
    .info-value { font-size: 13px; font-weight: 700; margin-top: 2px; }
    .result { text-align: center; margin: 16px 0; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 16px; }
    .pass { background: #D1FAE5; color: #065F46; } .fail { background: #FEE2E2; color: #991B1B; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #0F172A; color: white; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 700; }
    td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
    tr.fail-row td { background: #FEF2F2; }
    .sig { margin-top: 24px; display: flex; justify-content: space-between; }
    .sig-box { width: 45%; border-top: 2px solid #0F172A; padding-top: 6px; font-size: 10px; color: #6B7280; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #94A3B8; border-top: 1px solid #E5E7EB; padding-top: 10px; }
    @media print { body { padding: 15px; } @page { margin: 1cm; } }
  </style></head><body>
  <div class="header"><div><div class="logo">\u{1F69B} Comply<span>Fleet</span></div><div style="font-size:12px;color:#6B7280">DVSA Walkaround Check Record</div></div>
  <div style="text-align:right"><div style="font-size:22px;font-weight:800;font-family:monospace">${ch.vehicle_reg}</div><div style="font-size:12px;color:#6B7280">${ch.vehicle_type || ""}</div></div></div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Driver</div><div class="info-value">${ch.driver_name || ""}</div></div>
    <div class="info-item"><div class="info-label">Date</div><div class="info-value">${formatDate(ch.completed_at)} ${formatTime(ch.completed_at)}</div></div>
    <div class="info-item"><div class="info-label">Reference</div><div class="info-value">${ch.reference_id || ""}</div></div>
    <div class="info-item"><div class="info-label">Odometer</div><div class="info-value">${ch.odometer || "N/A"}</div></div>
    <div class="info-item"><div class="info-label">Items Checked</div><div class="info-value">${ch.total_items || 0} total</div></div>
    <div class="info-item"><div class="info-label">Summary</div><div class="info-value">${passCount} pass / ${failCount} fail</div></div>
  </div>
  <div class="result ${ch.result === "pass" ? "pass" : "fail"}">${ch.result === "pass" ? "\u2705 VEHICLE SAFE TO DRIVE" : "\u26A0\uFE0F DEFECTS REPORTED"}</div>
  <table><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Defect Notes</th><th>Severity</th></tr></thead><tbody>
  ${items.map(i => `<tr class="${i.status === "fail" ? "fail-row" : ""}"><td>${i.category}</td><td>${i.item_label}</td><td style="font-weight:700;color:${i.status === "pass" ? "#059669" : "#DC2626"}">${i.status === "pass" ? "\u2713 PASS" : "\u2717 FAIL"}</td><td>${i.defect_description || ""}</td><td style="font-weight:700;color:${i.defect_severity === "dangerous" ? "#DC2626" : i.defect_severity === "major" ? "#F97316" : "#F59E0B"}">${i.defect_severity ? i.defect_severity.toUpperCase() : ""}</td></tr>`).join("")}
  </tbody></table>
  <div class="sig"><div class="sig-box">Driver: ${ch.driver_name || ""}</div><div class="sig-box">Date: ${formatDate(ch.completed_at)}</div></div>
  <div class="footer">ComplyFleet \u00B7 DVSA Compliance Platform \u00B7 complyfleet.vercel.app \u00B7 Record permanently stored</div>
  </body></html>`);
  win.document.close(); setTimeout(() => win.print(), 500);
}

export default function ChecksPage() {
  const [checks, setChecks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterRange, setFilterRange] = useState("30d");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("range")) setFilterRange(params.get("range"));
    if (params.get("company")) setFilterCompany(params.get("company"));
    if (params.get("result")) setFilterResult(params.get("result"));
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    if (isSupabaseReady()) {
      const [chRes, coRes] = await Promise.all([
        supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }).limit(200),
        supabase.from("companies").select("id, name").is("archived_at", null).order("name"),
      ]);
      setChecks(chRes.data || []);
      setCompanies(coRes.data || []);
    }
    setLoading(false);
  }

  async function downloadCheckPDF(ch) {
    let items = [];
    if (isSupabaseReady()) {
      const { data } = await supabase.from("check_items").select("*").eq("check_id", ch.id).order("id");
      items = data || [];
    }
    printSingleCheck(ch, items);
  }

  const rangeDays = { "7d": 7, "30d": 30, "90d": 90, "all": 99999 }[filterRange] || 30;
  const cutoff = new Date(Date.now() - rangeDays * 86400000);

  const filtered = checks.filter(ch => {
    if (filterCompany !== "all" && ch.company_id !== filterCompany) return false;
    if (filterResult === "pass" && ch.result !== "pass") return false;
    if (filterResult === "fail" && ch.result === "pass") return false;
    if (filterRange !== "all" && ch.completed_at && new Date(ch.completed_at) < cutoff) return false;
    return true;
  });

  const passCount = filtered.filter(c => c.result === "pass").length;
  const failCount = filtered.filter(c => c.result !== "pass").length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>{"\u2190"} Dashboard</a>
      </header>
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4CB}"} Walkaround Checks</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>All driver checks across all companies</p></div>
          <ExportDropdown onCSV={() => exportChecksCSV(filtered, `checks-${filterRange}.csv`)} onPDF={() => printReport("Walkaround Checks", `${filtered.length} checks`, ["Ref", "Vehicle", "Driver", "Result", "Items", "Defects", "Date"], filtered.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result === "pass" ? "\u2705 PASS" : "\u26A0\uFE0F FAIL", `${ch.passed_items||0}/${ch.total_items||0}`, ch.defects_reported||0, formatDate(ch.completed_at)]), (row) => row[3].includes("FAIL") ? "danger" : "")} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[{ i: "\u{1F4CB}", v: filtered.length, l: "Total Checks", a: "#0F172A" }, { i: "\u2705", v: passCount, l: "Passed", a: "#059669" }, { i: "\u26A0\uFE0F", v: failCount, l: "With Defects", a: "#DC2626" }].map(s => (
            <div key={s.l} style={{ background: "#FFF", borderRadius: "14px", padding: "16px 20px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: s.a + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.i}</div>
              <div><div style={{ fontSize: "24px", fontWeight: 800, color: s.a, lineHeight: 1 }}>{s.v}</div><div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{s.l}</div></div>
            </div>))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
            <option value="all">All Companies</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {["7d", "30d", "90d", "all"].map(r => (
            <button key={r} onClick={() => setFilterRange(r)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterRange === r ? "#0F172A" : "#FFF", color: filterRange === r ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {r === "all" ? "All Time" : `Last ${r}`}</button>))}
          <span style={{ borderLeft: "1px solid #E5E7EB", margin: "0 4px" }} />
          {["all", "pass", "fail"].map(r => (
            <button key={r} onClick={() => setFilterResult(r)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterResult === r ? "#0F172A" : "#FFF", color: filterResult === r ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {r === "all" ? "All Results" : r === "pass" ? "\u2705 Passed" : "\u26A0\uFE0F Defects"}</button>))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading...</div> :
        filtered.length === 0 ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8", background: "#FFF", borderRadius: "16px" }}>No checks match your filters</div> :
        <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead><tr style={{ background: "#F8FAFC" }}>
                {["Reference", "Vehicle", "Driver", "Result", "Items", "Defects", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", borderBottom: "2px solid #E5E7EB" }}>{h}</th>))}
              </tr></thead>
              <tbody>
                {filtered.map(ch => (
                  <tr key={ch.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "14px", fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#374151" }}>{ch.reference_id}</td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "monospace", color: "#0F172A" }}>{ch.vehicle_reg}</div>
                      <div style={{ fontSize: "11px", color: "#6B7280" }}>{ch.vehicle_type}</div>
                    </td>
                    <td style={{ padding: "14px", fontSize: "13px", color: "#374151" }}>{ch.driver_name}</td>
                    <td style={{ padding: "14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${ch.result === "pass" ? "#A7F3D0" : "#FECACA"}`, fontSize: "10px", fontWeight: 700, color: ch.result === "pass" ? "#059669" : "#DC2626" }}>
                        {ch.result === "pass" ? "\u2705 PASS" : "\u26A0\uFE0F FAIL"}</span>
                    </td>
                    <td style={{ padding: "14px", fontSize: "12px", color: "#6B7280" }}>{ch.passed_items || 0}/{ch.total_items || 0}</td>
                    <td style={{ padding: "14px" }}>
                      {ch.defects_reported > 0 ? <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626" }}>{ch.defects_reported}</span> : <span style={{ color: "#94A3B8", fontSize: "12px" }}>0</span>}
                    </td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{formatDate(ch.completed_at)}</div>
                      <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatTime(ch.completed_at)}</div>
                    </td>
                    <td style={{ padding: "14px" }}>
                      <button onClick={() => downloadCheckPDF(ch)} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
                        {"\u{1F4C4}"} Full PDF
                      </button>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>}
      </main>
      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>
    </div>
  );
}
