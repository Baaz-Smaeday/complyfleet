"use client";
import { useState, useEffect } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";
import { ConfirmDialog, Toast } from "../../components/ConfirmDialog";
import { ComplianceDonutInline } from "../../components/ComplianceDonut";
import ExportDropdown from "../../components/ExportDropdown";
import { calcComplianceScore, scoreColor, exportFleetCSV, printReport } from "../../lib/utils";

const TODAY = new Date("2026-02-16");
function getDaysUntil(d) { if (!d) return null; return Math.floor((new Date(d) - TODAY) / 86400000); }
function formatDate(d) { if (!d) return "\u2014"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function getRisk(days) { if (days === null) return "green"; if (days < 0) return "high"; if (days <= 7) return "medium"; if (days <= 30) return "low"; return "green"; }

const RISK = {
  high: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", dot: "#EF4444", label: "HIGH" },
  medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", dot: "#F59E0B", label: "MEDIUM" },
  low: { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", dot: "#3B82F6", label: "LOW" },
  green: { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", dot: "#10B981", label: "OK" },
};
const TYPES = { HGV: "\u{1F69B}", Van: "\u{1F690}", Trailer: "\u{1F517}" };

const MOCK_COMPANIES = [
  { id: "c1", name: "Hargreaves Haulage Ltd", o_licence: "OB1234567", operating_centre: "Leeds Industrial Estate, LS9 8AB", address: "12 Commercial Road, Leeds, LS1 4AP", phone: "0113 496 2100", email: "office@hargreaves-haulage.co.uk", authorised_vehicles: 8, authorised_trailers: 4, licence_status: "Valid", licence_expiry: "2027-08-15", archived_at: null },
  { id: "c2", name: "Northern Express Transport", o_licence: "OB2345678", operating_centre: "Wakefield Depot, WF1 2AB", address: "45 Westgate, Wakefield, WF1 1JY", phone: "01924 331 200", email: "ops@northern-express.co.uk", authorised_vehicles: 6, authorised_trailers: 2, licence_status: "Valid", licence_expiry: "2028-03-20", archived_at: null },
  { id: "c3", name: "Yorkshire Fleet Services", o_licence: "OB3456789", operating_centre: "Bradford Business Park, BD4 7TJ", address: "8 Manor Row, Bradford, BD1 4PB", phone: "01274 882 400", email: "fleet@yorkshirefleet.co.uk", authorised_vehicles: 10, authorised_trailers: 6, licence_status: "Valid", licence_expiry: "2027-11-30", archived_at: null },
  { id: "c4", name: "Pennine Logistics Group", o_licence: "OB4567890", operating_centre: "Huddersfield Trade Park, HD1 6QF", address: "22 Market Street, Huddersfield, HD1 2EN", phone: "01484 510 300", email: "ops@penninelogistics.co.uk", authorised_vehicles: 4, authorised_trailers: 2, licence_status: "Valid", licence_expiry: "2028-06-10", archived_at: null },
];

const MOCK_VEHICLES = [
  { id: "v1", company_id: "c1", reg: "BD63 XYZ", type: "HGV", make: "DAF", model: "CF 330", year: 2020, mot_due: "2026-02-18", pmi_due: "2026-02-14", insurance_due: "2026-06-15", tacho_due: "2026-09-01", service_due: "2026-03-20", pmi_interval: 6, archived_at: null },
  { id: "v2", company_id: "c1", reg: "KL19 ABC", type: "HGV", make: "DAF", model: "LF 230", year: 2019, mot_due: "2026-05-22", pmi_due: "2026-02-20", insurance_due: "2026-08-30", tacho_due: "2026-07-15", service_due: "2026-04-10", pmi_interval: 6, archived_at: null },
  { id: "v3", company_id: "c1", reg: "MN20 DEF", type: "Van", make: "Ford", model: "Transit 350", year: 2020, mot_due: "2026-07-11", pmi_due: "2026-03-28", insurance_due: "2026-11-05", tacho_due: null, service_due: "2026-05-15", pmi_interval: 8, archived_at: null },
  { id: "v4", company_id: "c1", reg: "PQ21 GHI", type: "Trailer", make: "SDC", model: "Curtainsider", year: 2021, mot_due: "2026-04-30", pmi_due: "2026-03-01", insurance_due: "2026-12-01", tacho_due: null, service_due: null, pmi_interval: 6, archived_at: null },
  { id: "v5", company_id: "c2", reg: "AB12 CDE", type: "HGV", make: "Volvo", model: "FH 460", year: 2022, mot_due: "2026-02-19", pmi_due: "2026-03-05", insurance_due: "2026-05-20", tacho_due: "2026-10-12", service_due: "2026-04-22", pmi_interval: 6, archived_at: null },
  { id: "v6", company_id: "c2", reg: "FG34 HIJ", type: "HGV", make: "Scania", model: "R450", year: 2021, mot_due: "2026-06-14", pmi_due: "2026-02-21", insurance_due: "2026-09-18", tacho_due: "2026-08-03", service_due: "2026-05-30", pmi_interval: 6, archived_at: null },
  { id: "v7", company_id: "c2", reg: "JK56 LMN", type: "Van", make: "Mercedes", model: "Sprinter 314", year: 2022, mot_due: "2026-08-25", pmi_due: "2026-04-10", insurance_due: "2026-07-22", tacho_due: null, service_due: "2026-06-01", pmi_interval: 10, archived_at: null },
  { id: "v8", company_id: "c3", reg: "LM67 OPQ", type: "HGV", make: "DAF", model: "XF 480", year: 2020, mot_due: "2026-03-15", pmi_due: "2026-02-10", insurance_due: "2026-04-28", tacho_due: "2026-06-20", service_due: "2026-03-25", pmi_interval: 6, archived_at: null },
  { id: "v9", company_id: "c3", reg: "GH45 IJK", type: "HGV", make: "Scania", model: "R450", year: 2019, mot_due: "2026-02-12", pmi_due: "2026-02-28", insurance_due: "2026-06-30", tacho_due: "2026-07-25", service_due: "2026-04-15", pmi_interval: 6, archived_at: null },
  { id: "v10", company_id: "c4", reg: "LN54 BCD", type: "HGV", make: "MAN", model: "TGX 18.470", year: 2021, mot_due: "2026-08-10", pmi_due: "2026-04-20", insurance_due: "2026-09-25", tacho_due: "2026-11-10", service_due: "2026-06-05", pmi_interval: 6, archived_at: null },
];

function RiskPill({ level }) {
  const cfg = RISK[level];
  return (<span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: "10px", fontWeight: 700, color: cfg.text, letterSpacing: "0.05em" }}>
    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot }} />{cfg.label}
  </span>);
}

function FormField({ label, value, onChange, placeholder, type = "text", icon }) {
  return (<div>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>{label}</label>
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{icon}</span>}
      <input type={type} placeholder={placeholder} value={value || ""}
        onChange={e => onChange(type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
        style={{ width: "100%", padding: icon ? "10px 14px 10px 38px" : "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit" }} />
    </div>
  </div>);
}

function CompanyFormModal({ company, onSave, onClose }) {
  const isEdit = !!company;
  const [form, setForm] = useState({
    name: company?.name || "", o_licence: company?.o_licence || "", operating_centre: company?.operating_centre || "",
    address: company?.address || "", phone: company?.phone || "", email: company?.email || "",
    authorised_vehicles: company?.authorised_vehicles || 0, authorised_trailers: company?.authorised_trailers || 0,
    licence_expiry: company?.licence_expiry || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{isEdit ? "\u270F\uFE0F Edit Company" : "\u2795 Add Company"}</h2>
            <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>{isEdit ? "Update operator details" : "Add a new operator to your portfolio"}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <FormField label="Company Name *" value={form.name} onChange={v => set("name", v)} placeholder="e.g. Hargreaves Haulage Ltd" icon={"\u{1F3E2}"} />
          <FormField label="O-Licence Number" value={form.o_licence} onChange={v => set("o_licence", v)} placeholder="e.g. OB1234567" icon={"\u{1F4CB}"} />
          <FormField label="Operating Centre" value={form.operating_centre} onChange={v => set("operating_centre", v)} placeholder="Address" icon={"\u{1F4CD}"} />
          <FormField label="Address" value={form.address} onChange={v => set("address", v)} placeholder="Registered address" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Phone" value={form.phone} onChange={v => set("phone", v)} placeholder="0113 496 2100" icon={"\u{1F4DE}"} />
            <FormField label="Email" value={form.email} onChange={v => set("email", v)} placeholder="office@company.co.uk" icon={"\u{1F4E7}"} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <FormField label="Auth. Vehicles" value={form.authorised_vehicles} onChange={v => set("authorised_vehicles", v)} type="number" />
            <FormField label="Auth. Trailers" value={form.authorised_trailers} onChange={v => set("authorised_trailers", v)} type="number" />
            <FormField label="Licence Expiry" value={form.licence_expiry} onChange={v => set("licence_expiry", v)} type="date" />
          </div>
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form, company?.id); setSaving(false); }} disabled={saving || !form.name.trim()} style={{
            padding: "10px 24px", border: "none", borderRadius: "10px",
            background: !form.name.trim() ? "#E5E7EB" : "linear-gradient(135deg, #0F172A, #1E293B)",
            color: !form.name.trim() ? "#94A3B8" : "white", fontSize: "13px", fontWeight: 700, cursor: !form.name.trim() ? "not-allowed" : "pointer",
          }}>{saving ? "Saving..." : isEdit ? "\u{1F4BE} Save Changes" : "\u2795 Add Company"}</button>
        </div>
      </div>
    </div>
  );
}

function VehicleFormModal({ vehicle, companyId, onSave, onClose }) {
  const isEdit = !!vehicle;
  const [form, setForm] = useState({
    reg: vehicle?.reg || "", type: vehicle?.type || "HGV", make: vehicle?.make || "", model: vehicle?.model || "",
    year: vehicle?.year || 2024, mot_due: vehicle?.mot_due || "", pmi_due: vehicle?.pmi_due || "",
    insurance_due: vehicle?.insurance_due || "", tacho_due: vehicle?.tacho_due || "",
    service_due: vehicle?.service_due || "", pmi_interval: vehicle?.pmi_interval || 6,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "560px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>{isEdit ? `\u270F\uFE0F Edit ${vehicle.reg}` : "\u2795 Add Vehicle"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8" }}>{"\u2715"}</button>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <FormField label="Registration *" value={form.reg} onChange={v => set("reg", v)} placeholder="BD63 XYZ" />
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: "10px", fontSize: "14px", background: "#FAFAFA", fontFamily: "inherit" }}>
                <option value="HGV">HGV</option><option value="Van">Van</option><option value="Trailer">Trailer</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <FormField label="Make" value={form.make} onChange={v => set("make", v)} placeholder="DAF" />
            <FormField label="Model" value={form.model} onChange={v => set("model", v)} placeholder="CF 330" />
            <FormField label="Year" value={form.year} onChange={v => set("year", v)} type="number" />
          </div>
          <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#F0F9FF", border: "1px solid #BFDBFE" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", marginBottom: "10px" }}>{"\u{1F4C5}"} Compliance Dates</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <FormField label="MOT Due" value={form.mot_due} onChange={v => set("mot_due", v)} type="date" />
              <FormField label="PMI Due" value={form.pmi_due} onChange={v => set("pmi_due", v)} type="date" />
              <FormField label="Insurance Due" value={form.insurance_due} onChange={v => set("insurance_due", v)} type="date" />
              <FormField label="Tacho Cal" value={form.tacho_due} onChange={v => set("tacho_due", v)} type="date" />
              <FormField label="Service Due" value={form.service_due} onChange={v => set("service_due", v)} type="date" />
              <FormField label="PMI Interval (wks)" value={form.pmi_interval} onChange={v => set("pmi_interval", v)} type="number" />
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px", background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave({ ...form, company_id: companyId }, vehicle?.id); setSaving(false); }} disabled={saving || !form.reg.trim()} style={{
            padding: "10px 24px", border: "none", borderRadius: "10px",
            background: !form.reg.trim() ? "#E5E7EB" : "linear-gradient(135deg, #0F172A, #1E293B)",
            color: !form.reg.trim() ? "#94A3B8" : "white", fontSize: "13px", fontWeight: 700, cursor: !form.reg.trim() ? "not-allowed" : "pointer",
          }}>{saving ? "Saving..." : isEdit ? "\u{1F4BE} Save" : "\u2795 Add Vehicle"}</button>
        </div>
      </div>
    </div>
  );
}

export default function ComplyFleetCompany() {
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [companyForm, setCompanyForm] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const flash = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
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
      // TMs only see their linked companies
      let companyIds = null;
      if (userProfile && userProfile.role === "tm") {
        const { data: links } = await supabase.from("tm_companies").select("company_id").eq("tm_id", userProfile.id);
        companyIds = (links || []).map(l => l.company_id);
      }

      let cQuery = supabase.from("companies").select("*").order("name");
      if (companyIds) cQuery = cQuery.in("id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);

      let vQuery = supabase.from("vehicles").select("*").order("reg");
      if (companyIds) vQuery = vQuery.in("company_id", companyIds.length > 0 ? companyIds : ["00000000-0000-0000-0000-000000000000"]);

      const [cRes, vRes, dRes] = await Promise.all([cQuery, vQuery,
        supabase.from("defects").select("*").in("status", ["open", "in_progress"]),
      ]);
      setCompanies(cRes.data || []); setVehicles(vRes.data || []); setDefects(dRes.data || []);
    } else {
      setCompanies(MOCK_COMPANIES); setVehicles(MOCK_VEHICLES);
    }
    setLoading(false);
  }

  async function saveCompany(form, editId) {
    if (isSupabaseReady()) {
      if (editId) { await supabase.from("companies").update(form).eq("id", editId); }
      else {
        const { data: newCompany } = await supabase.from("companies").insert({ ...form, licence_status: "Valid" }).select().single();
        // Auto-link to current TM
        if (newCompany && profile && (profile.role === "tm" || profile.role === "platform_owner")) {
          await supabase.from("tm_companies").insert({ tm_id: profile.id, company_id: newCompany.id });
        }
      }
      await loadData(profile);
    } else {
      if (editId) setCompanies(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      else setCompanies(prev => [...prev, { ...form, id: "c" + Date.now(), archived_at: null, licence_status: "Valid" }]);
    }
    flash(editId ? "Company updated" : "Company added"); setCompanyForm(null);
  }

  async function archiveCompany(id) {
    const ts = new Date().toISOString();
    if (isSupabaseReady()) { await supabase.from("companies").update({ archived_at: ts }).eq("id", id); await loadData(profile); }
    else setCompanies(prev => prev.map(c => c.id === id ? { ...c, archived_at: ts } : c));
    flash("Company archived"); setConfirm(null); if (selectedId === id) setSelectedId(null);
  }

  async function restoreCompany(id) {
    if (isSupabaseReady()) { await supabase.from("companies").update({ archived_at: null }).eq("id", id); await loadData(profile); }
    else setCompanies(prev => prev.map(c => c.id === id ? { ...c, archived_at: null } : c));
    flash("Company restored");
  }

  async function saveVehicle(form, editId) {
    if (isSupabaseReady()) {
      if (editId) { await supabase.from("vehicles").update(form).eq("id", editId); }
      else { await supabase.from("vehicles").insert(form); }
      await loadData(profile);
    } else {
      if (editId) setVehicles(prev => prev.map(v => v.id === editId ? { ...v, ...form } : v));
      else setVehicles(prev => [...prev, { ...form, id: "v" + Date.now(), archived_at: null }]);
    }
    flash(editId ? "Vehicle updated" : "Vehicle added"); setVehicleForm(null);
  }

  async function archiveVehicle(id) {
    const ts = new Date().toISOString();
    if (isSupabaseReady()) { await supabase.from("vehicles").update({ archived_at: ts }).eq("id", id); await loadData(profile); }
    else setVehicles(prev => prev.map(v => v.id === id ? { ...v, archived_at: ts } : v));
    flash("Vehicle archived"); setConfirm(null);
  }

  async function restoreVehicle(id) {
    if (isSupabaseReady()) { await supabase.from("vehicles").update({ archived_at: null }).eq("id", id); await loadData(profile); }
    else setVehicles(prev => prev.map(v => v.id === id ? { ...v, archived_at: null } : v));
    flash("Vehicle restored");
  }

  const visibleCompanies = companies.filter(c => showArchived ? c.archived_at : !c.archived_at);
  const selected = companies.find(c => c.id === selectedId);
  const selectedVehiclesActive = vehicles.filter(v => v.company_id === selectedId && !v.archived_at);
  const selectedVehiclesArchived = vehicles.filter(v => v.company_id === selectedId && v.archived_at);

  function getCompanyRisk(cid) {
    const vehs = vehicles.filter(v => v.company_id === cid && !v.archived_at);
    let worst = "green";
    const p = { high: 3, medium: 2, low: 1, green: 0 };
    vehs.forEach(v => { ["mot_due","pmi_due","insurance_due","tacho_due","service_due"].forEach(k => { const r = getRisk(getDaysUntil(v[k])); if (p[r] > p[worst]) worst = r; }); });
    return worst;
  }

  const Btn = ({ children, onClick, style: s, ...props }) => (
    <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#374151", ...s }} {...props}>{children}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }`}</style>

      <header style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F69B}"}</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px" }}>Comply<span style={{ color: "#60A5FA" }}>Fleet</span></span>
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!isSupabaseReady() && <span style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(251,191,36,0.2)", color: "#FCD34D", fontSize: "10px", fontWeight: 700 }}>DEMO MODE</span>}
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>JH</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A" }}>{"\u{1F3E2}"} Companies & Fleet</h1>
            <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>{visibleCompanies.length} {showArchived ? "archived" : "active"} companies</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn onClick={() => setShowArchived(!showArchived)} style={{ background: showArchived ? "#FEF3C7" : "#FFFFFF", color: showArchived ? "#92400E" : "#6B7280", borderColor: showArchived ? "#FDE68A" : "#E5E7EB" }}>{showArchived ? "\u{1F4E6} Viewing Archived" : "\u{1F4E6} Show Archived"}</Btn>
            <Btn onClick={() => setCompanyForm(false)} style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", border: "none", padding: "10px 20px", borderRadius: "12px", fontSize: "13px" }}>{"\u2795"} Add Company</Btn>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected && !selected.archived_at ? "380px 1fr" : "1fr", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loading ? <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>Loading...</div> :
            visibleCompanies.length === 0 ? <div style={{ textAlign: "center", padding: "40px", color: "#94A3B8" }}>{showArchived ? "No archived companies" : "No companies yet"}</div> :
            visibleCompanies.map(c => {
              const risk = getCompanyRisk(c.id);
              const cVehicles = vehicles.filter(v => v.company_id === c.id && !v.archived_at);
              const cDefects = defects.filter(d => d.company_id === c.id);
              const score = calcComplianceScore(cVehicles, cDefects);
              const vCount = cVehicles.length;
              const isSel = selectedId === c.id;
              const isArch = !!c.archived_at;
              return (
                <div key={c.id} onClick={() => !isArch && setSelectedId(c.id)} style={{
                  background: "#FFFFFF", borderRadius: "16px", border: isSel ? "2px solid #1D4ED8" : "1px solid #E5E7EB",
                  overflow: "hidden", cursor: isArch ? "default" : "pointer", opacity: isArch ? 0.7 : 1,
                  boxShadow: isSel ? "0 8px 32px rgba(29,78,216,0.15)" : "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.2s ease",
                }}>
                  <div style={{ height: "3px", background: isArch ? "#9CA3AF" : RISK[risk].dot }} />
                  <div style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {!isArch && <ComplianceDonutInline score={score} size={44} />}
                        <div>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: 0 }}>{c.name}</h3>
                          <div style={{ fontSize: "12px", color: "#6B7280", fontFamily: "monospace", marginTop: "2px" }}>{c.o_licence}</div>
                        </div>
                      </div>
                      {isArch ? <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F3F4F6", fontSize: "10px", fontWeight: 700, color: "#6B7280" }}>ARCHIVED</span> : <RiskPill level={risk} />}
                    </div>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6B7280", flexWrap: "wrap" }}>
                      <span>{"\u{1F69B}"} {vCount} vehicles</span>
                      <span>{"\u{1F4CD}"} {c.operating_centre?.split(",")[0]}</span>
                      <span>{"\u{1F4DE}"} {c.phone}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "12px" }} onClick={e => e.stopPropagation()}>
                      {isArch ? (
                        <Btn onClick={() => restoreCompany(c.id)} style={{ borderColor: "#6EE7B7", background: "#ECFDF5", color: "#065F46" }}>{"\u{1F504}"} Restore</Btn>
                      ) : (<>
                        <Btn onClick={() => setCompanyForm(c)}>{"\u270F\uFE0F"} Edit</Btn>
                        <Btn onClick={() => setConfirm({ title: "Archive Company?", message: `"${c.name}" will be hidden from your active list. You can restore it anytime.`, icon: "\u{1F4E6}", confirmLabel: "Archive", confirmColor: "#D97706", onConfirm: () => archiveCompany(c.id) })} style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}>{"\u{1F4E6}"} Archive</Btn>
                      </>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && !selected.archived_at && (
            <div style={{ position: "sticky", top: "88px", alignSelf: "start" }}>
              <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "24px 28px", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>{selected.name}</h2>
                      <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>{"\u{1F4CB}"} {selected.o_licence} {"\u00B7"} {"\u{1F4CD}"} {selected.operating_centre}</div>
                      <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "2px" }}>{"\u{1F4DE}"} {selected.phone} {"\u00B7"} {"\u{1F4E7}"} {selected.email}</div>
                    </div>
                    <button onClick={() => setSelectedId(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", padding: "6px 12px", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>{"\u2715"}</button>
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "14px" }}>
                    {[{ l: "Auth. Vehicles", v: selected.authorised_vehicles }, { l: "Auth. Trailers", v: selected.authorised_trailers }, { l: "Licence Expiry", v: formatDate(selected.licence_expiry) }].map(s => (
                      <div key={s.l} style={{ padding: "8px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: "10px", opacity: 0.6 }}>{s.l}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "2px" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Active Fleet ({selectedVehiclesActive.length})</h3>
                    <Btn onClick={() => setVehicleForm(false)} style={{ background: "#0F172A", color: "white", border: "none" }}>{"\u2795"} Add Vehicle</Btn>
                  </div>

                  {selectedVehiclesActive.length === 0 ? <div style={{ textAlign: "center", padding: "24px", color: "#94A3B8", fontSize: "13px" }}>No vehicles. Add one above.</div> :
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedVehiclesActive.map(v => {
                      const worstDays = Math.min(...["mot_due","pmi_due","insurance_due","tacho_due","service_due"].map(k => getDaysUntil(v[k]) ?? 9999));
                      const risk = getRisk(worstDays);
                      return (
                        <div key={v.id} style={{ padding: "14px 16px", borderRadius: "12px", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "20px" }}>{TYPES[v.type]}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827", fontFamily: "monospace" }}>{v.reg}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{v.make} {v.model} {"\u00B7"} {v.type}</div>
                          </div>
                          <RiskPill level={risk} />
                          <Btn onClick={() => setVehicleForm(v)} style={{ padding: "4px 8px", fontSize: "10px" }}>{"\u270F\uFE0F"}</Btn>
                          <Btn onClick={() => setConfirm({ title: "Archive Vehicle?", message: `${v.reg} will be removed from the active fleet. Restore anytime.`, icon: "\u{1F4E6}", confirmLabel: "Archive", confirmColor: "#D97706", onConfirm: () => archiveVehicle(v.id) })} style={{ padding: "4px 8px", fontSize: "10px", borderColor: "#FDE68A", background: "#FFFBEB", color: "#92400E" }}>{"\u{1F4E6}"}</Btn>
                        </div>
                      );
                    })}
                  </div>}

                  {selectedVehiclesArchived.length > 0 && (
                    <div style={{ marginTop: "20px" }}>
                      <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#6B7280", marginBottom: "8px" }}>{"\u{1F4E6}"} Archived Vehicles ({selectedVehiclesArchived.length})</h4>
                      {selectedVehiclesArchived.map(v => (
                        <div key={v.id} style={{ padding: "10px 14px", borderRadius: "10px", background: "#F9FAFB", border: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", opacity: 0.7 }}>
                          <span style={{ fontSize: "16px" }}>{TYPES[v.type]}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "13px", fontFamily: "monospace", color: "#6B7280" }}>{v.reg}</span>
                            <span style={{ fontSize: "11px", color: "#9CA3AF", marginLeft: "8px" }}>{v.make} {v.model}</span>
                          </div>
                          <Btn onClick={() => restoreVehicle(v.id)} style={{ padding: "4px 10px", fontSize: "10px", borderColor: "#6EE7B7", background: "#ECFDF5", color: "#065F46" }}>{"\u{1F504}"} Restore</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "24px 20px", marginTop: "40px", borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px" }}>ComplyFleet v1.0 {"\u00B7"} DVSA Compliance Platform {"\u00B7"} {"\u00A9"} 2026</footer>

      {companyForm !== null && <CompanyFormModal company={companyForm || null} onSave={saveCompany} onClose={() => setCompanyForm(null)} />}
      {vehicleForm !== null && <VehicleFormModal vehicle={vehicleForm || null} companyId={selectedId} onSave={saveVehicle} onClose={() => setVehicleForm(null)} />}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
