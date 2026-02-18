"use client";
import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };

const MOCK_VEHICLES = [
  { id: "v1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v2", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v3", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v5", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", company_name: "Northern Express", company_id: "c2" },
];

function QRCard({ vehicle, baseUrl }) {
  const walkaroundUrl = `${baseUrl}/walkaround?vehicle=${vehicle.id}&company=${vehicle.company_id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walkaroundUrl)}&color=0F172A&bgcolor=FFFFFF`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>QR - ${vehicle.reg}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&display=swap');
      body { font-family: 'DM Sans', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .card { text-align: center; padding: 40px; border: 3px solid #0F172A; border-radius: 20px; width: 320px; }
      .logo { font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.02em; }
      .logo span { color: #2563EB; }
      .reg { font-size: 32px; font-weight: 800; font-family: monospace; color: #0F172A; margin: 16px 0 4px; }
      .type { font-size: 14px; color: #6B7280; }
      .company { font-size: 12px; color: #6B7280; margin-top: 4px; }
      .scan { margin-top: 16px; padding: 8px 16px; background: #0F172A; color: white; border-radius: 8px; font-size: 12px; font-weight: 700; }
      .sub { font-size: 10px; color: #94A3B8; margin-top: 12px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body><div class="card">
      <div class="logo">\u{1F69B} Comply<span>Fleet</span></div>
      <img src="${qrUrl}" width="180" height="180" />
      <div class="reg">${vehicle.reg}</div>
      <div class="type">${vehicle.type} \u00B7 ${vehicle.make || ""} ${vehicle.model || ""}</div>
      <div class="company">${vehicle.company_name || ""}</div>
      <div class="scan">\u{1F4F1} SCAN TO START WALKAROUND CHECK</div>
      <div class="sub">Powered by ComplyFleet \u00B7 complyfleet.vercel.app</div>
    </div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div style={{
      background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB",
      overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      transition: "all 0.2s", cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
      <div style={{ height: "3px", background: vehicle.type === "HGV" ? "#2563EB" : vehicle.type === "Van" ? "#10B981" : "#F59E0B" }} />
      <div style={{ padding: "24px", textAlign: "center" }}>
        <img src={qrUrl} width="160" height="160" alt={`QR for ${vehicle.reg}`} style={{ borderRadius: "8px", border: "1px solid #F3F4F6" }} />
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontWeight: 800, fontSize: "22px", fontFamily: "monospace", color: "#0F172A", letterSpacing: "0.05em" }}>{vehicle.reg}</div>
          <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>{TYPES[vehicle.type]} {vehicle.type} {"\u00B7"} {vehicle.make} {vehicle.model}</div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>{vehicle.company_name}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
          <button onClick={handlePrint} style={{
            padding: "10px 20px", borderRadius: "10px", border: "none",
            background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
            fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          }}>{"\u{1F5A8}\uFE0F"} Print QR</button>
          <button onClick={() => { navigator.clipboard.writeText(walkaroundUrl); }} style={{
            padding: "10px 20px", borderRadius: "10px", border: "1px solid #E5E7EB",
            background: "#FFFFFF", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer",
          }}>{"\u{1F4CB}"} Copy Link</button>
        </div>
        <div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "8px", background: "#F8FAFC", fontSize: "10px", fontFamily: "monospace", color: "#6B7280", wordBreak: "break-all" }}>{walkaroundUrl}</div>
      </div>
    </div>
  );
}

export default function ComplyFleetQRCodes() {
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("https://complyfleet.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
    if (isSupabaseReady()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { window.location.href = "/login"; return; }
        supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
          loadData(data);
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
      let cQuery = supabase.from("companies").select("id, name").is("archived_at", null).order("name");
      if (companyIds) cQuery = cQuery.in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      let vQuery = supabase.from("vehicles").select("*").is("archived_at", null).order("reg");
      if (companyIds) vQuery = vQuery.in("company_id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);
      const [{ data: cos }, { data: vehs }] = await Promise.all([cQuery, vQuery]);
      setCompanies(cos || []);
      if (vehs && cos) {
        const cMap = {};
        cos.forEach(c => { cMap[c.id] = c.name; });
        setVehicles(vehs.map(v => ({ ...v, company_name: cMap[v.company_id] || "" })));
      }
    } else {
      setCompanies([{ id: "c1", name: "Hargreaves Haulage Ltd" }, { id: "c2", name: "Northern Express" }]);
      setVehicles(MOCK_VEHICLES);
    }
    setLoading(false);
  }

  const filtered = vehicles.filter(v => {
    if (selectedCompany !== "all" && v.company_id !== selectedCompany) return false;
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    return true;
  });

  const handlePrintAll = () => {
    const win = window.open("", "_blank");
    let html = `<!DOCTYPE html><html><head><title>ComplyFleet QR Codes</title><style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&display=swap');
      body { font-family: 'DM Sans', sans-serif; margin: 0; padding: 20px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
      .card { text-align: center; padding: 24px; border: 2px solid #0F172A; border-radius: 16px; page-break-inside: avoid; }
      .reg { font-size: 24px; font-weight: 800; font-family: monospace; margin: 10px 0 4px; }
      .type { font-size: 12px; color: #6B7280; }
      .scan { margin-top: 10px; padding: 6px 12px; background: #0F172A; color: white; border-radius: 6px; font-size: 10px; font-weight: 700; display: inline-block; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body><div class="grid">`;
    filtered.forEach(v => {
      const url = `${baseUrl}/walkaround?vehicle=${v.id}&company=${v.company_id}`;
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}&color=0F172A`;
      html += `<div class="card"><img src="${qr}" width="130" height="130" /><div class="reg">${v.reg}</div><div class="type">${v.type} \u00B7 ${v.make || ""} ${v.model || ""}</div><div class="scan">\u{1F4F1} SCAN TO CHECK</div></div>`;
    });
    html += `</div></body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!isSupabaseReady() && <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(251,191,36,0.2)", color: "#FCD34D", fontSize: "10px", fontWeight: 700 }}>DEMO MODE</span>}
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F4F1}"} QR Codes</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Print and stick in each vehicle cab. Drivers scan to start check.</p></div>
          <button onClick={handlePrintAll} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F5A8}\uFE0F"} Print All ({filtered.length})</button>
        </div>

        {/* Info banner */}
        <div style={{ padding: "16px 20px", borderRadius: "14px", background: "#EFF6FF", border: "1px solid #BFDBFE", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "24px" }}>{"\u{1F4A1}"}</span>
          <div style={{ fontSize: "13px", color: "#1E40AF", lineHeight: 1.5 }}>
            <strong>How it works:</strong> Each QR code links directly to the walkaround check for that specific vehicle. Print them, laminate them, stick one in each cab. Drivers scan with their phone camera {"\u2014"} no app needed.
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
            <option value="all">All Companies</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {["all", "HGV", "Van", "Trailer"].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: typeFilter === t ? "#0F172A" : "#F1F5F9", color: typeFilter === t ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {t === "all" ? "All Types" : `${TYPES[t]} ${t}`}</button>))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>Loading vehicles...</div> :
        filtered.length === 0 ? <div style={{ textAlign: "center", padding: "60px", color: "#94A3B8" }}>No vehicles found. Add some in the Company page first.</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filtered.map(v => <QRCard key={v.id} vehicle={v} baseUrl={baseUrl} />)}
        </div>}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>
    </div>
  );
}

