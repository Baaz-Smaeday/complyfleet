"use client";
import { useState, useRef } from "react";

// ============================================================
// COMPLYFLEET — Vehicle QR Code System
// Permanent QR per vehicle → Print → Stick in cab → Any driver scans → Auto-routes
// ============================================================

const COMPANIES = [
  {
    id: "c1", name: "Hargreaves Haulage Ltd", oLicence: "OB1234567",
    vehicles: [
      { id: "v1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", year: 2020, qrToken: "CF-HH-BD63XYZ-7k9m", totalChecks: 142, lastCheck: "2026-02-16T06:42:00Z", lastDriver: "Mark Thompson" },
      { id: "v2", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", year: 2019, qrToken: "CF-HH-KL19ABC-3p8n", totalChecks: 98, lastCheck: "2026-02-16T06:30:00Z", lastDriver: "Alan Davies" },
      { id: "v3", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", year: 2020, qrToken: "CF-HH-MN20DEF-5r2j", totalChecks: 67, lastCheck: "2026-02-15T07:15:00Z", lastDriver: "Paul Rogers" },
      { id: "v4", reg: "PQ21 GHI", type: "Trailer", make: "SDC", model: "Curtainsider", year: 2021, qrToken: "CF-HH-PQ21GHI-9w4x", totalChecks: 34, lastCheck: "2026-02-14T06:50:00Z", lastDriver: "Mark Thompson" },
    ],
  },
  {
    id: "c2", name: "Northern Express Transport", oLicence: "OB2345678",
    vehicles: [
      { id: "v5", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", year: 2022, qrToken: "CF-NE-AB12CDE-2h6t", totalChecks: 56, lastCheck: "2026-02-16T05:55:00Z", lastDriver: "James Ward" },
      { id: "v6", reg: "FG34 HIJ", type: "HGV", make: "Scania", model: "R450", year: 2021, qrToken: "CF-NE-FG34HIJ-8b3v", totalChecks: 112, lastCheck: "2026-02-16T06:10:00Z", lastDriver: "Peter Clarke" },
      { id: "v7", reg: "JK56 LMN", type: "Van", make: "Mercedes", model: "Sprinter 314", year: 2022, qrToken: "CF-NE-JK56LMN-4f7q", totalChecks: 45, lastCheck: "2026-02-15T07:30:00Z", lastDriver: "James Ward" },
    ],
  },
  {
    id: "c3", name: "Yorkshire Fleet Services", oLicence: "OB3456789",
    vehicles: [
      { id: "v8", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480", year: 2020, qrToken: "CF-YF-LM67OPQ-1d5s", totalChecks: 89, lastCheck: "2026-02-16T07:10:00Z", lastDriver: "Steve Williams" },
      { id: "v9", reg: "RS89 TUV", type: "HGV", make: "Volvo", model: "FM 330", year: 2019, qrToken: "CF-YF-RS89TUV-6g2k", totalChecks: 134, lastCheck: "2026-02-16T06:25:00Z", lastDriver: "David Brooks Jr" },
      { id: "v10", reg: "WX01 YZA", type: "Van", make: "VW", model: "Crafter", year: 2021, qrToken: "CF-YF-WX01YZA-3m8p", totalChecks: 23, lastCheck: "2026-02-14T08:00:00Z", lastDriver: "Mike Evans" },
      { id: "v11", reg: "BC23 DEF", type: "Trailer", make: "Montracon", model: "Flatbed", year: 2020, qrToken: "CF-YF-BC23DEF-7n4w", totalChecks: 41, lastCheck: "2026-02-15T06:45:00Z", lastDriver: "Steve Williams" },
      { id: "v12", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450", year: 2019, qrToken: "CF-YF-GH45IJK-9x1c", totalChecks: 156, lastCheck: "2026-02-12T06:40:00Z", lastDriver: "Steve Williams" },
    ],
  },
  {
    id: "c4", name: "Pennine Logistics Group", oLicence: "OB4567890",
    vehicles: [
      { id: "v13", reg: "LN54 BCD", type: "HGV", make: "MAN", model: "TGX 18.470", year: 2021, qrToken: "CF-PL-LN54BCD-2v6y", totalChecks: 78, lastCheck: "2026-02-16T06:15:00Z", lastDriver: "Tom Hardy" },
      { id: "v14", reg: "OP67 EFG", type: "Van", make: "Ford", model: "Transit Custom", year: 2022, qrToken: "CF-PL-OP67EFG-5a9r", totalChecks: 34, lastCheck: "2026-02-15T07:45:00Z", lastDriver: "Karen Whitfield" },
    ],
  },
];

const TYPE_ICONS = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };
const BASE_URL = "https://complyfleet.co.uk/check";

// --- QR Code Generator (deterministic pattern from token) ---
function QRCode({ token, size = 180, darkColor = "#0F172A", lightColor = "#FFFFFF" }) {
  const cells = 25;
  const cellSize = size / cells;
  const hash = (s, i) => {
    let h = i * 2654435761;
    for (let c = 0; c < s.length; c++) h = ((h << 5) - h + s.charCodeAt(c)) | 0;
    return Math.abs(h);
  };

  const grid = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // Corner finder patterns (7x7)
      const corners = [[0,0],[0,cells-7],[cells-7,0]];
      for (const [cr, cc] of corners) {
        const lr = r - cr, lc = c - cc;
        if (lr >= 0 && lr < 7 && lc >= 0 && lc < 7) {
          if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
          if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
          return false;
        }
      }
      // Timing patterns
      if (r === 6) return c % 2 === 0;
      if (c === 6) return r % 2 === 0;
      // Alignment pattern
      if (r >= 16 && r <= 20 && c >= 16 && c <= 20) {
        if (r === 16 || r === 20 || c === 16 || c === 20) return true;
        if (r === 18 && c === 18) return true;
        return false;
      }
      // Data area
      return (hash(token, r * 31 + c) % 100) > 45;
    })
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: "4px" }}>
      <rect width={size} height={size} fill={lightColor} />
      {grid.map((row, r) => row.map((filled, c) =>
        filled ? <rect key={`${r}-${c}`} x={c*cellSize} y={r*cellSize} width={cellSize+0.5} height={cellSize+0.5} fill={darkColor} /> : null
      ))}
    </svg>
  );
}

// --- Printable Card Component ---
function PrintableCard({ vehicle, company }) {
  const url = `${BASE_URL}/${vehicle.qrToken}`;
  return (
    <div style={{
      width: "340px", background: "white", borderRadius: "16px",
      border: "2px solid #1E293B", overflow: "hidden",
      pageBreakInside: "avoid", flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        background: "#0F172A", padding: "14px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "white", fontWeight: 800, fontSize: "14px" }}>
            Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
          </div>
          <div style={{ color: "#94A3B8", fontSize: "9px", marginTop: "2px" }}>Daily Walkaround Check</div>
        </div>
        <span style={{ fontSize: "20px" }}>{TYPE_ICONS[vehicle.type]}</span>
      </div>

      {/* Vehicle info */}
      <div style={{ padding: "14px 18px", borderBottom: "1px dashed #CBD5E1" }}>
        <div style={{
          fontFamily: "'Courier New', monospace", fontSize: "28px", fontWeight: 900,
          color: "#0F172A", letterSpacing: "0.05em", textAlign: "center",
        }}>{vehicle.reg}</div>
        <div style={{ textAlign: "center", fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
          {vehicle.year} {vehicle.make} {vehicle.model} • {vehicle.type}
        </div>
        <div style={{ textAlign: "center", fontSize: "10px", color: "#94A3B8", marginTop: "2px" }}>
          {company.name}
        </div>
      </div>

      {/* QR Code */}
      <div style={{ padding: "20px", textAlign: "center" }}>
        <QRCode token={vehicle.qrToken} size={200} />
      </div>

      {/* Instructions */}
      <div style={{
        padding: "12px 18px", background: "#F8FAFC",
        borderTop: "1px dashed #CBD5E1",
      }}>
        <div style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>
          📱 SCAN WITH YOUR PHONE CAMERA
        </div>
        <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
          {["Open camera", "Point at QR", "Tap link", "Complete check"].map((step, i) => (
            <div key={i} style={{
              fontSize: "9px", color: "#64748B", textAlign: "center",
              padding: "4px 6px", borderRadius: "4px", background: "white",
              border: "1px solid #E2E8F0", flex: 1,
            }}>
              <div style={{ fontWeight: 700, color: "#2563EB", marginBottom: "1px" }}>{i + 1}</div>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 18px", background: "#0F172A",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "8px", color: "#64748B", fontFamily: "monospace" }}>
          {url}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function VehicleQRSystem() {
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const [printCompany, setPrintCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regenerateConfirm, setRegenerateConfirm] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const allVehicles = COMPANIES.flatMap(c =>
    c.vehicles.map(v => ({ ...v, companyName: c.name, companyId: c.id, oLicence: c.oLicence }))
  );

  const filtered = allVehicles.filter(v => {
    if (selectedCompany !== "all" && v.companyId !== selectedCompany) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return v.reg.toLowerCase().includes(q) || v.companyName.toLowerCase().includes(q) ||
             v.make.toLowerCase().includes(q) || v.type.toLowerCase().includes(q);
    }
    return true;
  });

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const selectedV = selectedVehicle ? allVehicles.find(v => v.id === selectedVehicle) : null;
  const selectedC = selectedV ? COMPANIES.find(c => c.id === selectedV.companyId) : null;

  // --- Print View ---
  if (printMode) {
    const printCompanyData = printCompany ? COMPANIES.find(c => c.id === printCompany) : null;
    const printVehicles = printCompanyData
      ? printCompanyData.vehicles.map(v => ({ ...v, companyObj: printCompanyData }))
      : COMPANIES.flatMap(c => c.vehicles.map(v => ({ ...v, companyObj: c })));

    return (
      <div style={{
        minHeight: "100vh", background: "white", padding: "20px",
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
          }
        `}</style>

        {/* Print controls */}
        <div className="no-print" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "24px", padding: "16px 20px", borderRadius: "12px",
          background: "#F8FAFC", border: "1px solid #E2E8F0",
        }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              🖨️ Print QR Cards — {printVehicles.length} vehicles
            </h2>
            <p style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
              {printCompanyData ? printCompanyData.name : "All companies"} • Print and display in each vehicle cab
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => window.print()} style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: "#2563EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}>🖨️ Print Now</button>
            <button onClick={() => setPrintMode(false)} style={{
              padding: "10px 20px", borderRadius: "10px", border: "1px solid #E2E8F0",
              background: "white", color: "#6B7280", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>← Back</button>
          </div>
        </div>

        {/* Print layout */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center",
        }}>
          {printVehicles.map(v => (
            <PrintableCard key={v.id} vehicle={v} company={v.companyObj} />
          ))}
        </div>
      </div>
    );
  }

  // --- Main View ---
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
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        input:focus, select:focus { outline: none; border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "0 24px", height: "64px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><span style={{ fontSize: "18px" }}>🔔</span></div>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
        </div>
      </header>

      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: "fixed", top: "76px", left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: "12px", background: "#059669", color: "white",
          fontSize: "13px", fontWeight: 700, boxShadow: "0 8px 24px rgba(5,150,105,0.3)",
          zIndex: 200, animation: "slideDown 0.3s ease", display: "flex", alignItems: "center", gap: "8px",
        }}>✅ {successMsg}</div>
      )}

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>📱 Vehicle QR Codes</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
              Each vehicle has a permanent QR code — print it, stick it in the cab, drivers scan to do checks
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => { setPrintCompany(selectedCompany !== "all" ? selectedCompany : null); setPrintMode(true); }} style={{
              padding: "10px 20px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
              display: "flex", alignItems: "center", gap: "6px",
            }}>🖨️ Print {selectedCompany !== "all" ? "Company" : "All"} QR Cards</button>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          background: "linear-gradient(135deg, #0F172A, #1E293B)", borderRadius: "20px",
          padding: "24px 28px", marginBottom: "20px", color: "white",
        }}>
          <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>How Vehicle QR Codes Work</div>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {[
              { step: "1", icon: "🖨️", title: "Print QR card", desc: "One-time setup per vehicle", color: "#3B82F6" },
              { step: "2", icon: "🚛", title: "Display in cab", desc: "Stick on dashboard or sun visor", color: "#8B5CF6" },
              { step: "3", icon: "📱", title: "Driver scans", desc: "Phone camera → auto-opens form", color: "#F59E0B" },
              { step: "4", icon: "✏️", title: "Complete check", desc: "Enter name → checklist → submit", color: "#10B981" },
              { step: "5", icon: "📊", title: "Auto-sent", desc: "Results go to company + TM instantly", color: "#EF4444" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: "1 1 150px", padding: "16px", borderRadius: "14px",
                background: "rgba(255,255,255,0.06)", textAlign: "center", minWidth: "140px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "12px", margin: "0 auto 10px",
                  background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px",
                }}>{s.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{s.title}</div>
                <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "3px" }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: "14px", padding: "10px 14px", borderRadius: "8px",
            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)",
            fontSize: "12px", color: "#93C5FD",
          }}>
            💡 <strong>Key benefit:</strong> QR codes never expire. Print once, use forever. Any driver can scan any vehicle — the system auto-routes checks to the correct company and Transport Manager.
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 250px", position: "relative" }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#94A3B8" }}>🔍</span>
            <input type="text" placeholder="Search by reg, company, make..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: "10px", border: "1.5px solid #E2E8F0", fontSize: "13px", fontFamily: "inherit", background: "white" }} />
          </div>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
            style={{ padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #E2E8F0", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", background: "white", color: "#374151", cursor: "pointer", minWidth: "200px" }}>
            <option value="all">All Companies ({allVehicles.length} vehicles)</option>
            {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name} ({c.vehicles.length})</option>)}
          </select>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: selectedV ? "1fr 380px" : "1fr", gap: "20px" }}>

          {/* Vehicle Grid */}
          <div>
            <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "12px", fontWeight: 600 }}>
              {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
              {filtered.map(v => {
                const isSel = selectedVehicle === v.id;
                const checkToday = v.lastCheck && new Date(v.lastCheck).toDateString() === new Date("2026-02-16").toDateString();
                return (
                  <div key={v.id} onClick={() => setSelectedVehicle(v.id)} style={{
                    background: "white", borderRadius: "14px",
                    border: isSel ? "2px solid #2563EB" : "1.5px solid #E2E8F0",
                    cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden",
                    boxShadow: isSel ? "0 6px 24px rgba(37,99,235,0.12)" : "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"; }}
                  >
                    <div style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "24px" }}>{TYPE_ICONS[v.type]}</span>
                          <div>
                            <div style={{ fontFamily: "monospace", fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>{v.reg}</div>
                            <div style={{ fontSize: "11px", color: "#64748B" }}>{v.year} {v.make} {v.model}</div>
                          </div>
                        </div>
                        {/* Mini QR */}
                        <div style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
                          <QRCode token={v.qrToken} size={44} />
                        </div>
                      </div>

                      <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "10px" }}>{v.companyName}</div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "10px", padding: "3px 8px", borderRadius: "6px", fontWeight: 700,
                          background: checkToday ? "#ECFDF5" : "#FEF2F2",
                          color: checkToday ? "#059669" : "#DC2626",
                        }}>
                          {checkToday ? "✅ Checked today" : "⚠️ Not checked today"}
                        </span>
                        <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "#F1F5F9", color: "#475569", fontWeight: 600 }}>
                          {v.totalChecks} total checks
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Vehicle QR Detail */}
          {selectedV && selectedC && (
            <div style={{ position: "sticky", top: "88px", alignSelf: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>QR Code</h2>
                <button onClick={() => setSelectedVehicle(null)} style={{
                  background: "none", border: "1px solid #E5E7EB", borderRadius: "8px",
                  padding: "6px 14px", fontSize: "12px", color: "#6B7280", cursor: "pointer", fontWeight: 600,
                }}>✕</button>
              </div>

              {/* Printable card preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
                <PrintableCard vehicle={selectedV} company={selectedC} />
              </div>

              {/* Actions */}
              <div style={{ background: "white", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button onClick={() => { setPrintCompany(null); setPrintMode(true); showSuccess("Opening print view..."); }} style={{
                    width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white",
                    fontSize: "13px", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>🖨️ Print This QR Card</button>

                  <button onClick={() => showSuccess("QR image downloaded")} style={{
                    width: "100%", padding: "12px", borderRadius: "10px",
                    border: "1.5px solid #E2E8F0", background: "white",
                    fontSize: "13px", fontWeight: 700, color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>📥 Download QR Image</button>

                  <button onClick={() => showSuccess("Link copied to clipboard")} style={{
                    width: "100%", padding: "12px", borderRadius: "10px",
                    border: "1.5px solid #E2E8F0", background: "white",
                    fontSize: "13px", fontWeight: 700, color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>📋 Copy Link</button>
                </div>

                {/* Link URL */}
                <div style={{
                  marginTop: "12px", padding: "10px 12px", borderRadius: "8px",
                  background: "#F8FAFC", border: "1px solid #E2E8F0",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#6B7280", marginBottom: "4px", textTransform: "uppercase" }}>Permanent URL</div>
                  <div style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {BASE_URL}/{selectedV.qrToken}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ padding: "10px", borderRadius: "8px", background: "#F8FAFC", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#2563EB" }}>{selectedV.totalChecks}</div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>Total scans</div>
                  </div>
                  <div style={{ padding: "10px", borderRadius: "8px", background: "#F8FAFC", textAlign: "center" }}>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#059669" }}>{selectedV.lastDriver ? "✅" : "—"}</div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>Checked today</div>
                  </div>
                </div>
                {selectedV.lastDriver && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748B", textAlign: "center" }}>
                    Last check by <strong>{selectedV.lastDriver}</strong> at {new Date(selectedV.lastCheck).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}

                {/* Regenerate */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #F1F5F9" }}>
                  {regenerateConfirm === selectedV.id ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600, marginBottom: "8px" }}>
                        ⚠️ This will invalidate the old QR code. You'll need to print and replace it.
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setRegenerateConfirm(null)} style={{
                          flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #E2E8F0",
                          background: "white", fontSize: "12px", fontWeight: 600, color: "#6B7280", cursor: "pointer",
                        }}>Cancel</button>
                        <button onClick={() => { setRegenerateConfirm(null); showSuccess("New QR code generated — print and replace"); }} style={{
                          flex: 1, padding: "8px", borderRadius: "8px", border: "none",
                          background: "#DC2626", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                        }}>Regenerate</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setRegenerateConfirm(selectedV.id)} style={{
                      width: "100%", padding: "10px", borderRadius: "8px",
                      border: "1px solid #FECACA", background: "#FEF2F2",
                      fontSize: "11px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
                    }}>🔄 Regenerate QR Code (invalidates current)</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "40px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 • DVSA Compliance Management Platform • © 2026
      </footer>
    </div>
  );
}
