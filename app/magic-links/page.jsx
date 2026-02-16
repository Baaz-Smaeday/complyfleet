"use client";
import { useState } from "react";

// ============================================================
// COMPLYFLEET — Magic Links (Backup Link Sharing)
// TM generates time-limited links for drivers to do walkaround checks
// Backup for when QR codes aren't available (new vehicle, damaged QR, etc.)
// ============================================================

const TODAY = new Date("2026-02-16T10:30:00Z");
function formatDate(d) { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatTime(d) { return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
function getHoursLeft(d) { return Math.max(0, Math.floor((new Date(d) - TODAY) / (1000 * 60 * 60))); }

const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };
const BASE_URL = "https://complyfleet.co.uk/check";

const COMPANIES = [
  {
    id: "c1", name: "Hargreaves Haulage Ltd",
    vehicles: [
      { id: "v1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330" },
      { id: "v2", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230" },
      { id: "v3", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350" },
      { id: "v4", reg: "PQ21 GHI", type: "Trailer", make: "SDC", model: "Curtainsider" },
    ],
  },
  {
    id: "c2", name: "Northern Express Transport",
    vehicles: [
      { id: "v5", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460" },
      { id: "v6", reg: "FG34 HIJ", type: "HGV", make: "Scania", model: "R450" },
      { id: "v7", reg: "JK56 LMN", type: "Van", make: "Mercedes", model: "Sprinter 314" },
    ],
  },
  {
    id: "c3", name: "Yorkshire Fleet Services",
    vehicles: [
      { id: "v8", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480" },
      { id: "v9", reg: "RS89 TUV", type: "HGV", make: "Volvo", model: "FM 330" },
      { id: "v10", reg: "WX01 YZA", type: "Van", make: "VW", model: "Crafter" },
      { id: "v11", reg: "BC23 DEF", type: "Trailer", make: "Montracon", model: "Flatbed" },
      { id: "v12", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450" },
    ],
  },
  {
    id: "c4", name: "Pennine Logistics Group",
    vehicles: [
      { id: "v13", reg: "LN54 BCD", type: "HGV", make: "MAN", model: "TGX 18.470" },
      { id: "v14", reg: "OP67 EFG", type: "Van", make: "Ford", model: "Transit Custom" },
    ],
  },
];

const EXISTING_LINKS = [
  {
    id: "ML-001", vehicleId: "v1", vehicleReg: "BD63 XYZ", vehicleType: "HGV",
    company: "Hargreaves Haulage Ltd",
    token: "ml-hh-bd63-x7k9", createdAt: "2026-02-16T06:00:00Z",
    expiresAt: "2026-02-17T06:00:00Z", status: "active",
    sentTo: "Mark Thompson", sentVia: "sms", usedCount: 1,
  },
  {
    id: "ML-002", vehicleId: "v5", vehicleReg: "AB12 CDE", vehicleType: "HGV",
    company: "Northern Express Transport",
    token: "ml-ne-ab12-h2t6", createdAt: "2026-02-16T05:45:00Z",
    expiresAt: "2026-02-17T05:45:00Z", status: "active",
    sentTo: "James Ward", sentVia: "whatsapp", usedCount: 1,
  },
  {
    id: "ML-003", vehicleId: "v3", vehicleReg: "MN20 DEF", vehicleType: "Van",
    company: "Hargreaves Haulage Ltd",
    token: "ml-hh-mn20-r5j2", createdAt: "2026-02-15T06:30:00Z",
    expiresAt: "2026-02-16T06:30:00Z", status: "expired",
    sentTo: "Paul Rogers", sentVia: "sms", usedCount: 1,
  },
  {
    id: "ML-004", vehicleId: "v8", vehicleReg: "LM67 OPQ", vehicleType: "HGV",
    company: "Yorkshire Fleet Services",
    token: "ml-yf-lm67-s1d5", createdAt: "2026-02-15T07:00:00Z",
    expiresAt: "2026-02-16T07:00:00Z", status: "expired",
    sentTo: "Steve Williams", sentVia: "email", usedCount: 0,
  },
  {
    id: "ML-005", vehicleId: "v12", vehicleReg: "GH45 IJK", vehicleType: "HGV",
    company: "Yorkshire Fleet Services",
    token: "ml-yf-gh45-c9x1", createdAt: "2026-02-14T06:00:00Z",
    expiresAt: "2026-02-15T06:00:00Z", status: "revoked",
    sentTo: "Steve Williams", sentVia: "sms", usedCount: 0,
  },
];

const DURATION_OPTIONS = [
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];

const SEND_VIA = [
  { value: "sms", label: "SMS", icon: "\u{1F4F1}" },
  { value: "whatsapp", label: "WhatsApp", icon: "\u{1F4AC}" },
  { value: "email", label: "Email", icon: "\u{1F4E7}" },
  { value: "copy", label: "Copy Link", icon: "\u{1F4CB}" },
];

const STATUS_CONFIG = {
  active: { label: "ACTIVE", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981" },
  expired: { label: "EXPIRED", bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF" },
  revoked: { label: "REVOKED", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444" },
};

// --- Create Link Modal ---
function CreateLinkModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [duration, setDuration] = useState(24);
  const [sendVia, setSendVia] = useState("sms");
  const [recipient, setRecipient] = useState("");

  const company = COMPANIES.find(c => c.id === selectedCompany);

  const handleCreate = () => {
    const v = company.vehicles.find(veh => veh.id === selectedVehicle);
    onCreate({
      vehicleReg: v.reg, vehicleType: v.type, company: company.name,
      duration, sendVia, recipient,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "540px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F517}"} Generate Magic Link</h2>
              <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>
                Step {step} of 3 {"\u2014"} {step === 1 ? "Select Vehicle" : step === 2 ? "Set Duration" : "Send Link"}
              </p>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8",
            }}>{"\u2715"}</button>
          </div>
          {/* Progress */}
          <div style={{ display: "flex", gap: "4px", marginTop: "16px" }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                flex: 1, height: "4px", borderRadius: "2px",
                background: s <= step ? "linear-gradient(90deg, #2563EB, #3B82F6)" : "#E2E8F0",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {/* Step 1: Select Vehicle */}
          {step === 1 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>Select Company</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {COMPANIES.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCompany(c.id); setSelectedVehicle(null); }} style={{
                    padding: "12px 16px", borderRadius: "12px", border: `2px solid ${selectedCompany === c.id ? "#2563EB" : "#E5E7EB"}`,
                    background: selectedCompany === c.id ? "#EFF6FF" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                  }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{c.name}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{c.vehicles.length} vehicles</div>
                  </button>
                ))}
              </div>

              {company && (
                <>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>Select Vehicle</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {company.vehicles.map(v => (
                      <button key={v.id} onClick={() => setSelectedVehicle(v.id)} style={{
                        padding: "12px 16px", borderRadius: "12px", border: `2px solid ${selectedVehicle === v.id ? "#2563EB" : "#E5E7EB"}`,
                        background: selectedVehicle === v.id ? "#EFF6FF" : "#FFFFFF", cursor: "pointer", textAlign: "left",
                        display: "flex", alignItems: "center", gap: "12px", transition: "all 0.15s ease",
                      }}>
                        <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{v.reg}</div>
                          <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model} {"\u00B7"} {v.type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>Link Expiry Duration</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                {DURATION_OPTIONS.map(d => (
                  <button key={d.value} onClick={() => setDuration(d.value)} style={{
                    padding: "14px 16px", borderRadius: "12px", border: `2px solid ${duration === d.value ? "#2563EB" : "#E5E7EB"}`,
                    background: duration === d.value ? "#EFF6FF" : "#FFFFFF", cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: duration === d.value ? "#2563EB" : "#111827" }}>{d.label}</div>
                  </button>
                ))}
              </div>

              <div style={{
                padding: "14px 18px", borderRadius: "12px",
                background: "#FFFBEB", border: "1px solid #FDE68A",
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <span style={{ fontSize: "16px" }}>{"\u{1F4A1}"}</span>
                <div style={{ fontSize: "12px", color: "#92400E", lineHeight: 1.5 }}>
                  <strong>Recommendation:</strong> Use 24h for daily checks. The link auto-expires {"\u2014"} no need to revoke manually.
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Send */}
          {step === 3 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>How to share?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                {SEND_VIA.map(s => (
                  <button key={s.value} onClick={() => setSendVia(s.value)} style={{
                    padding: "14px 16px", borderRadius: "12px", border: `2px solid ${sendVia === s.value ? "#2563EB" : "#E5E7EB"}`,
                    background: sendVia === s.value ? "#EFF6FF" : "#FFFFFF", cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "20px", marginBottom: "4px" }}>{s.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: sendVia === s.value ? "#2563EB" : "#374151" }}>{s.label}</div>
                  </button>
                ))}
              </div>

              {sendVia !== "copy" && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                    {sendVia === "email" ? "Driver Email" : "Driver Phone Number"}
                  </label>
                  <input
                    type="text"
                    placeholder={sendVia === "email" ? "e.g. mark@hargreaves-haulage.co.uk" : "e.g. 07700 900123"}
                    value={recipient} onChange={e => setRecipient(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB",
                      borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
                    }}
                  />
                </div>
              )}

              {/* Preview */}
              <div style={{
                marginTop: "16px", padding: "16px 18px", borderRadius: "12px",
                background: "#F8FAFC", border: "1px solid #E5E7EB",
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Link Preview</div>
                <div style={{
                  padding: "10px 14px", borderRadius: "8px", background: "#FFFFFF", border: "1px solid #E5E7EB",
                  fontFamily: "monospace", fontSize: "12px", color: "#2563EB", wordBreak: "break-all",
                }}>
                  {BASE_URL}/ml-{selectedCompany?.slice(1)}-{Date.now().toString(36)}
                </div>
                <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "6px" }}>
                  Expires in {DURATION_OPTIONS.find(d => d.value === duration)?.label}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC",
          display: "flex", justifyContent: "space-between",
        }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} style={{
              padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px",
              background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer",
            }}>{"\u2190"} Back</button>
          ) : (
            <button onClick={onClose} style={{
              padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px",
              background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer",
            }}>Cancel</button>
          )}

          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedVehicle} style={{
              padding: "10px 24px", border: "none", borderRadius: "10px",
              background: (step === 1 && !selectedVehicle) ? "#E5E7EB" : "linear-gradient(135deg, #0F172A, #1E293B)",
              color: (step === 1 && !selectedVehicle) ? "#94A3B8" : "white",
              fontSize: "13px", fontWeight: 700, cursor: (step === 1 && !selectedVehicle) ? "not-allowed" : "pointer",
            }}>Next {"\u2192"}</button>
          ) : (
            <button onClick={() => { handleCreate(); onClose(); }} style={{
              padding: "10px 24px", border: "none", borderRadius: "10px",
              background: "linear-gradient(135deg, #059669, #10B981)", color: "white",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}>{"\u{1F517}"} Generate & Send</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function ComplyFleetMagicLinks() {
  const [showCreate, setShowCreate] = useState(false);
  const [links, setLinks] = useState(EXISTING_LINKS);
  const [filter, setFilter] = useState("all");

  const handleCreate = (data) => {
    const newLink = {
      id: `ML-${String(links.length + 1).padStart(3, "0")}`,
      vehicleReg: data.vehicleReg, vehicleType: data.vehicleType,
      company: data.company, token: `ml-new-${Date.now().toString(36)}`,
      createdAt: TODAY.toISOString(),
      expiresAt: new Date(TODAY.getTime() + data.duration * 60 * 60 * 1000).toISOString(),
      status: "active", sentTo: data.recipient || "Copied to clipboard",
      sentVia: data.sendVia, usedCount: 0,
    };
    setLinks([newLink, ...links]);
  };

  const handleRevoke = (id) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status: "revoked" } : l));
  };

  const filtered = links.filter(l => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const activeCount = links.filter(l => l.status === "active").length;
  const expiredCount = links.filter(l => l.status === "expired").length;

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
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}><span style={{ fontSize: "18px" }}>{"\u{1F514}"}</span></div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "13px",
          }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {"\u{1F517}"} Magic Links
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            Generate time-limited walkaround check links for drivers {"\u2014"} backup for QR codes
          </p>
        </div>

        {/* Info banner */}
        <div style={{
          padding: "18px 22px", borderRadius: "16px",
          background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "1px solid #BFDBFE",
          marginBottom: "24px", display: "flex", alignItems: "flex-start", gap: "14px",
        }}>
          <span style={{ fontSize: "24px" }}>{"\u{1F4A1}"}</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E40AF" }}>When to use Magic Links</div>
            <div style={{ fontSize: "13px", color: "#2563EB", marginTop: "4px", lineHeight: 1.5 }}>
              QR codes in the cab are the primary method. Use magic links when: a new vehicle hasn't got its QR printed yet,
              the QR sticker is damaged, or a driver needs temporary access from a different device.
              Links auto-expire {"\u2014"} no security risk.
            </div>
          </div>
        </div>

        {/* Header Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { key: "all", label: `All (${links.length})` },
              { key: "active", label: `Active (${activeCount})` },
              { key: "expired", label: `Expired (${expiredCount})` },
              { key: "revoked", label: "Revoked" },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: filter === f.key ? "#0F172A" : "#F1F5F9",
                color: filter === f.key ? "white" : "#64748B",
                fontSize: "12px", fontWeight: 700,
              }}>{f.label}</button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "10px 20px", border: "none", borderRadius: "12px",
            background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
            fontSize: "13px", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
          }}>{"\u2795"} New Magic Link</button>
        </div>

        {/* Links List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(link => {
            const stat = STATUS_CONFIG[link.status];
            const hoursLeft = getHoursLeft(link.expiresAt);
            const viaIcons = { sms: "\u{1F4F1}", whatsapp: "\u{1F4AC}", email: "\u{1F4E7}", copy: "\u{1F4CB}" };

            return (
              <div key={link.id} style={{
                background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5E7EB",
                overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                opacity: link.status === "expired" || link.status === "revoked" ? 0.7 : 1,
              }}>
                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Vehicle icon */}
                  <div style={{
                    width: "48px", height: "48px", borderRadius: "12px",
                    background: link.status === "active" ? "#EFF6FF" : "#F3F4F6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "22px", flexShrink: 0,
                  }}>{TYPES[link.vehicleType] || "\u{1F69B}"}</div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#111827", fontFamily: "monospace" }}>{link.vehicleReg}</span>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        padding: "2px 8px", borderRadius: "20px",
                        background: stat.bg, border: `1px solid ${stat.border}`,
                        fontSize: "10px", fontWeight: 700, color: stat.text,
                        letterSpacing: "0.05em",
                      }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: stat.dot }} />
                        {stat.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6B7280", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <span>{"\u{1F3E2}"} {link.company}</span>
                      <span>{viaIcons[link.sentVia]} Sent to {link.sentTo}</span>
                      <span>{"\u{1F4CA}"} Used {link.usedCount}x</span>
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Created {formatDate(link.createdAt)} {formatTime(link.createdAt)}</div>
                    {link.status === "active" ? (
                      <div style={{ fontSize: "12px", fontWeight: 700, color: hoursLeft <= 6 ? "#D97706" : "#059669", marginTop: "2px" }}>
                        {"\u23F3"} {hoursLeft}h remaining
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                        {link.status === "expired" ? "Auto-expired" : "Manually revoked"}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {link.status === "active" && (
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button style={{
                        padding: "8px 12px", borderRadius: "8px", border: "1px solid #E5E7EB",
                        background: "#FFFFFF", fontSize: "12px", fontWeight: 600, color: "#374151", cursor: "pointer",
                      }}>{"\u{1F4CB}"} Copy</button>
                      <button onClick={() => handleRevoke(link.id)} style={{
                        padding: "8px 12px", borderRadius: "8px", border: "1px solid #FECACA",
                        background: "#FEF2F2", fontSize: "12px", fontWeight: 600, color: "#DC2626", cursor: "pointer",
                      }}>{"\u{1F6AB}"} Revoke</button>
                    </div>
                  )}
                </div>

                {/* Link URL bar */}
                {link.status === "active" && (
                  <div style={{
                    padding: "10px 24px", background: "#F8FAFC", borderTop: "1px solid #F3F4F6",
                    fontFamily: "monospace", fontSize: "11px", color: "#2563EB",
                  }}>
                    {BASE_URL}/{link.token}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8", fontSize: "14px" }}>
              No magic links match this filter
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

      {showCreate && <CreateLinkModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
