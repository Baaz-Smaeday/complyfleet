"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

const TODAY = new Date();
function daysUntilDue(d, rule = 28) { if (!d) return null; return rule - Math.floor((TODAY - new Date(d)) / 86400000); }
function formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function formatDateInput(d) { if (!d) return new Date().toISOString().split("T")[0]; return new Date(d).toISOString().split("T")[0]; }
function addDays(d, n) { return new Date(new Date(d).getTime() + n * 86400000); }

function getStatus(lastDownload, rule = 28) {
  if (!lastDownload) return "never";
  const days = daysUntilDue(lastDownload, rule);
  if (days < 0) return "overdue";
  if (days <= 7) return "due-soon";
  return "ok";
}

const STATUS_CONFIG = {
  never:      { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444", label: "NEVER DOWNLOADED", glow: "220,38,38" },
  overdue:    { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444", label: "OVERDUE",           glow: "220,38,38" },
  "due-soon": { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B", label: "DUE SOON",          glow: "245,158,11" },
  ok:         { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", dot: "#10B981", label: "OK",                glow: "16,185,129" },
};

// ── Countdown bar ─────────────────────────────────────────────────────────────
function CountdownBar({ lastDownload, rule = 28 }) {
  const status = getStatus(lastDownload, rule);
  const cfg = STATUS_CONFIG[status];
  const days = lastDownload ? daysUntilDue(lastDownload, rule) : null;
  const pct = lastDownload ? Math.max(0, Math.min(100, (days / rule) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: cfg.text }}>
          {status === "never" ? "No download recorded" :
           status === "overdue" ? `${Math.abs(days)} days overdue` :
           `${days} days remaining`}
        </span>
        <span style={{ fontSize: "10px", color: "#94A3B8" }}>{rule} day rule</span>
      </div>
      <div style={{ height: "6px", background: "#F1F5F9", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "3px", width: status === "never" ? "100%" : `${100 - pct}%`, background: status === "ok" ? "#10B981" : status === "due-soon" ? "#F59E0B" : "#EF4444", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Generic compliance card ───────────────────────────────────────────────────
function ComplianceCard({ name, subtitle, lastDownload, rule, statusIcon, onLog, onHistory, animDelay }) {
  const [hovered, setHovered] = useState(false);
  const status = getStatus(lastDownload, rule);
  const cfg = STATUS_CONFIG[status];

  return (
    <div style={{ position: "relative", borderRadius: "16px", animation: `fadeUp 0.4s ease ${animDelay}ms both` }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "absolute", inset: "-2px", borderRadius: "18px", background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${cfg.glow},0.8) 20%, transparent 50%, rgba(${cfg.glow},0.4) 80%, transparent 100%)` : "transparent", animation: hovered ? "spin 2s linear infinite" : "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, background: "#FFF", borderRadius: "14px", borderLeft: `4px solid ${cfg.dot}`, padding: "18px 20px", transform: hovered ? "translateY(-2px)" : "none", boxShadow: hovered ? `0 12px 32px rgba(${cfg.glow},0.15)` : "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
            {statusIcon || (status === "ok" ? "✅" : status === "due-soon" ? "⏰" : "🚨")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "15px", color: "#0F172A" }}>{name}</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{subtitle}</div>
          </div>
          <span style={{ padding: "4px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
          </span>
        </div>
        <CountdownBar lastDownload={lastDownload} rule={rule} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: "12px", color: "#64748B" }}>Last: <strong style={{ color: "#0F172A" }}>{formatDate(lastDownload)}</strong>{lastDownload && <span style={{ color: "#94A3B8" }}> · Next: {formatDate(addDays(lastDownload, rule))}</span>}</div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={onHistory} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: "11px", fontWeight: 700, color: "#64748B", cursor: "pointer" }}>📋 History</button>
            <button onClick={onLog} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: `linear-gradient(135deg, rgba(${cfg.glow},1), rgba(${cfg.glow},0.8))`, fontSize: "11px", fontWeight: 700, color: "white", cursor: "pointer" }}>+ Log Download</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Log Download Modal ────────────────────────────────────────────────────────
function LogDownloadModal({ item, type, rule, onClose, onSave }) {
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [software, setSoftware] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    await onSave({ item, date, software, notes });
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>📥 Log {type === "driver" ? "Driver Card" : "Vehicle Unit"} Download</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>{item.name} {item.company_name ? `— ${item.company_name}` : ""}</div>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Download Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Software Used (optional)</label>
            <input type="text" value={software} onChange={e => setSoftware(e.target.value)} placeholder="e.g. Tachomaster, Optac, TachyOnline..." style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", resize: "vertical" }} />
          </div>
          <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: "12px", color: "#1E40AF" }}>
            ℹ️ Next download due: <strong>{formatDate(addDays(date, rule))}</strong> ({rule} day rule)
          </div>
        </div>
        <div style={{ padding: "18px 26px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!date || saving} style={{ padding: "10px 22px", border: "none", borderRadius: "10px", background: date ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: date ? "pointer" : "not-allowed" }}>{saving ? "Saving..." : "Save Download"}</button>
        </div>
      </div>
    </div>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ item, type, onClose }) {
  const downloads = item.downloads || [];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>📋 Download History</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>{item.name} {item.company_name ? `— ${item.company_name}` : ""}</div>
        </div>
        <div style={{ padding: "16px 26px", overflowY: "auto", flex: 1 }}>
          {downloads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>📭</div>
              <div style={{ fontWeight: 600, fontSize: "13px" }}>No downloads recorded yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {downloads.sort((a, b) => new Date(b.download_date) - new Date(a.download_date)).map((d, i) => (
                <div key={i} style={{ padding: "14px 16px", borderRadius: "12px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{formatDate(d.download_date)}</div>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#D1FAE5", fontSize: "10px", fontWeight: 700, color: "#065F46" }}>✓ RECORDED</span>
                  </div>
                  {d.software && <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Software: {d.software}</div>}
                  {d.notes && <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Notes: {d.notes}</div>}
                  <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>Logged by: {d.logged_by || "Transport Manager"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "16px 26px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Driver Modal ──────────────────────────────────────────────────────────
function AddDriverModal({ companies, onClose, onSave }) {
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !companyId) return;
    setSaving(true);
    await onSave({ name: name.trim(), company_id: companyId, licence_number: licenceNumber.trim() });
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "#0F172A" }}>👤 Add Driver</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Track their 28-day card download compliance</div>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Driver Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. James Henderson" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Company *</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", background: "#FFF" }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Driver Licence Number (optional)</label>
            <input type="text" value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)} placeholder="e.g. HENDE123456JA9AB" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ padding: "18px 26px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} style={{ padding: "10px 22px", border: "none", borderRadius: "10px", background: name.trim() ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "#E5E7EB", color: "white", fontSize: "13px", fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed" }}>{saving ? "Adding..." : "Add Driver"}</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function TachoPage() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("drivers");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logItem, setLogItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      }
      const nullId = ["00000000-0000-0000-0000-000000000000"];
      const ids = companyIds?.length > 0 ? companyIds : nullId;

      let cQ = supabase.from("companies").select("id, name").is("archived_at", null).order("name");
      let dQ = supabase.from("drivers").select("*, tacho_downloads(*)").is("archived_at", null).order("name");
      let vQ = supabase.from("vehicles").select("*, vehicle_unit_downloads(*)").is("archived_at", null).order("reg");
      if (companyIds) { cQ = cQ.in("id", ids); dQ = dQ.in("company_id", ids); vQ = vQ.in("company_id", ids); }

      const [{ data: cos }, { data: drvs }, { data: vehs }] = await Promise.all([cQ, dQ, vQ]);
      setCompanies(cos || []);

      const cMap = {};
      (cos || []).forEach(c => { cMap[c.id] = c.name; });

      if (drvs) {
        setDrivers(drvs.map(d => ({
          ...d,
          company_name: cMap[d.company_id] || "Unknown",
          downloads: d.tacho_downloads || [],
          last_download: (d.tacho_downloads || []).sort((a, b) => new Date(b.download_date) - new Date(a.download_date))[0]?.download_date || null,
        })));
      }
      if (vehs) {
        setVehicles(vehs.map(v => ({
          ...v,
          company_name: cMap[v.company_id] || "Unknown",
          downloads: v.vehicle_unit_downloads || [],
          last_download: (v.vehicle_unit_downloads || []).sort((a, b) => new Date(b.download_date) - new Date(a.download_date))[0]?.download_date || null,
        })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleAddDriver({ name, company_id, licence_number }) {
    await supabase.from("drivers").insert({ name, company_id, licence_number: licence_number || null });
    loadData(profile);
  }

  async function handleLogDownload({ item, date, software, notes }) {
    const { data: { session } } = await supabase.auth.getSession();
    const loggedBy = profile?.full_name || session?.user?.email || "TM";
    if (activeTab === "drivers") {
      await supabase.from("tacho_downloads").insert({ driver_id: item.id, company_id: item.company_id, download_date: date, software: software || null, notes: notes || null, logged_by: loggedBy });
    } else {
      await supabase.from("vehicle_unit_downloads").insert({ vehicle_id: item.id, company_id: item.company_id, download_date: date, software: software || null, notes: notes || null, logged_by: loggedBy });
    }
    loadData(profile);
  }

  function handlePrintReport() {
    const items = activeTab === "drivers" ? getFiltered(drivers) : getFiltered(vehicles);
    const rule = activeTab === "drivers" ? 28 : 90;
    const title = activeTab === "drivers" ? "Driver Tachograph Card Downloads" : "Vehicle Unit Downloads";
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #0F172A; max-width: 900px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0F172A; padding-bottom: 16px; margin-bottom: 20px; }
      .logo { font-size: 18px; font-weight: 800; } .logo span { color: #2563EB; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0F172A; color: white; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; }
      td { padding: 10px 14px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
      tr.overdue td, tr.never td { background: #FEF2F2; }
      tr.due-soon td { background: #FFFBEB; }
      .badge { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; display: inline-block; }
      .badge-ok { background: #D1FAE5; color: #065F46; }
      .badge-overdue, .badge-never { background: #FEE2E2; color: #991B1B; }
      .badge-due-soon { background: #FEF3C7; color: #92400E; }
      .footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #E5E7EB; font-size: 10px; color: #6B7280; text-align: center; }
    </style></head><body>
    <div class="header">
      <div><div class="logo">🚛 Comply<span>Fleet</span></div><div style="font-size:12px;color:#6B7280;margin-top:4px">${title} — DVSA Compliance Report</div></div>
      <div style="font-size:12px;color:#6B7280">Generated: ${new Date().toLocaleDateString("en-GB")}</div>
    </div>
    <table>
      <thead><tr><th>${activeTab === "drivers" ? "Driver" : "Vehicle"}</th><th>Company</th><th>Last Download</th><th>Next Due</th><th>Status</th><th>Days</th></tr></thead>
      <tbody>
        ${items.map(item => {
          const status = getStatus(item.last_download, rule);
          const days = item.last_download ? daysUntilDue(item.last_download, rule) : null;
          const nextDue = item.last_download ? formatDate(addDays(item.last_download, rule)) : "—";
          const displayName = activeTab === "drivers" ? item.name : item.reg;
          return `<tr class="${status}"><td style="font-weight:700">${displayName}</td><td>${item.company_name}</td><td>${formatDate(item.last_download)}</td><td>${nextDue}</td><td><span class="badge badge-${status}">${STATUS_CONFIG[status].label}</span></td><td style="font-weight:700;color:${status === "ok" ? "#059669" : status === "due-soon" ? "#D97706" : "#DC2626"}">${days === null ? "—" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
    <div class="footer">DVSA Compliant Record · ${rule}-day rule · Generated by ComplyFleet · Cannot be altered</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function getFiltered(list) {
    const rule = activeTab === "drivers" ? 28 : 90;
    return list.filter(item => {
      if (selectedCompany !== "all" && item.company_id !== selectedCompany) return false;
      if (statusFilter !== "all") {
        const s = getStatus(item.last_download, rule);
        if (statusFilter === "overdue" && s !== "overdue" && s !== "never") return false;
        if (statusFilter !== "overdue" && s !== statusFilter) return false;
      }
      return true;
    });
  }

  const rule = activeTab === "drivers" ? 28 : 90;
  const list = activeTab === "drivers" ? drivers : vehicles;
  const filtered = getFiltered(list);
  const overdueCount = list.filter(d => { const s = getStatus(d.last_download, rule); return s === "overdue" || s === "never"; }).length;
  const dueSoonCount = list.filter(d => getStatus(d.last_download, rule) === "due-soon").length;
  const okCount = list.filter(d => getStatus(d.last_download, rule) === "ok").length;
  const initials = (name) => (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
      `}</style>

      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🚛</div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>{profile?.full_name || "User"}</div>
              <div style={{ color: "#64748B", fontSize: "10px", textTransform: "uppercase" }}>{(profile?.role || "").replace("_", " ")}</div>
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "13px", border: "2px solid rgba(255,255,255,0.15)" }}>{initials(profile?.full_name)}</div>
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

        {/* Page title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>🗂️ Tacho Compliance</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Driver cards (28 days) · Vehicle units (90 days) · DVSA legal requirements</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handlePrintReport} style={{ padding: "10px 18px", border: "1px solid #E2E8F0", borderRadius: "12px", background: "#FFF", fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>🖨️ Print Report</button>
            {activeTab === "drivers" && <button onClick={() => setShowAddDriver(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>+ Add Driver</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "#E2E8F0", borderRadius: "14px", padding: "4px", width: "fit-content" }}>
          {[
            { key: "drivers", icon: "👤", label: "Driver Cards", sub: "28 day rule" },
            { key: "vehicles", icon: "🚛", label: "Vehicle Units", sub: "90 day rule" },
          ].map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setStatusFilter("all"); }} style={{
              padding: "10px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: activeTab === tab.key ? "#FFF" : "transparent",
              boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: activeTab === tab.key ? "#0F172A" : "#64748B" }}>{tab.icon} {tab.label}</div>
              <div style={{ fontSize: "10px", color: activeTab === tab.key ? "#2563EB" : "#94A3B8", fontWeight: 600 }}>{tab.sub}</div>
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { icon: activeTab === "drivers" ? "👥" : "🚛", value: list.length, label: activeTab === "drivers" ? "Total Drivers" : "Total Vehicles", color: "#2563EB" },
            { icon: "🚨", value: overdueCount, label: "Overdue / Never", color: "#DC2626" },
            { icon: "⏰", value: dueSoonCount, label: "Due This Week", color: "#D97706" },
            { icon: "✅", value: okCount, label: "Compliant", color: "#059669" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#FFF", borderRadius: "14px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, marginTop: "3px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert */}
        {overdueCount > 0 && (
          <div style={{ padding: "14px 20px", borderRadius: "14px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "22px" }}>🚨</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#991B1B" }}>DVSA compliance risk</div>
              <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px" }}>{overdueCount} {activeTab === "drivers" ? "driver" : "vehicle"}{overdueCount > 1 ? "s" : ""} with overdue or unrecorded {activeTab === "drivers" ? "card" : "unit"} downloads</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: "12px", fontWeight: 600, background: "#FFF", fontFamily: "inherit" }}>
            <option value="all">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {[
            { key: "all", label: "All" },
            { key: "overdue", label: "🚨 Overdue" },
            { key: "due-soon", label: "⏰ Due Soon" },
            { key: "ok", label: "✅ OK" },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: statusFilter === f.key ? "#0F172A" : "#F1F5F9", color: statusFilter === f.key ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>{f.label}</button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#94A3B8" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗂️</div>
            <p style={{ fontWeight: 600 }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#94A3B8" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{activeTab === "drivers" ? "👤" : "🚛"}</div>
            <div style={{ fontWeight: 800, fontSize: "16px", color: "#374151", marginBottom: "8px" }}>
              {activeTab === "drivers" ? "No drivers found" : "No vehicles found"}
            </div>
            <div style={{ fontSize: "13px", marginBottom: "24px" }}>
              {activeTab === "drivers" ? "Add drivers to start tracking their tacho downloads" : "Add vehicles first from the Companies page"}
            </div>
            {activeTab === "drivers" && <button onClick={() => setShowAddDriver(true)} style={{ padding: "12px 24px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>+ Add First Driver</button>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {filtered.map((item, i) => (
              <ComplianceCard
                key={item.id}
                name={activeTab === "drivers" ? item.name : item.reg}
                subtitle={activeTab === "drivers" ? item.company_name : `${item.company_name} · ${item.make || ""} ${item.model || ""}`.trim()}
                lastDownload={item.last_download}
                rule={rule}
                statusIcon={activeTab === "drivers" ? undefined : "🚛"}
                onLog={() => setLogItem(item)}
                onHistory={() => setHistoryItem(item)}
                animDelay={i * 60}
              />
            ))}
          </div>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>
        ComplyFleet v1.0 · DVSA Compliance Platform · © 2026
      </footer>

      {logItem && <LogDownloadModal item={logItem} type={activeTab} rule={rule} onClose={() => setLogItem(null)} onSave={handleLogDownload} />}
      {historyItem && <HistoryModal item={historyItem} type={activeTab} onClose={() => setHistoryItem(null)} />}
      {showAddDriver && <AddDriverModal companies={companies} onClose={() => setShowAddDriver(false)} onSave={handleAddDriver} />}
    </div>
  );
}
