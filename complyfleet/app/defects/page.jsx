"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ConfirmDialog, Toast } from "../../components/ConfirmDialog";

const TODAY = new Date("2026-02-16");
function getDaysAgo(d) { return Math.floor((TODAY - new Date(d)) / 86400000); }
function formatDate(d) { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

const SEVERITY = {
  dangerous: { label: "DANGEROUS", bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", dot: "#EF4444" },
  major: { label: "MAJOR", bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", dot: "#F97316" },
  minor: { label: "MINOR", bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", dot: "#F59E0B" },
};
const STATUS = {
  open: { label: "OPEN", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444", icon: "\u{1F534}" },
  in_progress: { label: "IN PROGRESS", bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", dot: "#3B82F6", icon: "\u{1F527}" },
  resolved: { label: "RESOLVED", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981", icon: "\u2705" },
  closed: { label: "CLOSED", bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF", icon: "\u{1F512}" },
};
const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };

const MOCK_DEFECTS = [
  { id: "d1", vehicle_reg: "BD63 XYZ", vehicle_type: "HGV", company_name: "Hargreaves Haulage Ltd", category: "Brakes", description: "Nearside brake pad worn below limit", severity: "dangerous", status: "open", reported_by: "Mark Thompson", reported_date: "2026-02-15", assigned_to: null, notes: [] },
  { id: "d2", vehicle_reg: "GH45 IJK", vehicle_type: "HGV", company_name: "Yorkshire Fleet Services", category: "MOT", description: "MOT expired \u2014 vehicle must not be used", severity: "dangerous", status: "in_progress", reported_by: "Steve Williams", reported_date: "2026-02-13", assigned_to: "Gary Firth", notes: [
    { author: "James Henderson", text: "Vehicle off road. MOT booked 17 Feb.", created_at: "2026-02-13" },
    { author: "Gary Firth", text: "Pre-MOT check done.", created_at: "2026-02-14" },
  ]},
  { id: "d3", vehicle_reg: "LM67 OPQ", vehicle_type: "HGV", company_name: "Yorkshire Fleet Services", category: "Lights", description: "Offside indicator intermittent", severity: "minor", status: "open", reported_by: "Steve Williams", reported_date: "2026-02-14", assigned_to: null, notes: [] },
  { id: "d4", vehicle_reg: "KL19 ABC", vehicle_type: "HGV", company_name: "Hargreaves Haulage Ltd", category: "Tyres & Wheels", description: "Offside rear outer tyre \u2014 cut in sidewall 25mm", severity: "major", status: "resolved", reported_by: "Alan Davies", reported_date: "2026-02-10", assigned_to: "Dave Pearson", resolved_by: "James Henderson", resolved_date: "2026-02-11", notes: [
    { author: "Dave Pearson", text: "Replacement tyre fitted.", created_at: "2026-02-11" },
  ]},
  { id: "d5", vehicle_reg: "FG34 HIJ", vehicle_type: "HGV", company_name: "Northern Express Transport", category: "Exhaust", description: "Exhaust blow from flexi joint", severity: "minor", status: "closed", reported_by: "Peter Clarke", reported_date: "2026-01-28", assigned_to: "Tom Bennett", resolved_by: "James Henderson", resolved_date: "2026-01-29", closed_date: "2026-01-30", notes: [
    { author: "Tom Bennett", text: "Flexi joint replaced.", created_at: "2026-01-29" },
  ]},
];

function Pill({ config }) {
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: config.bg, border: `1px solid ${config.border}`, fontSize: "10px", fontWeight: 700, color: config.text, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: config.dot, flexShrink: 0 }} />{config.label}
  </span>);
}

function StatCard({ icon, value, label, accent }) {
  return (<div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "16px" }}>
    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{icon}</div>
    <div><div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div><div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px" }}>{label}</div></div>
  </div>);
}

function AddDefectModal({ onSave, onClose }) {
  const [form, setForm] = useState({ vehicle_reg: "", vehicle_type: "HGV", company_name: "", category: "", description: "", severity: "minor", reported_by: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const cats = ["Lights", "Tyres & Wheels", "Brakes", "Mirrors & Glass", "Body & Security", "Fluid Levels", "Safety Equipment", "Exhaust & Emissions", "MOT", "Other"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "520px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u2795"} Report Defect</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Vehicle Reg *</label>
              <input value={form.vehicle_reg} onChange={e => set("vehicle_reg", e.target.value)} placeholder="BD63 XYZ" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} /></div>
            <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Company</label>
              <input value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Hargreaves Haulage" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} /></div>
          </div>
          <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Category *</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", background: "#FAFAFA", fontFamily: "inherit" }}>
              <option value="">Select category...</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the defect..." rows={3} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit", resize: "vertical" }} /></div>
          <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Severity *</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {Object.entries(SEVERITY).map(([k, v]) => (
                <button key={k} onClick={() => set("severity", k)} style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `2px solid ${form.severity === k ? v.dot : "#E5E7EB"}`, background: form.severity === k ? v.bg : "#FFF", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: form.severity === k ? v.text : "#6B7280" }}>{v.label}</div>
                </button>
              ))}
            </div></div>
          <div><label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Reported By</label>
            <input value={form.reported_by} onChange={e => set("reported_by", e.target.value)} placeholder="Driver name" style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} /></div>
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving || !form.vehicle_reg || !form.description || !form.category} style={{
            padding: "10px 24px", border: "none", borderRadius: "10px",
            background: (!form.vehicle_reg || !form.description || !form.category) ? "#E5E7EB" : "linear-gradient(135deg, #DC2626, #EF4444)",
            color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
          }}>{saving ? "Saving..." : "\u26A0\uFE0F Report Defect"}</button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ defectId, onSave, onClose }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "440px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{"\u{1F4DD}"} Add Note</h2>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What action was taken?" rows={4} style={{ width: "100%", padding: "12px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit", resize: "vertical" }} />
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(defectId, text); setSaving(false); }} disabled={saving || !text.trim()} style={{
            padding: "10px 24px", border: "none", borderRadius: "10px", background: text.trim() ? "#0F172A" : "#E5E7EB",
            color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer",
          }}>{saving ? "Saving..." : "Add Note"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ComplyFleetDefects() {
  const [defects, setDefects] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showNote, setShowNote] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const flash = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    if (isSupabaseReady()) {
      const { data: defs } = await supabase.from("defects").select("*").order("reported_date", { ascending: false });
      if (defs) {
        for (let d of defs) {
          const { data: notes } = await supabase.from("defect_notes").select("*").eq("defect_id", d.id).order("created_at");
          d.notes = notes || [];
        }
      }
      setDefects(defs || []);
    } else {
      setDefects(MOCK_DEFECTS);
    }
    setLoading(false);
  }

  async function addDefect(form) {
    const newDef = { ...form, status: "open", reported_date: new Date().toISOString().split("T")[0] };
    if (isSupabaseReady()) {
      await supabase.from("defects").insert(newDef);
      await loadData();
    } else {
      setDefects(prev => [{ ...newDef, id: "d" + Date.now(), notes: [] }, ...prev]);
    }
    flash("Defect reported"); setShowAdd(false);
  }

  async function changeStatus(id, newStatus) {
    const updates = { status: newStatus };
    if (newStatus === "resolved") { updates.resolved_date = new Date().toISOString().split("T")[0]; updates.resolved_by = "James Henderson"; }
    if (newStatus === "closed") { updates.closed_date = new Date().toISOString().split("T")[0]; }

    if (isSupabaseReady()) {
      await supabase.from("defects").update(updates).eq("id", id);
      await loadData();
    } else {
      setDefects(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }
    const labels = { in_progress: "Defect assigned", resolved: "Defect resolved", closed: "Defect closed" };
    flash(labels[newStatus] || "Status updated"); setConfirm(null); setSelected(null);
  }

  async function addNote(defectId, text) {
    const note = { author: "James Henderson", text, created_at: new Date().toISOString().split("T")[0] };
    if (isSupabaseReady()) {
      await supabase.from("defect_notes").insert({ defect_id: defectId, ...note });
      await loadData();
    } else {
      setDefects(prev => prev.map(d => d.id === defectId ? { ...d, notes: [...(d.notes || []), note] } : d));
    }
    flash("Note added"); setShowNote(null);
  }

  const filtered = defects.filter(d => {
    if (filter !== "all" && d.status !== filter) return false;
    if (sevFilter !== "all" && d.severity !== sevFilter) return false;
    if (search) { const q = search.toLowerCase(); return d.description.toLowerCase().includes(q) || d.vehicle_reg.toLowerCase().includes(q) || (d.company_name || "").toLowerCase().includes(q) || d.category.toLowerCase().includes(q); }
    return true;
  });

  const counts = { all: defects.length, open: defects.filter(d => d.status === "open").length, in_progress: defects.filter(d => d.status === "in_progress").length, resolved: defects.filter(d => d.status === "resolved").length, closed: defects.filter(d => d.status === "closed").length };
  const dangerousOpen = defects.filter(d => d.severity === "dangerous" && (d.status === "open" || d.status === "in_progress")).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus, textarea:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

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
          <div><h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u26A0\uFE0F"} Defect Management</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>Track, assign and resolve defects. Defects cannot be deleted {"\u2014"} only closed.</p></div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => {
              const win = window.open("", "_blank");
              win.document.write(`<!DOCTYPE html><html><head><title>ComplyFleet - Defects Report</title><style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
                body { font-family: 'DM Sans', sans-serif; padding: 30px; max-width: 900px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0F172A; padding-bottom: 12px; margin-bottom: 20px; }
                .logo { font-size: 18px; font-weight: 800; } .logo span { color: #2563EB; }
                table { width: 100%; border-collapse: collapse; } th { background: #0F172A; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                td { padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
                .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94A3B8; border-top: 1px solid #E5E7EB; padding-top: 12px; }
                @media print { body { padding: 15px; } }
              </style></head><body>
              <div class="header"><div><div class="logo">\u{1F69B} Comply<span>Fleet</span></div><div style="font-size:12px;color:#6B7280">Defects Report</div></div>
              <div style="text-align:right;font-size:12px;color:#6B7280">Generated: ${new Date().toLocaleDateString("en-GB")}<br>${filtered.length} defects</div></div>
              <table><thead><tr><th>Vehicle</th><th>Company</th><th>Description</th><th>Category</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead><tbody>
              ${filtered.map(d => `<tr><td style="font-family:monospace;font-weight:700">${d.vehicle_reg||""}</td><td>${d.company_name||""}</td><td>${d.description||""}</td><td>${d.category||""}</td><td style="font-weight:700">${(d.severity||"").toUpperCase()}</td><td>${(d.status||"").replace("_"," ").toUpperCase()}</td><td>${d.reported_date ? new Date(d.reported_date).toLocaleDateString("en-GB") : ""}</td></tr>`).join("")}
              </tbody></table><div class="footer">ComplyFleet \u00B7 complyfleet.vercel.app</div></body></html>`);
              win.document.close(); setTimeout(() => win.print(), 500);
            }} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "12px", background: "#FFF", fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>{"\u{1F5A8}\uFE0F"} Export</button>
            <button onClick={() => setShowAdd(true)} style={{ padding: "10px 20px", border: "none", borderRadius: "12px", background: "linear-gradient(135deg, #DC2626, #EF4444)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>{"\u2795"} Report Defect</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <StatCard icon={"\u{1F534}"} value={counts.open} label="Open" accent="#DC2626" />
          <StatCard icon={"\u{1F527}"} value={counts.in_progress} label="In Progress" accent="#2563EB" />
          <StatCard icon={"\u2705"} value={counts.resolved} label="Resolved" accent="#059669" />
          <StatCard icon={"\u{1F512}"} value={counts.closed} label="Closed" accent="#64748B" />
        </div>

        {dangerousOpen > 0 && (<div style={{ padding: "16px 20px", borderRadius: "16px", background: "#FEF2F2", border: "2px solid #FECACA", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>{"\u{1F6A8}"}</span>
          <div><div style={{ fontSize: "14px", fontWeight: 800, color: "#991B1B" }}>{dangerousOpen} dangerous defect{dangerousOpen > 1 ? "s" : ""} require immediate action</div>
            <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "2px" }}>Vehicles must not be used on public roads</div></div>
        </div>)}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          {[{ key: "all", label: "All" }, { key: "open", label: "Open" }, { key: "in_progress", label: "In Progress" }, { key: "resolved", label: "Resolved" }, { key: "closed", label: "Closed" }].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", background: filter === f.key ? "#0F172A" : "#F1F5F9", color: filter === f.key ? "white" : "#64748B", fontSize: "12px", fontWeight: 700 }}>
              {f.label} <span style={{ opacity: 0.6, marginLeft: "4px" }}>{counts[f.key]}</span></button>))}
          <div style={{ width: "1px", height: "24px", background: "#E5E7EB" }} />
          {["all", "dangerous", "major", "minor"].map(s => (
            <button key={s} onClick={() => setSevFilter(s)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid", borderColor: sevFilter === s ? (SEVERITY[s]?.dot || "#0F172A") : "#E5E7EB", background: sevFilter === s ? (SEVERITY[s]?.bg || "#0F172A") : "#FFF", color: sevFilter === s ? (SEVERITY[s]?.text || "white") : "#6B7280", fontSize: "11px", fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
              {s === "all" ? "All Sev." : s}</button>))}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{"\u{1F50D}"}</span>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "13px", width: "200px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading ? <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading...</div> :
          filtered.length === 0 ? <div style={{ textAlign: "center", padding: "48px", color: "#94A3B8", fontSize: "14px" }}>No defects match filters</div> :
          filtered.map(d => {
            const sev = SEVERITY[d.severity]; const stat = STATUS[d.status]; const days = getDaysAgo(d.reported_date);
            return (
              <div key={d.id} onClick={() => setSelected(d)} style={{ background: "#FFFFFF", borderRadius: "16px", border: `1px solid ${d.severity === "dangerous" && d.status !== "closed" ? sev.border : "#E5E7EB"}`, overflow: "hidden", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s ease" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = ""; }}>
                <div style={{ height: "3px", background: sev.dot }} />
                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: stat.bg, border: `1px solid ${stat.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{stat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}><Pill config={sev} /><Pill config={stat} /></div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</h3>
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <span>{TYPES[d.vehicle_type]} {d.vehicle_reg}</span><span>{"\u{1F3E2}"} {d.company_name}</span><span>{"\u{1F3F7}\uFE0F"} {d.category}</span></div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(d.reported_date)}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: days > 3 && d.status === "open" ? "#DC2626" : "#6B7280", marginTop: "2px" }}>{d.status === "closed" ? "Closed" : `${days}d open`}</div>
                    {d.assigned_to && <div style={{ fontSize: "11px", color: "#2563EB", marginTop: "4px", fontWeight: 600 }}>{"\u{1F527}"} {d.assigned_to}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Defect Detail Drawer */}
      {selected && (() => {
        const d = defects.find(x => x.id === selected.id) || selected;
        const sev = SEVERITY[d.severity]; const stat = STATUS[d.status];
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={() => setSelected(null)}>
            <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "680px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ height: "4px", background: sev.dot }} />
              <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}><Pill config={stat} /><Pill config={sev} /></div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{d.description}</h2></div>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
                </div>
              </div>
              <div style={{ padding: "24px 28px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                  {[{ l: "Vehicle", v: d.vehicle_reg, i: TYPES[d.vehicle_type] }, { l: "Company", v: (d.company_name || "").split(" ").slice(0, 2).join(" "), i: "\u{1F3E2}" }, { l: "Reported", v: formatDate(d.reported_date), i: "\u{1F4C5}" }, { l: "Category", v: d.category, i: "\u{1F3F7}\uFE0F" }, { l: "Reported By", v: d.reported_by || "\u2014", i: "\u{1F464}" }, { l: "Assigned To", v: d.assigned_to || "Unassigned", i: "\u{1F527}" }].map(f => (
                    <div key={f.l} style={{ padding: "10px 12px", borderRadius: "10px", background: "#F8FAFC" }}>
                      <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase" }}>{f.i} {f.l}</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: f.v === "Unassigned" ? "#DC2626" : "#111827", marginTop: "2px" }}>{f.v}</div></div>))}
                </div>
                {d.notes && d.notes.length > 0 && (<div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "10px" }}>{"\u{1F4DD}"} Timeline ({d.notes.length})</h3>
                  {d.notes.map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #1E40AF, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "10px", flexShrink: 0 }}>{n.author.split(" ").map(x => x[0]).join("")}</div>
                      <div style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{n.author}</span><span style={{ fontSize: "11px", color: "#94A3B8" }}>{formatDate(n.created_at)}</span></div>
                        <p style={{ fontSize: "13px", color: "#374151", margin: "4px 0 0", lineHeight: 1.5 }}>{n.text}</p></div>
                    </div>))}
                </div>)}
                {d.resolved_date && (<div style={{ padding: "14px 18px", borderRadius: "12px", background: "#ECFDF5", border: "1px solid #A7F3D0", marginBottom: "20px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#065F46" }}>{"\u2705"} Resolved by {d.resolved_by} on {formatDate(d.resolved_date)}</span></div>)}

                {/* NO DELETE — only status transitions */}
                <div style={{ padding: "16px 0 0", borderTop: "1px solid #F3F4F6", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => setShowNote(d.id)} style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#FFF", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>{"\u{1F4DD}"} Add Note</button>
                  {d.status === "open" && <button onClick={() => setConfirm({ title: "Assign & Start Work?", message: "This will move the defect to 'In Progress'.", icon: "\u{1F527}", confirmLabel: "Start Work", confirmColor: "#2563EB", onConfirm: () => changeStatus(d.id, "in_progress") })} style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F527}"} Assign & Start</button>}
                  {d.status === "in_progress" && <button onClick={() => setConfirm({ title: "Mark as Resolved?", message: "Confirm the defect has been repaired.", icon: "\u2705", confirmLabel: "Resolve", confirmColor: "#059669", onConfirm: () => changeStatus(d.id, "resolved") })} style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #059669, #10B981)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u2705"} Mark Resolved</button>}
                  {d.status === "resolved" && <button onClick={() => setConfirm({ title: "Close Defect?", message: "This is final. Closed defects cannot be reopened.", icon: "\u{1F512}", confirmLabel: "Close Defect", confirmColor: "#374151", onConfirm: () => changeStatus(d.id, "closed") })} style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>{"\u{1F512}"} Close Defect</button>}
                  {d.status === "closed" && <div style={{ padding: "10px 16px", borderRadius: "10px", background: "#F3F4F6", fontSize: "12px", fontWeight: 700, color: "#6B7280" }}>{"\u{1F512}"} This defect is closed and cannot be reopened or deleted</div>}
                </div>
              </div>
            </div>
          </div>);
      })()}

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>

      {showAdd && <AddDefectModal onSave={addDefect} onClose={() => setShowAdd(false)} />}
      {showNote && <AddNoteModal defectId={showNote} onSave={addNote} onClose={() => setShowNote(null)} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
