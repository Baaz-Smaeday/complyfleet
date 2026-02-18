"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { exportChecksCSV, printReport } from "../../lib/utils";
import ExportDropdown from "../../components/ExportDropdown";

function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }

// ✅ FIXED: Real PDF download using jsPDF — no new tab, no print dialog
async function downloadCheckPDFReal(ch, items) {
  // Dynamically load jsPDF
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  let y = 20;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ComplyFleet", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("DVSA Walkaround Check Record", margin, 19);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(ch.vehicle_reg || "", pageW - margin, 12, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(ch.vehicle_type || "", pageW - margin, 19, { align: "right" });

  y = 38;

  // Info grid
  const infoItems = [
    ["Driver", ch.driver_name || ""],
    ["Date", `${formatDate(ch.completed_at)} ${formatTime(ch.completed_at)}`],
    ["Reference", ch.reference_id || ""],
    ["Odometer", ch.odometer || "N/A"],
    ["Items Checked", `${ch.total_items || 0} total`],
    ["Summary", `${items.filter(i => i.status === "pass").length} pass / ${items.filter(i => i.status === "fail").length} fail`],
  ];

  const cellW = (pageW - margin * 2) / 3;
  infoItems.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = margin + col * cellW;
    const cy = y + row * 18;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cy, cellW - 3, 15, 2, 2, "F");
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(item[0].toUpperCase(), x + 4, cy + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(item[1], x + 4, cy + 11);
  });

  y += 42;

  // Result banner
  const isPass = ch.result === "pass";
  doc.setFillColor(isPass ? 209 : 254, isPass ? 250 : 226, isPass ? 229 : 226);
  doc.roundedRect(margin, y, pageW - margin * 2, 12, 3, 3, "F");
  doc.setTextColor(isPass ? 6 : 153, isPass ? 95 : 27, isPass ? 70 : 27);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(isPass ? "✓ VEHICLE SAFE TO DRIVE" : "⚠ DEFECTS REPORTED", pageW / 2, y + 8, { align: "center" });

  y += 20;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  const cols = [
    { label: "CATEGORY", x: margin + 2, w: 30 },
    { label: "ITEM", x: margin + 32, w: 65 },
    { label: "RESULT", x: margin + 97, w: 20 },
    { label: "DEFECT NOTES", x: margin + 117, w: 45 },
    { label: "SEVERITY", x: margin + 162, w: 25 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y + 5.5));
  y += 8;

  // Table rows
  items.forEach((item, i) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const isFail = item.status === "fail";
    doc.setFillColor(isFail ? 254 : (i % 2 === 0 ? 255 : 249), isFail ? 242 : (i % 2 === 0 ? 255 : 250), isFail ? 242 : (i % 2 === 0 ? 255 : 252));
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text((item.category || "").substring(0, 18), cols[0].x, y + 5);
    doc.text((item.item_label || "").substring(0, 38), cols[1].x, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isFail ? 220 : 5, isFail ? 38 : 150, isFail ? 38 : 105);
    doc.text(isFail ? "✗ FAIL" : "✓ PASS", cols[2].x, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text((item.defect_description || "").substring(0, 28), cols[3].x, y + 5);
    if (item.defect_severity) {
      const sev = item.defect_severity.toUpperCase();
      const sevColor = sev === "DANGEROUS" ? [220, 38, 38] : sev === "MAJOR" ? [249, 115, 22] : [245, 158, 11];
      doc.setTextColor(...sevColor);
      doc.setFont("helvetica", "bold");
      doc.text(sev, cols[4].x, y + 5);
    }
    y += 7;
  });

  // Signature line
  y += 10;
  if (y < 260) {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin, y);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Driver: ${ch.driver_name || ""}`, margin, y + 5);
    doc.text(`Date: ${formatDate(ch.completed_at)}`, pageW - margin - 70, y + 5);
  }

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 287, pageW, 10, "F");
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("ComplyFleet · DVSA Compliance Platform · complyfleet.vercel.app · Record permanently stored", pageW / 2, 293, { align: "center" });

  // ✅ This triggers an actual file download — not a new tab
  const filename = `WC-${ch.reference_id || ch.id.slice(0, 8)}-${formatDate(ch.completed_at).replace(/ /g, "")}.pdf`;
  doc.save(filename);
}

export default function ChecksPage() {
  const [checks, setChecks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterRange, setFilterRange] = useState("30d");
  const [profile, setProfile] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("range")) setFilterRange(params.get("range"));
    if (params.get("company")) setFilterCompany(params.get("company"));
    if (params.get("result")) setFilterResult(params.get("result"));
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          if (data) { setProfile(data); loadData(data); }
        });
      });
    } else { loadData(null); }
  }, []);

  async function loadData(userProfile) {
    setLoading(true);
    if (isSupabaseReady()) {
      let companyIds = null;
      if (userProfile && userProfile.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      }
      let chQuery = supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }).limit(500);
      if (companyIds) chQuery = chQuery.in("company_id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      let coQuery = supabase.from("companies").select("id, name").is("archived_at", null).order("name");
      if (companyIds) coQuery = coQuery.in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const [chRes, coRes] = await Promise.all([chQuery, coQuery]);
      setChecks(chRes.data || []);
      setCompanies(coRes.data || []);
    }
    setLoading(false);
  }

  async function handleDownloadPDF(e, ch) {
    e.stopPropagation();
    setDownloadingId(ch.id);
    let items = [];
    if (isSupabaseReady()) {
      const { data } = await supabase.from("check_items").select("*").eq("check_id", ch.id).order("id");
      items = data || [];
    }
    await downloadCheckPDFReal(ch, items);
    setDownloadingId(null);
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

  // ✅ Stat card click handlers — filter the list
  const statCards = [
    {
      icon: "📋", value: filtered.length, label: "Total Checks", color: "#0F172A",
      onClick: () => setFilterResult("all"),
      active: filterResult === "all",
      title: "Show all checks"
    },
    {
      icon: "✅", value: passCount, label: "Passed", color: "#059669",
      onClick: () => setFilterResult(filterResult === "pass" ? "all" : "pass"),
      active: filterResult === "pass",
      title: "Click to filter passed checks"
    },
    {
      icon: "⚠️", value: failCount, label: "With Defects", color: "#DC2626",
      onClick: () => setFilterResult(filterResult === "fail" ? "all" : "fail"),
      active: filterResult === "fail",
      title: "Click to filter checks with defects"
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .stat-card { transition: all 0.18s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
        .stat-card.active { box-shadow: 0 0 0 2px var(--card-color), 0 4px 16px rgba(0,0,0,0.08) !important; }
        .check-row:hover { background: #F8FAFC !important; }
        .pdf-btn:hover { background: #F1F5F9 !important; border-color: #CBD5E1 !important; }
      `}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <a href="/dashboard" style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>← Dashboard</a>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>📋 Walkaround Checks</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>All driver checks across all companies</p>
          </div>
          <ExportDropdown
            onCSV={() => exportChecksCSV(filtered, `checks-${filterRange}.csv`)}
            onPDF={() => printReport("Walkaround Checks", `${filtered.length} checks`,
              ["Ref", "Vehicle", "Driver", "Result", "Items", "Defects", "Date"],
              filtered.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result === "pass" ? "✅ PASS" : "⚠️ FAIL", `${ch.passed_items||0}/${ch.total_items||0}`, ch.defects_reported||0, formatDate(ch.completed_at)]),
              (row) => row[3].includes("FAIL") ? "danger" : "")}
          />
        </div>

        {/* ✅ FIXED: Stat cards are now clickable and filter the list */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {statCards.map(s => (
            <div
              key={s.label}
              className={`stat-card${s.active ? " active" : ""}`}
              onClick={s.onClick}
              title={s.title}
              style={{
                "--card-color": s.color,
                background: s.active ? s.color + "08" : "#FFF",
                borderRadius: "14px",
                padding: "16px 20px",
                border: s.active ? `2px solid ${s.color}` : "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{s.label}</div>
                {s.active && <div style={{ fontSize: "9px", color: s.color, fontWeight: 700, marginTop: "2px" }}>ACTIVE FILTER</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit", cursor: "pointer" }}>
            <option value="all">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {["7d", "30d", "90d", "all"].map(r => (
            <button key={r} onClick={() => setFilterRange(r)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterRange === r ? "#0F172A" : "#FFF", color: filterRange === r ? "white" : "#64748B", fontSize: "12px", fontWeight: 700, transition: "all 0.15s" }}>
              {r === "all" ? "All Time" : `Last ${r}`}
            </button>
          ))}
          <span style={{ borderLeft: "1px solid #E5E7EB", margin: "0 4px" }} />
          {[
            { key: "all", label: "All Results" },
            { key: "pass", label: "✅ Passed" },
            { key: "fail", label: "⚠️ Defects" },
          ].map(r => (
            <button key={r.key} onClick={() => setFilterResult(r.key)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterResult === r.key ? "#0F172A" : "#FFF", color: filterResult === r.key ? "white" : "#64748B", fontSize: "12px", fontWeight: 700, transition: "all 0.15s" }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px", fontWeight: 600 }}>
          {filtered.length} {filtered.length === 1 ? "check" : "checks"} found
          {filterResult !== "all" && <span style={{ marginLeft: "8px", color: filterResult === "pass" ? "#059669" : "#DC2626" }}>({filterResult === "pass" ? "passed only" : "with defects only"})</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading checks...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8", background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB" }}>No checks match your filters</div>
        ) : (
          <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Reference", "Vehicle", "Driver", "Result", "Items", "Defects", "Date", ""].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ch => (
                    <tr
                      key={ch.id}
                      className="check-row"
                      style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer", transition: "all 0.15s" }}
                      onClick={(e) => { if (e.target.tagName === "BUTTON") return; handleDownloadPDF(e, ch); }}
                    >
                      <td style={{ padding: "14px", fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "#374151" }}>{ch.reference_id}</td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", fontFamily: "monospace", color: "#0F172A" }}>{ch.vehicle_reg}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>{ch.vehicle_type}</div>
                      </td>
                      <td style={{ padding: "14px", fontSize: "13px", color: "#374151" }}>{ch.driver_name}</td>
                      <td style={{ padding: "14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: "20px", background: ch.result === "pass" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${ch.result === "pass" ? "#A7F3D0" : "#FECACA"}`, fontSize: "10px", fontWeight: 700, color: ch.result === "pass" ? "#059669" : "#DC2626" }}>
                          {ch.result === "pass" ? "✅ PASS" : "⚠️ FAIL"}
                        </span>
                      </td>
                      <td style={{ padding: "14px", fontSize: "12px", color: "#6B7280" }}>{ch.passed_items || 0}/{ch.total_items || 0}</td>
                      <td style={{ padding: "14px" }}>
                        {ch.defects_reported > 0
                          ? <span style={{ padding: "2px 8px", borderRadius: "10px", background: "#FEF2F2", fontSize: "11px", fontWeight: 700, color: "#DC2626" }}>{ch.defects_reported}</span>
                          : <span style={{ color: "#94A3B8", fontSize: "12px" }}>0</span>}
                      </td>
                      <td style={{ padding: "14px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{formatDate(ch.completed_at)}</div>
                        <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatTime(ch.completed_at)}</div>
                      </td>
                      <td style={{ padding: "14px" }}>
                        <button
                          className="pdf-btn"
                          onClick={(e) => handleDownloadPDF(e, ch)}
                          disabled={downloadingId === ch.id}
                          style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: downloadingId === ch.id ? "wait" : "pointer", whiteSpace: "nowrap", transition: "all 0.15s", opacity: downloadingId === ch.id ? 0.6 : 1 }}
                        >
                          {downloadingId === ch.id ? "⏳ Generating..." : "📄 Download PDF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>
        ComplyFleet v1.0 · DVSA Compliance Platform · © 2026
      </footer>
    </div>
  );
}
