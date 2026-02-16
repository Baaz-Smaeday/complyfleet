"use client";
import { useState, useMemo } from "react";

// ============================================================
// COMPLYFLEET SUPER ADMIN — Platform Owner Master Control Panel
// ============================================================

// --- Mock Data ---
const TODAY = new Date("2026-02-16");

const MRR_HISTORY = [
  { month: "Aug", mrr: 1580, tms: 22 },
  { month: "Sep", mrr: 2370, tms: 31 },
  { month: "Oct", mrr: 3240, tms: 42 },
  { month: "Nov", mrr: 4680, tms: 56 },
  { month: "Dec", mrr: 5910, tms: 68 },
  { month: "Jan", mrr: 7430, tms: 82 },
  { month: "Feb", mrr: 9170, tms: 97 },
];

const TRANSPORT_MANAGERS = [
  {
    id: "TM-001", name: "James Whitfield", email: "j.whitfield@logistics.co.uk", phone: "07700 900123",
    plan: "Enterprise", status: "active", mrr: 149, companies: 4, vehicles: 47, joinDate: "2025-06-12",
    lastLogin: "2026-02-16T09:14:00", checksThisMonth: 312, defectsOpen: 3, location: "Birmingham",
  },
  {
    id: "TM-002", name: "Sarah Patel", email: "sarah@pateltransport.com", phone: "07700 900456",
    plan: "Professional", status: "active", mrr: 79, companies: 2, vehicles: 18, joinDate: "2025-07-03",
    lastLogin: "2026-02-16T08:42:00", checksThisMonth: 134, defectsOpen: 1, location: "Leicester",
  },
  {
    id: "TM-003", name: "David Brennan", email: "d.brennan@northernhaulage.co.uk", phone: "07700 900789",
    plan: "Professional", status: "active", mrr: 79, companies: 3, vehicles: 26, joinDate: "2025-08-18",
    lastLogin: "2026-02-15T17:30:00", checksThisMonth: 198, defectsOpen: 5, location: "Manchester",
  },
  {
    id: "TM-004", name: "Emily Chen", email: "emily.chen@swiftfleet.uk", phone: "07700 900321",
    plan: "Enterprise", status: "active", mrr: 149, companies: 6, vehicles: 62, joinDate: "2025-05-20",
    lastLogin: "2026-02-16T10:02:00", checksThisMonth: 408, defectsOpen: 7, location: "London",
  },
  {
    id: "TM-005", name: "Michael O'Brien", email: "mob@obrientransport.ie", phone: "07700 900654",
    plan: "Starter", status: "active", mrr: 39, companies: 1, vehicles: 6, joinDate: "2025-11-01",
    lastLogin: "2026-02-14T12:15:00", checksThisMonth: 42, defectsOpen: 0, location: "Bristol",
  },
  {
    id: "TM-006", name: "Karen Woodhouse", email: "k.woodhouse@expresslog.co.uk", phone: "07700 900987",
    plan: "Starter", status: "trial", mrr: 39, companies: 1, vehicles: 3, joinDate: "2026-02-01",
    lastLogin: "2026-02-16T07:55:00", checksThisMonth: 18, defectsOpen: 1, location: "Leeds",
  },
  {
    id: "TM-007", name: "Robert Kaur", email: "robert@kaurfleet.co.uk", phone: "07700 900147",
    plan: "Professional", status: "past_due", mrr: 79, companies: 2, vehicles: 14, joinDate: "2025-09-15",
    lastLogin: "2026-02-10T16:20:00", checksThisMonth: 67, defectsOpen: 2, location: "Wolverhampton",
  },
  {
    id: "TM-008", name: "Fiona MacLeod", email: "fiona@highlandfreight.co.uk", phone: "07700 900258",
    plan: "Starter", status: "churned", mrr: 0, companies: 1, vehicles: 4, joinDate: "2025-08-01",
    lastLogin: "2025-12-22T11:00:00", checksThisMonth: 0, defectsOpen: 0, location: "Inverness",
  },
];

const RECENT_TRANSACTIONS = [
  { tm: "Emily Chen", amount: 149, plan: "Enterprise", date: "15 Feb 2026", status: "paid" },
  { tm: "James Whitfield", amount: 149, plan: "Enterprise", date: "14 Feb 2026", status: "paid" },
  { tm: "Sarah Patel", amount: 79, plan: "Professional", date: "14 Feb 2026", status: "paid" },
  { tm: "David Brennan", amount: 79, plan: "Professional", date: "13 Feb 2026", status: "paid" },
  { tm: "Robert Kaur", amount: 79, plan: "Professional", date: "10 Feb 2026", status: "failed" },
  { tm: "Michael O'Brien", amount: 39, plan: "Starter", date: "10 Feb 2026", status: "paid" },
];

const RECENT_ACTIVITY = [
  { icon: "\u{1F464}", msg: "Karen Woodhouse started 14-day trial", time: "15 days ago", type: "signup" },
  { icon: "\u2B06\uFE0F", msg: "Sarah Patel upgraded Starter \u2192 Professional", time: "3 days ago", type: "upgrade" },
  { icon: "\u{1F4B3}", msg: "\u00A3149 received from Emily Chen", time: "1 day ago", type: "payment" },
  { icon: "\u26A0\uFE0F", msg: "Robert Kaur payment failed \u2014 retry #2", time: "6 hours ago", type: "alert" },
  { icon: "\u2705", msg: "2,140 walkaround checks completed this month", time: "Just now", type: "checkin" },
];

// --- Helpers ---
function daysSince(dateStr) {
  return Math.floor((TODAY - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

function monthsBetween(dateStr) {
  return Math.max(1, Math.floor((TODAY - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 30)));
}

// --- Config ---
const STATUS_CONFIG = {
  active: { label: "ACTIVE", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981" },
  trial: { label: "TRIAL", bg: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6", dot: "#8B5CF6" },
  past_due: { label: "PAST DUE", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444" },
  churned: { label: "CHURNED", bg: "#F3F4F6", border: "#D1D5DB", text: "#6B7280", dot: "#9CA3AF" },
};

const PLAN_CONFIG = {
  Starter: { icon: "\u{1F680}", color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1", price: 39 },
  Professional: { icon: "\u26A1", color: "#2563EB", bg: "#EFF6FF", border: "#93C5FD", price: 79 },
  Enterprise: { icon: "\u{1F451}", color: "#D97706", bg: "#FEF3C7", border: "#FCD34D", price: 149 },
};

// --- Reusable Components ---

function StatCard({ icon, value, label, accent, subvalue }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: "16px", padding: "20px 24px",
      border: "1px solid #E5E7EB", transition: "all 0.2s ease",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: "16px",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{
        width: "48px", height: "48px", borderRadius: "12px",
        background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "28px", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500, marginTop: "4px", letterSpacing: "0.02em" }}>{label}</div>
        {subvalue && <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>{subvalue}</div>}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", borderRadius: "20px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: "10px", fontWeight: 700, color: cfg.text,
      letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function PlanPill({ plan }) {
  const cfg = PLAN_CONFIG[plan];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "20px",
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: "11px", fontWeight: 700, color: cfg.color, whiteSpace: "nowrap",
    }}>
      {cfg.icon} {plan} · \u00A3{cfg.price}
    </span>
  );
}

function MiniBarChart({ data, dataKey, color, height = 120 }) {
  const max = Math.max(...data.map(d => d[dataKey]));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height, width: "100%" }}>
      {data.map((d, i) => {
        const pct = (d[dataKey] / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>
              {dataKey === "mrr" ? `\u00A3${(d[dataKey] / 1000).toFixed(1)}k` : d[dataKey]}
            </div>
            <div style={{
              width: "100%", borderRadius: "6px 6px 2px 2px", background: color,
              height: `${Math.max(pct, 5)}%`, opacity: 0.15 + (i / data.length) * 0.85,
              transition: "height 0.3s ease",
            }} />
            <div style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 500 }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
}

// --- Add TM Modal ---
function AddTMModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", plan: "Starter", location: "" });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "520px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>Add Transport Manager</h2>
              <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>Create a new TM account and send invite</p>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94A3B8", padding: "4px",
            }}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { key: "name", label: "Full Name", placeholder: "e.g. James Whitfield", icon: "\u{1F464}" },
            { key: "email", label: "Email Address", placeholder: "e.g. james@company.co.uk", icon: "\u{1F4E7}" },
            { key: "phone", label: "Phone Number", placeholder: "e.g. 07700 900123", icon: "\u{1F4F1}" },
            { key: "location", label: "Location", placeholder: "e.g. Birmingham", icon: "\u{1F4CD}" },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>{label}</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{icon}</span>
                <input
                  type="text" placeholder={placeholder}
                  value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    width: "100%", padding: "10px 14px 10px 38px", border: "1px solid #E5E7EB",
                    borderRadius: "10px", fontSize: "14px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>Subscription Plan</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {["Starter", "Professional", "Enterprise"].map(plan => {
                const cfg = PLAN_CONFIG[plan];
                const selected = form.plan === plan;
                return (
                  <button key={plan} onClick={() => setForm({ ...form, plan })} style={{
                    padding: "12px 8px", borderRadius: "12px", border: `2px solid ${selected ? cfg.color : "#E5E7EB"}`,
                    background: selected ? cfg.bg : "#FFFFFF", cursor: "pointer", textAlign: "center", transition: "all 0.15s ease",
                  }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>{cfg.icon}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: selected ? cfg.color : "#374151" }}>{plan}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{"\u00A3"}{cfg.price}/mo</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{
          padding: "20px 28px", borderTop: "1px solid #F3F4F6", background: "#F8FAFC",
          display: "flex", justifyContent: "flex-end", gap: "12px",
        }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", border: "1px solid #E5E7EB", borderRadius: "10px",
            background: "#FFFFFF", fontSize: "13px", fontWeight: 600, color: "#6B7280", cursor: "pointer",
          }}>Cancel</button>
          <button style={{
            padding: "10px 24px", border: "none", borderRadius: "10px",
            background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
            fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          }}>{"\u{1F4E8}"} Create & Send Invite</button>
        </div>
      </div>
    </div>
  );
}

// --- TM Detail Panel ---
function TMDetailPanel({ tm, onClose }) {
  const loginDays = daysSince(tm.lastLogin);
  const tenure = monthsBetween(tm.joinDate);
  const ltv = tm.mrr * tenure;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "#FFFFFF", borderRadius: "20px", width: "100%", maxWidth: "640px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "24px 28px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "white",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px", fontWeight: 800, flexShrink: 0,
              }}>
                {tm.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>{tm.name}</h2>
                <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>{tm.id} {"\u00B7"} {tm.location}</div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <StatusPill status={tm.status} />
                  <PlanPill plan={tm.plan} />
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px",
              padding: "8px 12px", color: "white", cursor: "pointer", fontSize: "14px",
            }}>{"\u2715"}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #F3F4F6" }}>
          {[
            { label: "Companies", value: tm.companies },
            { label: "Vehicles", value: tm.vehicles },
            { label: "Checks/mo", value: tm.checksThisMonth },
            { label: "Open Defects", value: tm.defectsOpen },
          ].map(s => (
            <div key={s.label} style={{ padding: "16px", textAlign: "center", borderRight: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#0F172A" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            {[
              { icon: "\u{1F4E7}", label: "Email", value: tm.email },
              { icon: "\u{1F4F1}", label: "Phone", value: tm.phone },
              { icon: "\u{1F4C5}", label: "Joined", value: new Date(tm.joinDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
              { icon: "\u{1F550}", label: "Last Login", value: loginDays === 0 ? "Today" : loginDays === 1 ? "Yesterday" : `${loginDays} days ago` },
            ].map(item => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 14px", borderRadius: "12px", background: "#F8FAFC",
              }}>
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: "20px 24px", borderRadius: "16px",
            background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.6, fontWeight: 500 }}>Lifetime Revenue</div>
              <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{"\u00A3"}{ltv.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", opacity: 0.6, fontWeight: 500 }}>Tenure</div>
              <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{tenure} months</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button style={{
              flex: 1, padding: "12px", borderRadius: "12px", border: "none",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}>{"\u{1F4E7}"} Email TM</button>
            <button style={{
              flex: 1, padding: "12px", borderRadius: "12px",
              border: "1px solid #E5E7EB", background: "#F8FAFC",
              fontSize: "13px", fontWeight: 700, color: "#374151", cursor: "pointer",
            }}>{"\u{1F441}\uFE0F"} Login As TM</button>
            <button style={{
              padding: "12px 16px", borderRadius: "12px",
              border: "1px solid #E5E7EB", background: "#F8FAFC",
              fontSize: "13px", cursor: "pointer",
            }}>{"\u270F\uFE0F"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function ComplyFleetSuperAdmin() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddTM, setShowAddTM] = useState(false);
  const [selectedTM, setSelectedTM] = useState(null);
  const [tmFilter, setTMFilter] = useState("all");

  const totalMRR = 9170;
  const totalARR = totalMRR * 12;
  const activeTMs = TRANSPORT_MANAGERS.filter(t => t.status === "active" || t.status === "trial").length;
  const totalVehicles = TRANSPORT_MANAGERS.reduce((s, t) => s + t.vehicles, 0);
  const totalCompanies = TRANSPORT_MANAGERS.reduce((s, t) => s + t.companies, 0);

  const filteredTMs = useMemo(() => {
    let tms = TRANSPORT_MANAGERS;
    if (tmFilter !== "all") tms = tms.filter(t => t.status === tmFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tms = tms.filter(t =>
        t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
      );
    }
    return tms;
  }, [tmFilter, searchQuery]);

  const navItems = [
    { id: "overview", icon: "\u{1F4CA}", label: "Overview" },
    { id: "tms", icon: "\u{1F465}", label: "Transport Managers" },
    { id: "billing", icon: "\u{1F4B3}", label: "Billing & Revenue" },
    { id: "analytics", icon: "\u{1F4C8}", label: "Platform Analytics" },
  ];

  // --- TAB: OVERVIEW ---
  function OverviewTab() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <StatCard icon={"\u{1F4B0}"} value={`\u00A3${totalMRR.toLocaleString()}`} label="Monthly Recurring Revenue" subvalue={`\u00A3${totalARR.toLocaleString()} ARR`} accent="#2563EB" />
          <StatCard icon={"\u{1F465}"} value={activeTMs} label="Active Transport Managers" subvalue={`${TRANSPORT_MANAGERS.length} total accounts`} accent="#7C3AED" />
          <StatCard icon={"\u{1F69B}"} value={totalVehicles} label="Vehicles on Platform" subvalue={`Across ${totalCompanies} companies`} accent="#D97706" />
          <StatCard icon={"\u2705"} value="2,140" label="Walkaround Checks (Feb)" subvalue="94.2% completion rate" accent="#059669" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>MRR Growth</h3>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>Monthly recurring revenue trend</p>
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "20px", background: "#D1FAE5",
                fontSize: "11px", fontWeight: 700, color: "#065F46",
              }}>{"\u{1F4C8}"} +480% since Aug</span>
            </div>
            <MiniBarChart data={MRR_HISTORY} dataKey="mrr" color="#2563EB" height={140} />
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0" }}>Revenue by Plan</h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 20px 0" }}>Current MRR split</p>
            {[
              { plan: "Starter \u00A339", count: 60, mrr: 2340, color: "#64748B", pct: 26 },
              { plan: "Professional \u00A379", count: 53, mrr: 4187, color: "#2563EB", pct: 46 },
              { plan: "Enterprise \u00A3149", count: 18, mrr: 2643, color: "#D97706", pct: 28 },
            ].map(p => (
              <div key={p.plan} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>{p.plan}</span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>{"\u00A3"}{p.mrr.toLocaleString()}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "#F1F5F9", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, borderRadius: "4px", background: p.color, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px" }}>{p.count} subscribers</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0" }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {RECENT_ACTIVITY.map((a, i) => {
                const bgColors = { signup: "#EDE9FE", upgrade: "#DBEAFE", payment: "#D1FAE5", alert: "#FEE2E2", checkin: "#FEF3C7" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "10px",
                      background: bgColors[a.type], display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "16px", flexShrink: 0,
                    }}>{a.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.msg}</p>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94A3B8", flexShrink: 0, fontWeight: 500 }}>{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0" }}>{"\u26A1"} Needs Your Attention</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: "\u{1F534}", title: "Failed Payment", desc: "Robert Kaur \u2014 \u00A379 failed, retry #2 pending", action: "Resolve", bg: "#FEF2F2", border: "#FECACA" },
                { icon: "\u23F0", title: "Trial Expiring", desc: "Karen Woodhouse \u2014 trial ends in 13 days", action: "Follow Up", bg: "#FFFBEB", border: "#FDE68A" },
                { icon: "\u{1F4A4}", title: "Churned Account", desc: "Fiona MacLeod \u2014 inactive since Dec 2025", action: "Win Back", bg: "#F3F4F6", border: "#E5E7EB" },
                { icon: "\u26A0\uFE0F", title: "High Defect Rate", desc: "David Brennan \u2014 5 open defects across 3 companies", action: "Review", bg: "#FFF7ED", border: "#FED7AA" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: "12px",
                  background: item.bg, border: `1px solid ${item.border}`,
                }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{item.title}</div>
                    <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>{item.desc}</div>
                  </div>
                  <button style={{
                    padding: "6px 12px", borderRadius: "8px", border: "none",
                    background: "rgba(0,0,0,0.06)", fontSize: "11px", fontWeight: 700,
                    color: "#374151", cursor: "pointer", whiteSpace: "nowrap",
                  }}>{item.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- TAB: TMs ---
  function TMsTab() {
    const statusCounts = {
      all: TRANSPORT_MANAGERS.length,
      active: TRANSPORT_MANAGERS.filter(t => t.status === "active").length,
      trial: TRANSPORT_MANAGERS.filter(t => t.status === "trial").length,
      past_due: TRANSPORT_MANAGERS.filter(t => t.status === "past_due").length,
      churned: TRANSPORT_MANAGERS.filter(t => t.status === "churned").length,
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>Transport Managers</h2>
            <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>{TRANSPORT_MANAGERS.length} total accounts {"\u00B7"} {activeTMs} active</p>
          </div>
          <button onClick={() => setShowAddTM(true)} style={{
            padding: "10px 20px", border: "none", borderRadius: "12px",
            background: "linear-gradient(135deg, #0F172A, #1E293B)", color: "white",
            fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
          }}>{"\u2795"} Add TM</button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" }, { key: "active", label: "Active" },
            { key: "trial", label: "Trial" }, { key: "past_due", label: "Past Due" },
            { key: "churned", label: "Churned" },
          ].map(f => (
            <button key={f.key} onClick={() => setTMFilter(f.key)} style={{
              padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: tmFilter === f.key ? "#0F172A" : "#F1F5F9",
              color: tmFilter === f.key ? "white" : "#64748B",
              fontSize: "12px", fontWeight: 700, transition: "all 0.15s ease",
            }}>
              {f.label} <span style={{ opacity: 0.6, marginLeft: "4px" }}>{statusCounts[f.key]}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>{"\u{1F50D}"}</span>
            <input
              type="text" placeholder="Search TMs..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px 8px 36px", border: "1px solid #E5E7EB", borderRadius: "10px",
                fontSize: "13px", width: "240px", outline: "none", background: "#FAFAFA", fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Transport Manager", "Plan", "Status", "Companies", "Vehicles", "MRR", "Last Login", ""].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left", fontSize: "10px", fontWeight: 700,
                      color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: "2px solid #E5E7EB",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTMs.map(tm => {
                  const loginDays = daysSince(tm.lastLogin);
                  return (
                    <tr key={tm.id} style={{ borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
                      onClick={() => setSelectedTM(tm)}
                      onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "38px", height: "38px", borderRadius: "12px",
                            background: "linear-gradient(135deg, #1E293B, #334155)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontWeight: 700, fontSize: "13px", flexShrink: 0,
                          }}>
                            {tm.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>{tm.name}</div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>{tm.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}><PlanPill plan={tm.plan} /></td>
                      <td style={{ padding: "14px 16px" }}><StatusPill status={tm.status} /></td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{tm.companies}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{tm.vehicles}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 800, fontSize: "14px", color: "#0F172A" }}>{"\u00A3"}{tm.mrr}</td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: loginDays === 0 ? "#059669" : "#6B7280", fontWeight: loginDays === 0 ? 700 : 500 }}>
                        {loginDays === 0 ? "Today" : loginDays === 1 ? "Yesterday" : `${loginDays}d ago`}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ cursor: "pointer", fontSize: "16px", color: "#94A3B8" }}>{"\u22EF"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTMs.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#94A3B8", fontSize: "14px" }}>
              No transport managers match your filters
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TAB: BILLING ---
  function BillingTab() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>Billing & Revenue</h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>Financial overview and subscription metrics</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <StatCard icon={"\u{1F4B0}"} value={"\u00A39,170"} label="MRR" accent="#2563EB" />
          <StatCard icon={"\u{1F4CA}"} value={"\u00A3110,040"} label="ARR (Projected)" accent="#7C3AED" />
          <StatCard icon={"\u{1F4C9}"} value="1.8%" label="Churn Rate" subvalue={"\u2193 0.3% from Jan"} accent="#059669" />
          <StatCard icon={"\u{1F3AF}"} value={"\u00A394.54"} label="ARPU" subvalue="Per active TM" accent="#D97706" />
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>MRR vs Customer Growth</h3>
              <p style={{ fontSize: "12px", color: "#64748B", margin: "4px 0 0" }}>Revenue scales with TM acquisition</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{"\u{1F4B0}"} MRR ({"\u00A3"})</div>
              <MiniBarChart data={MRR_HISTORY} dataKey="mrr" color="#2563EB" height={120} />
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{"\u{1F465}"} Total TMs</div>
              <MiniBarChart data={MRR_HISTORY} dataKey="tms" color="#059669" height={120} />
            </div>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: 0 }}>Recent Transactions</h3>
            <button style={{
              padding: "6px 14px", borderRadius: "8px", border: "1px solid #E5E7EB",
              background: "#FFFFFF", fontSize: "12px", fontWeight: 600, color: "#2563EB", cursor: "pointer",
            }}>{"\u{1F4E5}"} Export CSV</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {RECENT_TRANSACTIONS.map((tx, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 14px", borderRadius: "10px", transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: tx.status === "paid" ? "#D1FAE5" : "#FEE2E2",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0,
                }}>{tx.status === "paid" ? "\u2705" : "\u274C"}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>{tx.tm}</span>
                  <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "8px" }}>{tx.plan}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#6B7280" }}>{tx.date}</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: tx.status === "paid" ? "#059669" : "#DC2626", minWidth: "60px", textAlign: "right" }}>
                  {tx.status === "paid" ? "+" : ""}{"\u00A3"}{tx.amount}
                </span>
                <span style={{
                  padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                  background: tx.status === "paid" ? "#D1FAE5" : "#FEE2E2",
                  color: tx.status === "paid" ? "#065F46" : "#991B1B",
                }}>{tx.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TAB: ANALYTICS ---
  function AnalyticsTab() {
    const walkaroundData = [
      { month: "Aug", checks: 340 }, { month: "Sep", checks: 520 },
      { month: "Oct", checks: 780 }, { month: "Nov", checks: 1120 },
      { month: "Dec", checks: 1340 }, { month: "Jan", checks: 1680 },
      { month: "Feb", checks: 2140 },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>Platform Analytics</h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0" }}>Usage metrics and platform health</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <StatCard icon={"\u2705"} value="2,140" label="Total Checks (Feb)" accent="#059669" />
          <StatCard icon={"\u26A0\uFE0F"} value="19" label="Open Defects" subvalue="Across all fleets" accent="#DC2626" />
          <StatCard icon={"\u{1F4CB}"} value="11.9" label="Avg Checks / Vehicle" subvalue="Per month" accent="#2563EB" />
          <StatCard icon={"\u{1F4F1}"} value="180" label="QR Codes Generated" subvalue="All time" accent="#7C3AED" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0" }}>Walkaround Check Volume</h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 20px 0" }}>Monthly platform-wide checks</p>
            <MiniBarChart data={walkaroundData} dataKey="checks" color="#059669" height={140} />
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", margin: "0 0 16px 0" }}>{"\u{1F3C6}"} Top TMs by Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {TRANSPORT_MANAGERS
                .filter(t => t.status !== "churned")
                .sort((a, b) => b.checksThisMonth - a.checksThisMonth)
                .slice(0, 5)
                .map((tm, i) => {
                  const max = 408;
                  const pct = (tm.checksThisMonth / max) * 100;
                  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}", "4", "5"];
                  return (
                    <div key={tm.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: i < 3 ? "16px" : "12px", fontWeight: 700, color: "#94A3B8", width: "24px", textAlign: "center" }}>
                            {medals[i]}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{tm.name}</span>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>{tm.checksThisMonth}</span>
                      </div>
                      <div style={{ height: "6px", borderRadius: "3px", background: "#F1F5F9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: "3px", width: `${pct}%`,
                          background: i === 0 ? "#2563EB" : i === 1 ? "#3B82F6" : i === 2 ? "#60A5FA" : "#93C5FD",
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div style={{
      minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
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
          <div>
            <span style={{ color: "white", fontWeight: 800, fontSize: "18px", letterSpacing: "-0.02em" }}>
              Comply<span style={{ color: "#60A5FA" }}>Fleet</span>
            </span>
            <span style={{
              marginLeft: "10px", padding: "2px 8px", borderRadius: "6px",
              background: "rgba(239,68,68,0.2)", color: "#FCA5A5",
              fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
            }}>SUPER ADMIN</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "4px", height: "100%", alignItems: "center" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer",
              background: activeTab === item.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: activeTab === item.id ? "white" : "#64748B",
              fontSize: "13px", fontWeight: activeTab === item.id ? 700 : 500,
              transition: "all 0.15s ease", fontFamily: "inherit",
            }}
              onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "15px" }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            position: "relative", width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <span style={{ fontSize: "18px" }}>{"\u{1F514}"}</span>
            <span style={{
              position: "absolute", top: "-4px", right: "-4px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#EF4444", color: "white", fontSize: "10px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0F172A",
            }}>2</span>
          </div>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "linear-gradient(135deg, #EF4444, #DC2626)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer",
          }}>SA</div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
            {activeTab === "overview" && "Dashboard Overview"}
            {activeTab === "tms" && "Transport Managers"}
            {activeTab === "billing" && "Billing & Revenue"}
            {activeTab === "analytics" && "Platform Analytics"}
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
            {TODAY.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} {"\u00B7"} Platform Owner Control Panel
          </p>
        </div>

        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "tms" && <TMsTab />}
        {activeTab === "billing" && <BillingTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </main>

      <footer style={{
        textAlign: "center", padding: "24px 20px", marginTop: "40px",
        borderTop: "1px solid #E2E8F0", color: "#94A3B8", fontSize: "11px",
      }}>
        ComplyFleet v1.0 {"\u00B7"} Super Admin Panel {"\u00B7"} {"\u00A9"} 2026
      </footer>

      {showAddTM && <AddTMModal onClose={() => setShowAddTM(false)} />}
      {selectedTM && <TMDetailPanel tm={selectedTM} onClose={() => setSelectedTM(null)} />}
    </div>
  );
}
