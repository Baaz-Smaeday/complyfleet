"use client";
import { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseReady } from "../../lib/supabase";

// ============================================================
// COMPLYFLEET — Driver Daily Walkaround Check (Mobile-First)
// Accessed via secure magic link — no login required
// ============================================================

const CHECKLIST_TEMPLATES = {
  HGV: [
    { category: "Lights", icon: "💡", items: [
      "Headlights (dipped beam)", "Headlights (main beam)", "Front indicators",
      "Rear indicators", "Brake lights", "Reverse lights", "Fog lights (front)",
      "Fog lights (rear)", "Side marker lights", "Number plate light"
    ]},
    { category: "Tyres & Wheels", icon: "🔘", items: [
      "Nearside front tyre condition & tread", "Offside front tyre condition & tread",
      "Nearside rear tyres condition & tread", "Offside rear tyres condition & tread",
      "Tyre pressures appear normal", "Wheel nut indicators aligned", "No wheel damage or cracks"
    ]},
    { category: "Brakes", icon: "🛑", items: [
      "Service brake operation", "Parking brake holds", "Air pressure builds correctly",
      "No audible air leaks", "Brake lines — no damage or leaks"
    ]},
    { category: "Mirrors & Glass", icon: "🪞", items: [
      "Nearside mirror — clean & secure", "Offside mirror — clean & secure",
      "Wide-angle mirrors — clean & secure", "Front mirror / Fresnel lens",
      "Windscreen — no cracks or damage", "All windows clean & clear"
    ]},
    { category: "Body & Security", icon: "🚛", items: [
      "Cab condition — no damage", "Body panels — secure, no damage",
      "Mudguards & spray suppression fitted", "Doors / shutters operate correctly",
      "Load area secure & clean", "Number plates clean & legible"
    ]},
    { category: "Fluid Levels", icon: "🛢️", items: [
      "Engine oil level", "Coolant level", "Windscreen washer fluid", "AdBlue level (if applicable)"
    ]},
    { category: "Safety Equipment", icon: "🧯", items: [
      "Horn working", "Windscreen wipers working", "Seatbelt working",
      "Fire extinguisher present & in date", "First aid kit present",
      "Warning triangle / hi-vis vest"
    ]},
    { category: "Exhaust & Emissions", icon: "💨", items: [
      "Exhaust — no excessive smoke", "Exhaust — securely mounted, no leaks"
    ]},
  ],
  Van: [
    { category: "Lights", icon: "💡", items: [
      "Headlights (dipped beam)", "Headlights (main beam)", "Front indicators",
      "Rear indicators", "Brake lights", "Reverse lights", "Fog lights (rear)", "Number plate light"
    ]},
    { category: "Tyres & Wheels", icon: "🔘", items: [
      "Nearside front tyre condition & tread", "Offside front tyre condition & tread",
      "Nearside rear tyre condition & tread", "Offside rear tyre condition & tread",
      "Tyre pressures appear normal", "Wheel nuts secure"
    ]},
    { category: "Brakes", icon: "🛑", items: [
      "Service brake operation", "Parking brake holds"
    ]},
    { category: "Mirrors & Glass", icon: "🪞", items: [
      "Nearside mirror — clean & secure", "Offside mirror — clean & secure",
      "Rear view mirror", "Windscreen — no cracks or damage"
    ]},
    { category: "Body & Security", icon: "🚐", items: [
      "Body panels — no damage", "Doors operate correctly",
      "Load area secure", "Number plates clean & legible"
    ]},
    { category: "Fluid Levels", icon: "🛢️", items: [
      "Engine oil level", "Coolant level", "Windscreen washer fluid"
    ]},
    { category: "Safety Equipment", icon: "🧯", items: [
      "Horn working", "Windscreen wipers working", "Seatbelt working"
    ]},
  ],
  Trailer: [
    { category: "Lights", icon: "💡", items: [
      "Rear indicators", "Brake lights", "Side marker lights",
      "Rear fog light", "Number plate light", "Reflectors present"
    ]},
    { category: "Tyres & Wheels", icon: "🔘", items: [
      "Nearside tyres condition & tread", "Offside tyres condition & tread",
      "Tyre pressures appear normal", "Wheel nut indicators aligned"
    ]},
    { category: "Brakes & Air", icon: "🛑", items: [
      "Air line connections secure", "No audible air leaks",
      "Parking brake / park shunt", "Brake lines condition"
    ]},
    { category: "Body & Security", icon: "🚛", items: [
      "Body panels — secure", "Doors / curtains secure",
      "Mudguards & spray suppression", "Landing gear condition",
      "Number plates clean & legible"
    ]},
    { category: "Coupling", icon: "🔗", items: [
      "Kingpin / coupling condition", "Coupling lock engaged",
      "Suzie lines connected & secure"
    ]},
  ]
};

const SEVERITY_OPTIONS = [
  { value: "minor", label: "Minor", desc: "Does not affect vehicle safety", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { value: "major", label: "Major", desc: "May affect vehicle safety", color: "#F97316", bg: "#FFF7ED", border: "#FED7AA" },
  { value: "dangerous", label: "Dangerous", desc: "Immediate safety risk — DO NOT DRIVE", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
];

const MOCK_VEHICLES = [
  { id: "v1", reg: "BD63 XYZ", type: "HGV", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v2", reg: "KL19 ABC", type: "HGV", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v3", reg: "MN20 DEF", type: "Van", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
  { id: "v4", reg: "PQ21 GHI", type: "Trailer", company_name: "Hargreaves Haulage Ltd", company_id: "c1" },
];

// ── Upload photo to Supabase Storage ────────────────────────────────────────
async function uploadPhotoToStorage(file) {
  if (!file || !isSupabaseReady()) return null;
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `checks/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("check-photos").upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("check-photos").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  }
}

// --- Components ---

function ProgressBar({ current, total }) {
  const pct = ((current) / total) * 100;
  return (
    <div style={{ width: "100%", height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{
        height: "100%", background: "linear-gradient(90deg, #2563EB, #3B82F6)",
        borderRadius: "2px", width: `${pct}%`, transition: "width 0.4s ease",
      }} />
    </div>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "12px 0" }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          width: i === current ? "24px" : "8px", height: "8px",
          borderRadius: "4px", transition: "all 0.3s ease",
          background: i < current ? "#2563EB" : i === current ? "#2563EB" : "#CBD5E1",
          opacity: i <= current ? 1 : 0.5,
        }} />
      ))}
    </div>
  );
}

// ── CheckItem: NOW WITH MOBILE TAP GLOW ─────────────────────────────────────
function CheckItem({ label, status, onToggle, index }) {
  const [pressedPass, setPressedPass] = useState(false);
  const [pressedFail, setPressedFail] = useState(false);

  const configs = {
    unchecked: { bg: "#FFFFFF", border: "#E2E8F0", color: "#64748B" },
    pass: { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A" },
    fail: { bg: "#FEF2F2", border: "#FCA5A5", color: "#DC2626" },
  };
  const cfg = configs[status];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "14px 16px", borderRadius: "12px",
      background: cfg.bg, border: `1.5px solid ${cfg.border}`,
      transition: "all 0.2s ease",
      animation: `slideIn 0.3s ease ${index * 0.03}s both`,
    }}>
      {/* Pass button — tap glow green */}
      <button
        onTouchStart={() => setPressedPass(true)}
        onTouchEnd={() => { setPressedPass(false); onToggle("pass"); }}
        onMouseDown={() => setPressedPass(true)}
        onMouseUp={() => { setPressedPass(false); onToggle("pass"); }}
        onMouseLeave={() => setPressedPass(false)}
        style={{
          width: "44px", height: "44px", borderRadius: "12px", border: "2px solid",
          borderColor: status === "pass" ? "#16A34A" : pressedPass ? "#16A34A" : "#D1D5DB",
          background: status === "pass" ? "#16A34A" : pressedPass ? "#F0FDF4" : "white",
          color: status === "pass" ? "white" : pressedPass ? "#16A34A" : "#D1D5DB",
          fontSize: "20px", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease", flexShrink: 0,
          transform: pressedPass ? "scale(0.90)" : "scale(1)",
          boxShadow: pressedPass ? "0 0 0 4px rgba(22,163,74,0.25)" : status === "pass" ? "0 0 0 3px rgba(22,163,74,0.15)" : "none",
          WebkitTapHighlightColor: "transparent",
        }}>✓</button>

      {/* Label */}
      <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "#1E293B", lineHeight: 1.4 }}>
        {label}
      </span>

      {/* Fail button — tap glow red */}
      <button
        onTouchStart={() => setPressedFail(true)}
        onTouchEnd={() => { setPressedFail(false); onToggle("fail"); }}
        onMouseDown={() => setPressedFail(true)}
        onMouseUp={() => { setPressedFail(false); onToggle("fail"); }}
        onMouseLeave={() => setPressedFail(false)}
        style={{
          width: "44px", height: "44px", borderRadius: "12px", border: "2px solid",
          borderColor: status === "fail" ? "#DC2626" : pressedFail ? "#DC2626" : "#D1D5DB",
          background: status === "fail" ? "#DC2626" : pressedFail ? "#FEF2F2" : "white",
          color: status === "fail" ? "white" : pressedFail ? "#DC2626" : "#D1D5DB",
          fontSize: "20px", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease", flexShrink: 0,
          transform: pressedFail ? "scale(0.90)" : "scale(1)",
          boxShadow: pressedFail ? "0 0 0 4px rgba(220,38,38,0.25)" : status === "fail" ? "0 0 0 3px rgba(220,38,38,0.15)" : "none",
          WebkitTapHighlightColor: "transparent",
        }}>✗</button>
    </div>
  );
}

function CategorySection({ category, icon, items, statuses, onToggle, isOpen, onToggleOpen }) {
  const [pressed, setPressed] = useState(false);
  const total = items.length;
  const done = items.filter((_, i) => statuses[i] !== "unchecked").length;
  const fails = items.filter((_, i) => statuses[i] === "fail").length;
  const allDone = done === total;

  return (
    <div style={{
      borderRadius: "16px", overflow: "hidden",
      border: `1.5px solid ${fails > 0 ? "#FECACA" : allDone ? "#86EFAC" : "#E2E8F0"}`,
      background: "white", transition: "all 0.2s ease",
      boxShadow: pressed ? `0 0 0 3px ${fails > 0 ? "rgba(220,38,38,0.2)" : allDone ? "rgba(22,163,74,0.2)" : "rgba(59,130,246,0.2)"}` : "none",
    }}>
      {/* Header */}
      <button
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => { setPressed(false); onToggleOpen(); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => { setPressed(false); onToggleOpen(); }}
        onMouseLeave={() => setPressed(false)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "12px",
          padding: "16px 18px", border: "none", cursor: "pointer",
          background: fails > 0 ? "#FEF2F2" : allDone ? "#F0FDF4" : "#F8FAFC",
          transition: "all 0.2s ease",
          transform: pressed ? "scale(0.99)" : "scale(1)",
          WebkitTapHighlightColor: "transparent",
        }}>
        <span style={{ fontSize: "22px" }}>{icon}</span>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>{category}</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
            {done}/{total} checked
            {fails > 0 && <span style={{ color: "#DC2626", fontWeight: 700 }}> • {fails} defect{fails > 1 ? "s" : ""}</span>}
          </div>
        </div>
        {/* Progress ring */}
        <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none"
              stroke={fails > 0 ? "#EF4444" : allDone ? "#10B981" : "#3B82F6"}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(done/total)*94.2} 94.2`}
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dasharray 0.4s ease" }}
            />
          </svg>
          {allDone && (
            <span style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: fails > 0 ? "#EF4444" : "#10B981",
            }}>{fails > 0 ? "!" : "✓"}</span>
          )}
        </div>
        <span style={{
          fontSize: "16px", transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s ease", color: "#94A3B8",
        }}>▼</span>
      </button>

      {/* Items */}
      {isOpen && (
        <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map((item, i) => (
            <CheckItem
              key={i} index={i} label={item} status={statuses[i]}
              onToggle={(val) => onToggle(i, statuses[i] === val ? "unchecked" : val)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DefectForm: NOW UPLOADS PHOTO TO SUPABASE STORAGE ───────────────────────
function DefectForm({ item, onUpdate, index, onPhotoUploaded }) {
  const [uploading, setUploading] = useState(false);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => { onUpdate({ ...item, photo: ev.target.result }); };
    reader.readAsDataURL(file);
    // Upload to Supabase Storage in background
    setUploading(true);
    const url = await uploadPhotoToStorage(file);
    setUploading(false);
    if (url) onUpdate({ ...item, photo: item.photo || url, photoUrl: url });
  }

  return (
    <div style={{
      padding: "18px", borderRadius: "14px",
      background: "#FEF2F2", border: "1.5px solid #FECACA",
      animation: `slideIn 0.3s ease ${index * 0.1}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "18px" }}>⚠️</span>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#991B1B" }}>Defect: {item.label}</span>
      </div>

      {/* Description */}
      <label style={{ display: "block", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "6px" }}>
          Describe the defect *
        </span>
        <textarea
          placeholder="What's wrong? Be specific..."
          value={item.description || ""}
          onChange={e => onUpdate({ ...item, description: e.target.value })}
          rows={3}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: "10px",
            border: "1.5px solid #D1D5DB", fontSize: "14px", fontFamily: "inherit",
            resize: "vertical", outline: "none", background: "white",
          }}
          onFocus={e => e.target.style.borderColor = "#3B82F6"}
          onBlur={e => e.target.style.borderColor = "#D1D5DB"}
        />
      </label>

      {/* Severity */}
      <div style={{ marginBottom: "14px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "8px" }}>
          Severity *
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {SEVERITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onUpdate({ ...item, severity: opt.value })}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
                border: `2px solid ${item.severity === opt.value ? opt.color : "#E2E8F0"}`,
                background: item.severity === opt.value ? opt.bg : "white",
                transition: "all 0.15s ease", textAlign: "left", width: "100%",
                WebkitTapHighlightColor: "transparent",
              }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                border: `2px solid ${item.severity === opt.value ? opt.color : "#D1D5DB"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: item.severity === opt.value ? opt.color : "white",
                transition: "all 0.15s ease", flexShrink: 0,
              }}>
                {item.severity === opt.value && <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: opt.color }}>{opt.label}</div>
                <div style={{ fontSize: "11px", color: "#6B7280" }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Photo — uploads to Supabase Storage */}
      <div>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: "6px" }}>
          📷 Photo evidence (recommended)
          {uploading && <span style={{ color: "#3B82F6", marginLeft: "8px", fontWeight: 700 }}>Uploading...</span>}
          {item.photoUrl && !uploading && <span style={{ color: "#10B981", marginLeft: "8px", fontWeight: 700 }}>✓ Saved</span>}
        </span>
        {item.photo ? (
          <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
            <img src={item.photo} style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "10px", border: "2px solid #FECACA" }} />
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>📤 Uploading...</span>
              </div>
            )}
            <button onClick={() => onUpdate({ ...item, photo: null, photoUrl: null })} style={{
              position: "absolute", top: "8px", right: "8px",
              width: "28px", height: "28px", borderRadius: "50%",
              background: "rgba(0,0,0,0.6)", color: "white", border: "none",
              cursor: "pointer", fontSize: "14px",
            }}>✕</button>
          </div>
        ) : (
          <label style={{
            width: "100%", padding: "16px", borderRadius: "10px",
            border: "2px dashed #CBD5E1", background: "white",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: "pointer", fontSize: "14px", color: "#64748B", fontWeight: 500,
          }}>
            <input
              type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
            <span style={{ fontSize: "20px" }}>📷</span>
            Take / Upload Photo
          </label>
        )}
      </div>
    </div>
  );
}

// ── General check photos (shown on declaration step) ─────────────────────────
function GeneralPhotosSection({ photos, onAdd, onRemove }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function handleAdd(e) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 5) return;
    setUploading(true);
    // Show preview immediately via blob URL
    const preview = URL.createObjectURL(file);
    onAdd({ preview, url: null });
    // Upload to storage
    const url = await uploadPhotoToStorage(file);
    onAdd({ preview, url: url || preview }, true); // true = replace last
    setUploading(false);
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
        📷 General Check Photos <span style={{ color: "#94A3B8", fontWeight: 400 }}>(optional, up to 5)</span>
      </span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {photos.map((p, i) => (
          <div key={i} style={{ position: "relative", width: "72px", height: "72px" }}>
            <img src={p.preview || p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", border: "2px solid #E2E8F0" }} />
            <button onClick={() => onRemove(i)} style={{
              position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px",
              borderRadius: "50%", background: "#DC2626", color: "white", border: "2px solid white",
              cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        ))}
        {photos.length < 5 && (
          <label style={{
            width: "72px", height: "72px", borderRadius: "10px",
            border: `2px dashed ${uploading ? "#93C5FD" : "#CBD5E1"}`,
            background: uploading ? "#EFF6FF" : "#F8FAFC",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "10px", color: "#64748B", fontWeight: 600, gap: "4px",
          }}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleAdd} />
            <span style={{ fontSize: "20px" }}>{uploading ? "⏳" : "📷"}</span>
            {uploading ? "..." : "Add"}
          </label>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function WalkaroundCheckForm() {
  const [step, setStep] = useState(0);
  const [driverName, setDriverName] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [odometer, setOdometer] = useState("");
  const [openCategories, setOpenCategories] = useState({});
  const [checkStatuses, setCheckStatuses] = useState({});
  const [defectDetails, setDefectDetails] = useState({});
  const [vehicleSafe, setVehicleSafe] = useState(null);
  const [declaration, setDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [generalPhotos, setGeneralPhotos] = useState([]); // [{ preview, url }]
  const topRef = useRef(null);

  const [dbVehicles, setDbVehicles] = useState([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);

  useEffect(() => {
    async function loadVehicles() {
      if (isSupabaseReady()) {
        const params = new URLSearchParams(window.location.search);
        const vehicleId = params.get("vehicle");
        const companyId = params.get("company");

        let query = supabase.from("vehicles").select("id, reg, type, company_id, make, model").is("archived_at", null);
        if (vehicleId) query = query.eq("id", vehicleId);
        else if (companyId) query = query.eq("company_id", companyId);
        const { data } = await query.order("reg");

        if (data && data.length > 0) {
          const companyIds = [...new Set(data.map(v => v.company_id))];
          const { data: cos } = await supabase.from("companies").select("id, name").in("id", companyIds);
          const companyMap = {};
          (cos || []).forEach(c => { companyMap[c.id] = c.name; });
          const vehicles = data.map(v => ({ ...v, company_name: companyMap[v.company_id] || "Unknown" }));
          setDbVehicles(vehicles);
          if (vehicleId && vehicles.length === 1) setSelectedVehicle(vehicles[0].id);
        } else {
          setDbVehicles(MOCK_VEHICLES);
        }
      } else {
        setDbVehicles(MOCK_VEHICLES);
      }
      setVehiclesLoaded(true);
    }
    loadVehicles();
  }, []);

  const vehicle = dbVehicles.find(v => v.id === selectedVehicle);
  const checklist = vehicle ? CHECKLIST_TEMPLATES[vehicle.type] || [] : [];

  useEffect(() => {
    if (vehicle) {
      const template = CHECKLIST_TEMPLATES[vehicle.type] || [];
      const initial = {};
      template.forEach((cat, ci) => {
        cat.items.forEach((_, ii) => { initial[`${ci}-${ii}`] = "unchecked"; });
      });
      setCheckStatuses(initial);
      setOpenCategories({ 0: true });
      setDefectDetails({});
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const totalItems = checklist.reduce((s, c) => s + c.items.length, 0);
  const checkedItems = Object.values(checkStatuses).filter(v => v !== "unchecked").length;
  const failedItems = Object.entries(checkStatuses)
    .filter(([_, v]) => v === "fail")
    .map(([key]) => {
      const [ci, ii] = key.split("-").map(Number);
      return { key, label: checklist[ci]?.items[ii], category: checklist[ci]?.category };
    });
  const hasDefects = failedItems.length > 0;
  const allChecked = totalItems > 0 && checkedItems === totalItems;

  const allDefectsComplete = failedItems.every(item => {
    const d = defectDetails[item.key];
    return d && d.description && d.severity;
  });

  const steps = hasDefects
    ? ["Welcome", "Details", "Checklist", "Defects", "Declaration", "Done"]
    : ["Welcome", "Details", "Checklist", "Declaration", "Done"];

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return driverName.trim() && selectedVehicle;
    if (step === 2) return allChecked;
    if (hasDefects && step === 3) return allDefectsComplete;
    if ((!hasDefects && step === 3) || (hasDefects && step === 4)) return vehicleSafe !== null && declaration;
    return false;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setStep(step + 1);
  };

  // Handle general photos add/remove
  function handleAddGeneralPhoto(photoObj, replaceLastPending = false) {
    setGeneralPhotos(prev => {
      if (replaceLastPending) {
        // Replace the last item that has no url yet (was pending upload)
        const idx = [...prev].reverse().findIndex(p => !p.url);
        if (idx !== -1) {
          const realIdx = prev.length - 1 - idx;
          const next = [...prev];
          next[realIdx] = photoObj;
          return next;
        }
      }
      return [...prev, photoObj];
    });
  }
  function handleRemoveGeneralPhoto(i) {
    setGeneralPhotos(prev => prev.filter((_, idx) => idx !== i));
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    const refId = "WC-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    setReferenceId(refId);

    if (isSupabaseReady() && vehicle) {
      try {
        // Collect finalised photo URLs for general check photos
        const photoUrls = generalPhotos.map(p => p.url).filter(Boolean);

        // 1. Save walkaround check
        const checkData = {
          vehicle_id: vehicle.id,
          company_id: vehicle.company_id,
          vehicle_reg: vehicle.reg,
          vehicle_type: vehicle.type,
          driver_name: driverName,
          result: vehicleSafe ? "pass" : "fail",
          total_items: totalItems,
          passed_items: checkedItems - failedItems.length,
          failed_items: failedItems.length,
          defects_reported: failedItems.length,
          odometer: odometer || null,
          reference_id: refId,
          photo_urls: photoUrls,
        };

        const { data: checkRow } = await supabase.from("walkaround_checks").insert(checkData).select().single();

        // 2. Save individual check items (with photo_url per defect)
        if (checkRow) {
          const items = [];
          checklist.forEach((cat, ci) => {
            cat.items.forEach((itemLabel, ii) => {
              const key = `${ci}-${ii}`;
              const status = checkStatuses[key] || "pass";
              const detail = defectDetails[key];
              items.push({
                check_id: checkRow.id,
                category: cat.category,
                item_label: itemLabel,
                status,
                defect_description: status === "fail" && detail ? detail.description : null,
                defect_severity: status === "fail" && detail ? detail.severity : null,
                photo_url: status === "fail" && detail ? (detail.photoUrl || null) : null,
              });
            });
          });
          await supabase.from("check_items").insert(items);
        }

        // 3. Auto-create defects for failed items
        for (const item of failedItems) {
          const detail = defectDetails[item.key];
          if (detail && detail.description && detail.severity) {
            await supabase.from("defects").insert({
              vehicle_id: vehicle.id,
              company_id: vehicle.company_id,
              vehicle_reg: vehicle.reg,
              vehicle_type: vehicle.type,
              company_name: vehicle.company_name,
              category: item.category,
              description: detail.description,
              severity: detail.severity,
              status: "open",
              reported_by: driverName,
              reported_date: new Date().toISOString().split("T")[0],
              check_id: refId,
            });
          }
        }
      } catch (err) {
        console.error("Save error:", err);
      }
    }

    setSubmitting(false);
    setSubmitted(true);
    setStep(hasDefects ? 5 : 4);
  };

  const declarationStep = hasDefects ? 4 : 3;
  const successStep = hasDefects ? 5 : 4;
  const now = new Date();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes checkmark { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div ref={topRef} />

      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "16px 20px", position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
            }}>🚛</div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "16px" }}>
              Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
            </span>
          </div>
          <span style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 500 }}>Daily Walkaround Check</span>
        </div>
        {step > 0 && step < successStep && (
          <div style={{ marginTop: "12px" }}>
            <ProgressBar current={step} total={steps.length - 2} />
            <StepIndicator steps={steps.slice(0, -1)} current={step} />
          </div>
        )}
      </header>

      {/* Content */}
      <main style={{ maxWidth: "520px", margin: "0 auto", padding: "20px 16px 120px" }}>

        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div style={{ animation: "slideIn 0.4s ease", textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 20px",
              background: "linear-gradient(135deg, #2563EB, #3B82F6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px",
              boxShadow: "0 12px 32px rgba(37,99,235,0.3)",
            }}>🔍</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>
              Daily Walkaround Check
            </h1>
            <p style={{ color: "#64748B", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px", padding: "0 8px" }}>
              Complete your vehicle safety inspection before starting your journey. This takes about 5–10 minutes.
            </p>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0", textAlign: "left", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Operator Details</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🏢</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#0F172A" }}>{vehicle?.company_name || "ComplyFleet"}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>Daily Walkaround Check</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "#F8FAFC", fontSize: "12px", color: "#64748B" }}>
                <span>🕐</span>
                <span>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div style={{ background: "#FFFBEB", borderRadius: "12px", padding: "14px 16px", border: "1px solid #FDE68A", display: "flex", gap: "10px", textAlign: "left" }}>
              <span style={{ fontSize: "16px" }}>⚡</span>
              <div style={{ fontSize: "12px", color: "#92400E", lineHeight: 1.5 }}>
                <strong>Legal requirement:</strong> Under UK law, drivers must carry out a walkaround check before every journey. All records are stored permanently for DVSA audit.
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Driver + Vehicle */}
        {step === 1 && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>Your Details</h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>Select your vehicle and enter your name.</p>
            <label style={{ display: "block", marginBottom: "20px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>Driver name *</span>
              <input type="text" placeholder="Enter your full name" value={driverName} onChange={e => setDriverName(e.target.value)}
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1.5px solid #D1D5DB", fontSize: "16px", fontFamily: "inherit", background: "white" }} />
            </label>
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "10px" }}>Select vehicle *</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {dbVehicles.map(v => {
                  const icons = { HGV: "🚛", Van: "🚐", Trailer: "🔗" };
                  const isSelected = selectedVehicle === v.id;
                  return (
                    <button key={v.id} onClick={() => setSelectedVehicle(v.id)} style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "16px 18px", borderRadius: "14px",
                      border: `2px solid ${isSelected ? "#2563EB" : "#E2E8F0"}`,
                      background: isSelected ? "#EFF6FF" : "white",
                      cursor: "pointer", transition: "all 0.15s ease", textAlign: "left", width: "100%",
                    }}>
                      <span style={{ fontSize: "26px" }}>{icons[v.type]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "17px", color: "#0F172A", fontFamily: "monospace" }}>{v.reg}</div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>{v.type}</div>
                      </div>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${isSelected ? "#2563EB" : "#D1D5DB"}`, background: isSelected ? "#2563EB" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
                        {isSelected && <span style={{ color: "white", fontSize: "12px", fontWeight: 700 }}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>Odometer reading (optional)</span>
              <input type="number" placeholder="e.g. 125430" value={odometer} onChange={e => setOdometer(e.target.value)}
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1.5px solid #D1D5DB", fontSize: "16px", fontFamily: "inherit", background: "white" }} />
            </label>
          </div>
        )}

        {/* STEP 2: Checklist */}
        {step === 2 && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>Vehicle Inspection</h2>
              <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: allChecked ? "#D1FAE5" : "#EFF6FF", color: allChecked ? "#065F46" : "#1E40AF" }}>{checkedItems}/{totalItems}</span>
            </div>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "6px" }}>
              {vehicle?.reg} ({vehicle?.type}) — Tap <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span> for pass or <span style={{ color: "#DC2626", fontWeight: 700 }}>✗</span> for defect
            </p>
            <button onClick={() => {
              const newStatuses = { ...checkStatuses };
              Object.keys(newStatuses).forEach(k => { if (newStatuses[k] === "unchecked") newStatuses[k] = "pass"; });
              setCheckStatuses(newStatuses);
            }} style={{
              width: "100%", padding: "12px", borderRadius: "10px", marginBottom: "16px",
              border: "1.5px solid #86EFAC", background: "#F0FDF4",
              cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#16A34A",
              display: allChecked ? "none" : "block", WebkitTapHighlightColor: "transparent",
            }}>✓ Mark all remaining as PASS</button>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {checklist.map((cat, ci) => {
                const statuses = cat.items.map((_, ii) => checkStatuses[`${ci}-${ii}`] || "unchecked");
                return (
                  <CategorySection
                    key={ci} category={cat.category} icon={cat.icon} items={cat.items} statuses={statuses}
                    onToggle={(ii, val) => setCheckStatuses(prev => ({ ...prev, [`${ci}-${ii}`]: val }))}
                    isOpen={openCategories[ci] || false}
                    onToggleOpen={() => setOpenCategories(prev => ({ ...prev, [ci]: !prev[ci] }))}
                  />
                );
              })}
            </div>
            {failedItems.length > 0 && (
              <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>⚠️</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#991B1B" }}>{failedItems.length} defect{failedItems.length > 1 ? "s" : ""} found</div>
                  <div style={{ fontSize: "11px", color: "#B91C1C" }}>You'll provide details on the next step</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Defects (if any) */}
        {step === 3 && hasDefects && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#DC2626", marginBottom: "4px" }}>⚠️ Defect Details</h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>Please describe each defect found and rate its severity.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {failedItems.map((item, idx) => (
                <DefectForm
                  key={item.key} index={idx}
                  item={{ ...item, ...(defectDetails[item.key] || {}) }}
                  onUpdate={(updated) => setDefectDetails(prev => ({ ...prev, [item.key]: updated }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Declaration Step */}
        {step === declarationStep && (
          <div style={{ animation: "slideIn 0.4s ease" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>Driver Declaration</h2>
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "24px" }}>Please confirm the following before submitting.</p>

            {/* Summary */}
            <div style={{ background: "white", borderRadius: "14px", padding: "18px", marginBottom: "20px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Check Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Driver", value: driverName },
                  { label: "Vehicle", value: vehicle?.reg, mono: true },
                  { label: "Items checked", value: `${checkedItems} ✓`, color: "#16A34A" },
                  { label: "Defects", value: `${failedItems.length} ${hasDefects ? "⚠️" : "✓"}`, color: hasDefects ? "#DC2626" : "#16A34A", bg: hasDefects ? "#FEF2F2" : "#F0FDF4" },
                ].map(s => (
                  <div key={s.label} style={{ padding: "10px", borderRadius: "8px", background: s.bg || "#F8FAFC" }}>
                    <div style={{ fontSize: "11px", color: "#6B7280" }}>{s.label}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: s.color || "#0F172A", fontFamily: s.mono ? "monospace" : "inherit" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* General photos */}
            <GeneralPhotosSection
              photos={generalPhotos}
              onAdd={handleAddGeneralPhoto}
              onRemove={handleRemoveGeneralPhoto}
            />

            {/* Vehicle safe to use? */}
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "block", marginBottom: "10px" }}>Is this vehicle safe to drive? *</span>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { val: true, label: "Yes — Safe to Drive", color: "#16A34A", bg: "#F0FDF4" },
                  { val: false, label: "No — NOT Safe", color: "#DC2626", bg: "#FEF2F2" },
                ].map(opt => (
                  <button key={String(opt.val)} onClick={() => setVehicleSafe(opt.val)} style={{
                    flex: 1, padding: "16px 14px", borderRadius: "14px",
                    border: `2px solid ${vehicleSafe === opt.val ? opt.color : "#E2E8F0"}`,
                    background: vehicleSafe === opt.val ? opt.bg : "white",
                    cursor: "pointer", transition: "all 0.15s ease", textAlign: "center",
                    WebkitTapHighlightColor: "transparent",
                  }}>
                    <div style={{ fontSize: "28px", marginBottom: "6px" }}>{vehicleSafe === opt.val ? (opt.val ? "🟢" : "🔴") : "⚪"}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: vehicleSafe === opt.val ? opt.color : "#6B7280" }}>{opt.label}</div>
                  </button>
                ))}
              </div>
              {vehicleSafe === false && (
                <div style={{ marginTop: "10px", padding: "12px 14px", borderRadius: "10px", background: "#FEF2F2", border: "1px solid #FECACA", fontSize: "12px", color: "#991B1B", lineHeight: 1.5 }}>
                  <strong>⚠️ Important:</strong> This vehicle must NOT be used until all dangerous/major defects are rectified. Your Transport Manager will be notified immediately.
                </div>
              )}
            </div>

            {/* Declaration checkbox */}
            <button onClick={() => setDeclaration(!declaration)} style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: "12px",
              padding: "16px 18px", borderRadius: "14px",
              border: `2px solid ${declaration ? "#2563EB" : "#E2E8F0"}`,
              background: declaration ? "#EFF6FF" : "white",
              cursor: "pointer", transition: "all 0.15s ease", textAlign: "left",
              WebkitTapHighlightColor: "transparent",
            }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", flexShrink: 0, marginTop: "2px", border: `2px solid ${declaration ? "#2563EB" : "#D1D5DB"}`, background: declaration ? "#2563EB" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}>
                {declaration && <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginBottom: "4px" }}>Driver Declaration *</div>
                <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.5 }}>
                  I confirm that I have carried out a thorough walkaround inspection of this vehicle, and the information provided above is accurate and complete to the best of my knowledge.
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Success */}
        {step === successStep && (
          <div style={{ animation: "slideIn 0.5s ease", textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: "90px", height: "90px", borderRadius: "50%", margin: "0 auto 24px",
              background: vehicleSafe ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #EF4444, #DC2626)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px",
              boxShadow: `0 16px 40px ${vehicleSafe ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              animation: "checkmark 0.5s ease",
            }}>{vehicleSafe ? "✓" : "⚠️"}</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", marginBottom: "8px" }}>
              {vehicleSafe ? "Check Complete!" : "Check Submitted — Vehicle Unsafe"}
            </h1>
            <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "28px" }}>
              {vehicleSafe ? "Your walkaround check has been recorded successfully. Drive safely!" : "Your check has been recorded. Your Transport Manager has been notified of the defects."}
            </p>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #E2E8F0", textAlign: "left", maxWidth: "360px", margin: "0 auto" }}>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  { label: "Driver", value: driverName },
                  { label: "Vehicle", value: vehicle?.reg, mono: true },
                  { label: "Date & Time", value: `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` },
                  { label: "Photos saved", value: `${generalPhotos.filter(p => p.url).length + Object.values(defectDetails).filter(d => d.photoUrl).length}` },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>{r.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", fontFamily: r.mono ? "monospace" : "inherit" }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Result</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", background: vehicleSafe ? "#D1FAE5" : "#FEE2E2", color: vehicleSafe ? "#065F46" : "#991B1B" }}>
                    {vehicleSafe ? "SAFE TO DRIVE" : "NOT SAFE"}
                  </span>
                </div>
                {hasDefects && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>Defects reported</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{failedItems.length}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: "24px", padding: "14px 16px", borderRadius: "12px", background: "#EFF6FF", border: "1px solid #BFDBFE", fontSize: "12px", color: "#1E40AF", maxWidth: "360px", margin: "24px auto 0" }}>
              📋 This record has been saved permanently and cannot be altered. Reference ID: <strong>{referenceId}</strong>
            </div>
            {/* Print report — unchanged from your original */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px", flexWrap: "wrap" }}>
              <button onClick={() => {
                const allItems = [];
                checklist.forEach((cat, ci) => {
                  cat.items.forEach((itemLabel, ii) => {
                    const key = `${ci}-${ii}`;
                    const status = checkStatuses[key] || "pass";
                    const detail = defectDetails[key];
                    allItems.push({ category: cat.category, item: itemLabel, status, defect: detail?.description || "", severity: detail?.severity || "" });
                  });
                });
                const win = window.open("", "_blank");
                win.document.write(`<!DOCTYPE html><html><head><title>Walkaround Check - ${vehicle?.reg}</title><style>
                  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
                  body { font-family: 'DM Sans', sans-serif; margin: 0; padding: 30px; color: #0F172A; max-width: 800px; margin: 0 auto; }
                  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0F172A; padding-bottom: 16px; margin-bottom: 20px; }
                  .logo { font-size: 20px; font-weight: 800; } .logo span { color: #2563EB; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
                  .info-item { padding: 8px 12px; background: #F8FAFC; border-radius: 6px; }
                  .info-label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 600; }
                  .info-value { font-size: 14px; font-weight: 700; margin-top: 2px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                  th { background: #0F172A; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
                  td { padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
                  tr.fail { background: #FEF2F2; }
                  .result { text-align: center; margin: 20px 0; padding: 16px; border-radius: 10px; font-weight: 800; font-size: 18px; }
                  .pass { background: #D1FAE5; color: #065F46; } .fail-result { background: #FEE2E2; color: #991B1B; }
                  .footer { margin-top: 30px; padding-top: 16px; border-top: 2px solid #E5E7EB; font-size: 10px; color: #6B7280; text-align: center; }
                  .sig { margin-top: 30px; display: flex; justify-content: space-between; }
                  .sig-box { width: 45%; border-top: 2px solid #0F172A; padding-top: 8px; font-size: 11px; color: #6B7280; }
                  @media print { body { padding: 20px; } }
                </style></head><body>
                <div class="header"><div><div class="logo">🚛 Comply<span>Fleet</span></div><div style="font-size:12px;color:#6B7280;margin-top:4px">DVSA Walkaround Check Record</div></div>
                <div style="text-align:right"><div style="font-size:24px;font-weight:800;font-family:monospace">${vehicle?.reg || ""}</div><div style="font-size:12px;color:#6B7280">${vehicle?.type || ""} · ${vehicle?.make || ""} ${vehicle?.model || ""}</div></div></div>
                <div class="info-grid">
                  <div class="info-item"><div class="info-label">Driver Name</div><div class="info-value">${driverName}</div></div>
                  <div class="info-item"><div class="info-label">Date & Time</div><div class="info-value">${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div></div>
                  <div class="info-item"><div class="info-label">Reference ID</div><div class="info-value">${referenceId}</div></div>
                  <div class="info-item"><div class="info-label">Odometer</div><div class="info-value">${odometer || "Not recorded"}</div></div>
                  <div class="info-item"><div class="info-label">Company</div><div class="info-value">${vehicle?.company_name || ""}</div></div>
                  <div class="info-item"><div class="info-label">Items Checked</div><div class="info-value">${totalItems} total · ${failedItems.length} failed</div></div>
                </div>
                <div class="result ${vehicleSafe ? "pass" : "fail-result"}">${vehicleSafe ? "✅ VEHICLE SAFE TO DRIVE" : "⚠️ VEHICLE NOT SAFE — DEFECTS REPORTED"}</div>
                <table><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Defect</th><th>Severity</th></tr></thead><tbody>
                ${allItems.map(i => `<tr class="${i.status === "fail" ? "fail" : ""}"><td>${i.category}</td><td>${i.item}</td><td style="font-weight:700;color:${i.status === "pass" ? "#059669" : "#DC2626"}">${i.status === "pass" ? "✓ PASS" : "✗ FAIL"}</td><td>${i.defect}</td><td style="font-weight:700;color:${i.severity === "dangerous" ? "#DC2626" : i.severity === "major" ? "#F97316" : "#F59E0B"}">${i.severity ? i.severity.toUpperCase() : ""}</td></tr>`).join("")}
                </tbody></table>
                <div class="sig"><div class="sig-box">Driver Signature: ${driverName}</div><div class="sig-box">Date: ${now.toLocaleDateString("en-GB")}</div></div>
                <div class="footer">Generated by ComplyFleet · complyfleet.vercel.app · This record is permanently stored and cannot be altered</div>
                </body></html>`);
                win.document.close();
                setTimeout(() => win.print(), 500);
              }} style={{ padding: "12px 24px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                🖨️ Print / Download Report
              </button>
              <button onClick={() => { window.location.href = "/walkaround"; }} style={{ padding: "12px 24px", borderRadius: "12px", border: "1px solid #E5E7EB", background: "#FFFFFF", fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
                🔄 New Check
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {step < successStep && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "white", borderTop: "1px solid #E2E8F0",
          padding: "14px 16px", paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)", zIndex: 50,
        }}>
          <div style={{ maxWidth: "520px", margin: "0 auto", display: "flex", gap: "10px" }}>
            {step > 0 && step < declarationStep + 1 && (
              <button onClick={() => {
                if (step === 3 && !hasDefects) setStep(2);
                else setStep(step - 1);
              }} style={{ padding: "14px 20px", borderRadius: "12px", border: "1.5px solid #E2E8F0", background: "white", fontSize: "14px", fontWeight: 600, color: "#6B7280", cursor: "pointer" }}>← Back</button>
            )}
            {step < declarationStep ? (
              <button onClick={handleNext} disabled={!canProceed()} style={{
                flex: 1, padding: "16px 24px", borderRadius: "14px", border: "none",
                background: canProceed() ? "linear-gradient(135deg, #2563EB, #1D4ED8)" : "#E2E8F0",
                color: canProceed() ? "white" : "#94A3B8",
                fontSize: "16px", fontWeight: 700, cursor: canProceed() ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: canProceed() ? "0 4px 16px rgba(37,99,235,0.3)" : "none",
                WebkitTapHighlightColor: "transparent",
              }}>
                {step === 0 ? "Start Check →" : "Continue →"}
              </button>
            ) : step === declarationStep && (
              <button onClick={handleSubmit} disabled={!canProceed() || submitting} style={{
                flex: 1, padding: "16px 24px", borderRadius: "14px", border: "none",
                background: canProceed() && !submitting
                  ? vehicleSafe ? "linear-gradient(135deg, #059669, #047857)" : "linear-gradient(135deg, #DC2626, #B91C1C)"
                  : "#E2E8F0",
                color: canProceed() ? "white" : "#94A3B8",
                fontSize: "16px", fontWeight: 700,
                cursor: canProceed() && !submitting ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: canProceed() ? `0 4px 16px ${vehicleSafe ? "rgba(5,150,105,0.3)" : "rgba(220,38,38,0.3)"}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                WebkitTapHighlightColor: "transparent",
              }}>
                {submitting ? (
                  <>
                    <span style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Submitting...
                  </>
                ) : <>Submit Check ✓</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
