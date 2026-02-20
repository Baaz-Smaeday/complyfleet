"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { exportChecksCSV, printReport } from "../../lib/utils";
import ExportDropdown from "../../components/ExportDropdown";

function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }

async function downloadCheckPDFReal(ch, items) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210; const margin = 15; let y = 20;
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("ComplyFleet", margin, 12); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("DVSA Walkaround Check Record", margin, 19);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(ch.vehicle_reg || "", pageW - margin, 12, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(ch.vehicle_type || "", pageW - margin, 19, { align: "right" });
  y = 38;
  const infoItems = [
    ["Driver", ch.driver_name || ""], ["Date", `${formatDate(ch.completed_at)} ${formatTime(ch.completed_at)}`],
    ["Reference", ch.reference_id || ""], ["Odometer", ch.odometer || "N/A"],
    ["Items Checked", `${ch.total_items || 0} total`],
    ["Summary", `${items.filter(i => i.status === "pass").length} pass / ${items.filter(i => i.status === "fail").length} fail`],
  ];
  const cellW = (pageW - margin * 2) / 3;
  infoItems.forEach((item, idx) => {
    const col = idx % 3; const row = Math.floor(idx / 3);
    const x = margin + col * cellW; const cy = y + row * 18;
    doc.setFillColor(248, 250, 252); doc.roundedRect(x, cy, cellW - 3, 15, 2, 2, "F");
    doc.setTextColor(107, 114, 128); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text(item[0].toUpperCase(), x + 4, cy + 5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(item[1], x + 4, cy + 11);
  });
  y += 42;
  const isPass = ch.result === "pass";
  doc.setFillColor(isPass ? 209 : 254, isPass ? 250 : 226, isPass ? 229 : 226);
  doc.roundedRect(margin, y, pageW - margin * 2, 12, 3, 3, "F");
  doc.setTextColor(isPass ? 6 : 153, isPass ? 95 : 27, isPass ? 70 : 27);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(isPass ? "✓ VEHICLE SAFE TO DRIVE" : "⚠ DEFECTS REPORTED", pageW / 2, y + 8, { align: "center" });
  y += 20;
  doc.setFillColor(15, 23, 42); doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
  const cols = [
    { label: "CATEGORY", x: margin + 2 }, { label: "ITEM", x: margin + 32 },
    { label: "RESULT", x: margin + 97 }, { label: "DEFECT NOTES", x: margin + 117 }, { label: "SEVERITY", x: margin + 162 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y + 5.5)); y += 8;
  items.forEach((item, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const isFail = item.status === "fail";
    doc.setFillColor(isFail ? 254 : (i % 2 === 0 ? 255 : 249), isFail ? 242 : (i % 2 === 0 ? 255 : 250), isFail ? 242 : (i % 2 === 0 ? 255 : 252));
    doc.rect(margin, y, pageW - margin * 2, 7, "F");
    doc.setTextColor(55, 65, 81); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    doc.text((item.category || "").substring(0, 18), cols[0].x, y + 5);
    doc.text((item.item_label || "").substring(0, 38), cols[1].x, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isFail ? 220 : 5, isFail ? 38 : 150, isFail ? 38 : 105);
    doc.text(isFail ? "✗ FAIL" : "✓ PASS", cols[2].x, y + 5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(55, 65, 81);
    doc.text((item.defect_description || "").substring(0, 28), cols[3].x, y + 5);
    if (item.defect_severity) {
      const sev = item.defect_severity.toUpperCase();
      const sevColor = sev === "DANGEROUS" ? [220, 38, 38] : sev === "MAJOR" ? [249, 115, 22] : [245, 158, 11];
      doc.setTextColor(...sevColor); doc.setFont("helvetica", "bold"); doc.text(sev, cols[4].x, y + 5);
    }
    y += 7;
  });
  y += 10;
  if (y < 260) {
    doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 70, y); doc.line(pageW - margin - 70, y, pageW - margin, y);
    doc.setTextColor(107, 114, 128); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(`Driver: ${ch.driver_name || ""}`, margin, y + 5);
    doc.text(`Date: ${formatDate(ch.completed_at)}`, pageW - margin - 70, y + 5);
  }
  doc.setFillColor(248, 250, 252); doc.rect(0, 287, pageW, 10, "F");
  doc.setTextColor(148, 163, 184); doc.setFontSize(7);
  doc.text("ComplyFleet · DVSA Compliance Platform · complyfleet.vercel.app · Record permanently stored", pageW / 2, 293, { align: "center" });
  const filename = `WC-${ch.reference_id || ch.id.slice(0, 8)}-${formatDate(ch.completed_at).replace(/ /g, "")}.pdf`;
  doc.save(filename);
}

function PhotoLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
        <img src={src} alt="Check photo" style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "12px", objectFit: "contain", display: "block" }} />
        <button onClick={onClose} style={{ position: "absolute", top: "-14px", right: "-14px", width: "32px", height: "32px", borderRadius: "50%", background: "#DC2626", border: "2px solid white", color: "white", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✕</button>
      </div>
    </div>
  );
}

function CheckDetailModal({ check, onClose, onDownloadPDF, downloading }) {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    if (!check) return;
    supabase.from("check_items").select("*").eq("check_id", check.id).order("id")
      .then(({ data }) => { setItems(data || []); setLoadingItems(false); });
  }, [check]);

  if (!check) return null;

  const failedItems = items.filter(i => i.status === "fail");
  const passedItems = items.filter(i => i.status === "pass");
  const allPhotos = [
    ...items.filter(i => i.photo_url).map(i => ({ url: i.photo_url, label: i.item_label, severity: i.defect_severity })),
    ...(check.photo_urls || []).map(url => ({ url, label: "General", severity: null })),
  ];

  return (
    <>
      <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#FFF", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: "680px", maxHeight: "92vh", overflow: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E5E7EB", margin: "12px auto 0" }} />
          <div style={{ padding: "16px 24px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px", fontWeight: 900, fontFamily: "monospace", color: "#0F172A" }}>{check.vehicle_reg}</span>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 800, background: check.result === "pass" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${check.result === "pass" ? "#A7F3D0" : "#FECACA"}`, color: check.result === "pass" ? "#059669" : "#DC2626" }}>
                  {check.result === "pass" ? "✅ PASS" : "⚠️ FAIL"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "3px" }}>{check.driver_name} · {formatDate(check.completed_at)} {formatTime(check.completed_at)}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={() => onDownloadPDF(check, items)} disabled={downloading} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "11px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
                {downloading ? "⏳" : "📄 PDF"}
              </button>
              <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#F8FAFC", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "Total Items", value: check.total_items || 0, color: "#0F172A" },
                { label: "Passed", value: check.passed_items || passedItems.length, color: "#059669" },
                { label: "Defects", value: check.defects_reported || failedItems.length, color: "#DC2626" },
                { label: "Photos", value: allPhotos.length, color: "#7C3AED" },
              ].map(s => (
                <div key={s.label} style={{ background: "#F8FAFC", borderRadius: "12px", padding: "12px", textAlign: "center", border: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {allPhotos.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>📷 Photos ({allPhotos.length})</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
                  {allPhotos.map((p, i) => (
                    <div key={i} onClick={() => setLightboxSrc(p.url)} style={{ position: "relative", cursor: "pointer", borderRadius: "12px", overflow: "hidden", aspectRatio: "1", border: "2px solid #E5E7EB" }}>
                      <img src={p.url} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "6px 6px 5px" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "white", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.label}</div>
                        {p.severity && <div style={{ fontSize: "8px", color: p.severity === "dangerous" ? "#FCA5A5" : p.severity === "major" ? "#FDBA74" : "#FDE68A", fontWeight: 700, textTransform: "uppercase" }}>{p.severity}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {failedItems.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626", marginBottom: "10px" }}>⚠️ Defects Reported</div>
                {failedItems.map(item => (
                  <div key={item.id} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{item.item_label}</div>
                        <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{item.category}</div>
                        {item.defect_description && <div style={{ fontSize: "12px", color: "#374151", marginTop: "6px", fontStyle: "italic" }}>"{item.defect_description}"</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        {item.photo_url && <img src={item.photo_url} alt={item.item_label} onClick={() => setLightboxSrc(item.photo_url)} style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "8px", border: "2px solid #FECACA", cursor: "pointer" }} />}
                        {item.defect_severity && <span style={{ padding: "3px 8px", borderRadius: "8px", fontSize: "9px", fontWeight: 800, background: item.defect_severity === "dangerous" ? "#DC2626" : item.defect_severity === "major" ? "#F97316" : "#F59E0B", color: "white" }}>{item.defect_severity.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingItems && passedItems.length > 0 && (
              <details style={{ marginBottom: "10px" }}>
                <summary style={{ fontSize: "13px", fontWeight: 700, color: "#059669", cursor: "pointer", padding: "10px 0", userSelect: "none", listStyle: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                  ✅ {passedItems.length} items passed — tap to expand
                </summary>
                <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {passedItems.map(item => (
                    <span key={item.id} style={{ padding: "4px 10px", borderRadius: "20px", background: "#ECFDF5", border: "1px solid #A7F3D0", fontSize: "11px", color: "#059669", fontWeight: 600 }}>{item.item_label}</span>
                  ))}
                </div>
              </details>
            )}
            {loadingItems && <div style={{ textAlign: "center", padding: "20px", color: "#94A3B8", fontSize: "13px" }}>Loading check details...</div>}
          </div>
        </div>
      </div>
    </>
  );
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
  const [selectedCheck, setSelectedCheck] = useState(null);

  // ✅ detect company admin
  const isCompanyAdmin = profile?.role === "company_admin" || profile?.role === "company_viewer";

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

      if (userProfile?.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      } else if (userProfile?.role === "company_admin" || userProfile?.role === "company_viewer") {
        // ✅ Company admin: only their company
        const { data: comp } = await supabase.from("companies").select("id").eq("user_id", userProfile.id).single();
        companyIds = comp ? [comp.id] : [];
      }

      const ids = companyIds?.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"];
      let chQuery = supabase.from("walkaround_checks").select("*").order("completed_at", { ascending: false }).limit(500);
      if (companyIds) chQuery = chQuery.in("company_id", ids);
      let coQuery = supabase.from("companies").select("id, name").is("archived_at", null).order("name");
      if (companyIds) coQuery = coQuery.in("id", ids);

      const [chRes, coRes] = await Promise.all([chQuery, coQuery]);
      setChecks(chRes.data || []); setCompanies(coRes.data || []);
    }
    setLoading(false);
  }

  async function handleDownloadPDF(ch, prefetchedItems) {
    setDownloadingId(ch.id);
    let items = prefetchedItems || [];
    if (!items.length && isSupabaseReady()) {
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
  const photoCount = filtered.filter(c => (c.photo_urls || []).length > 0).length;

  const statCards = [
    { icon: "📋", value: filtered.length, label: "Total Checks", color: "#0F172A", onClick: () => setFilterResult("all"), active: filterResult === "all" },
    { icon: "✅", value: passCount, label: "Passed", color: "#059669", onClick: () => setFilterResult(filterResult === "pass" ? "all" : "pass"), active: filterResult === "pass" },
    { icon: "⚠️", value: failCount, label: "With Defects", color: "#DC2626", onClick: () => setFilterResult(filterResult === "fail" ? "all" : "fail"), active: filterResult === "fail" },
    { icon: "📷", value: photoCount, label: "With Photos", color: "#7C3AED", onClick: null, active: false },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .stat-card { transition: all 0.18s ease; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
        .check-row { transition: background 0.12s; }
        .check-row:hover { background: #F8FAFC !important; cursor: pointer; }
        .pdf-btn:hover { background: #F1F5F9 !important; border-color: #CBD5E1 !important; }
        details summary::-webkit-details-marker { display: none; }
      `}</style>

      <CheckDetailModal check={selectedCheck} onClose={() => setSelectedCheck(null)} onDownloadPDF={handleDownloadPDF} downloading={!!downloadingId} />

      <header style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        {/* ✅ Styled back button (matches other pages) */}
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.1)", color: "white", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>
          ← Back to Dashboard
        </a>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>📋 Walkaround Checks</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Click any row to view details & photos</p>
          </div>
          <ExportDropdown
            onCSV={() => exportChecksCSV(filtered, `checks-${filterRange}.csv`)}
            onPDF={() => printReport("Walkaround Checks", `${filtered.length} checks`, ["Ref", "Vehicle", "Driver", "Result", "Items", "Defects", "Photos", "Date"], filtered.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result === "pass" ? "✅ PASS" : "⚠️ FAIL", `${ch.passed_items||0}/${ch.total_items||0}`, ch.defects_reported||0, (ch.photo_urls||[]).length, formatDate(ch.completed_at)]), (row) => row[3].includes("FAIL") ? "danger" : "")}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card" onClick={s.onClick || undefined}
              style={{ background: s.active ? s.color + "08" : "#FFF", borderRadius: "14px", padding: "16px 20px", border: s.active ? `2px solid ${s.color}` : "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "14px", cursor: s.onClick ? "pointer" : "default" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{s.label}</div>
                {s.active && <div style={{ fontSize: "9px", color: s.color, fontWeight: 700, marginTop: "2px" }}>ACTIVE FILTER</div>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {/* ✅ Only show company filter for TMs */}
          {!isCompanyAdmin && (
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {["7d", "30d", "90d", "all"].map(r => (
            <button key={r} onClick={() => setFilterRange(r)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterRange === r ? "#0F172A" : "#FFF", color: filterRange === r ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {r === "all" ? "All Time" : `Last ${r}`}
            </button>
          ))}
          <span style={{ borderLeft: "1px solid #E5E7EB", margin: "0 4px" }} />
          {[{ key: "all", label: "All Results" }, { key: "pass", label: "✅ Passed" }, { key: "fail", label: "⚠️ Defects" }].map(r => (
            <button key={r.key} onClick={() => setFilterResult(r.key)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filterResult === r.key ? "#0F172A" : "#FFF", color: filterResult === r.key ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "12px", fontWeight: 600 }}>
          {filtered.length} {filtered.length === 1 ? "check" : "checks"} — click row to view details & photos
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading checks...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8", background: "#FFF", borderRadius: "16px", border: "1px solid #E5E7EB" }}>No checks match your filters</div>
        ) : (
          <div style={{ background: "#FFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    {["Reference", "Vehicle", "Driver", "Result", "Items", "Defects", "Photos", "Date", ""].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", borderBottom: "2px solid #E5E7EB" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ch => {
                    const pCount = (ch.photo_urls || []).length;
                    return (
                      <tr key={ch.id} className="check-row" style={{ borderBottom: "1px solid #F3F4F6" }} onClick={() => setSelectedCheck(ch)}>
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
                          {pCount > 0 ? (
                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                              {(ch.photo_urls || []).slice(0, 2).map((url, i) => (
                                <img key={i} src={url} alt="photo" onClick={e => { e.stopPropagation(); setSelectedCheck(ch); }} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", border: "1px solid #E5E7EB", cursor: "pointer" }} />
                              ))}
                              {pCount > 2 && <span style={{ fontSize: "10px", color: "#94A3B8", fontWeight: 700 }}>+{pCount - 2}</span>}
                            </div>
                          ) : <span style={{ color: "#E5E7EB", fontSize: "12px" }}>—</span>}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{formatDate(ch.completed_at)}</div>
                          <div style={{ fontSize: "10px", color: "#94A3B8" }}>{formatTime(ch.completed_at)}</div>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <button className="pdf-btn" onClick={e => { e.stopPropagation(); handleDownloadPDF(ch, null); }} disabled={downloadingId === ch.id}
                            style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "10px", fontWeight: 700, color: "#374151", cursor: downloadingId === ch.id ? "wait" : "pointer", whiteSpace: "nowrap", opacity: downloadingId === ch.id ? 0.6 : 1 }}>
                            {downloadingId === ch.id ? "⏳" : "📄 PDF"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
