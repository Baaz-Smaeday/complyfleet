'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VIOLATION_META = {
  DAILY_DRIVING_EXCEEDED:   { label: 'Daily Driving Exceeded',   color: '#dc2626', bg: '#fef2f2', icon: '🚛' },
  BREAK_NOT_TAKEN:          { label: 'Break Not Taken',           color: '#d97706', bg: '#fffbeb', icon: '⏸️' },
  WEEKLY_HOURS_EXCEEDED:    { label: 'Weekly Hours Exceeded',     color: '#7c3aed', bg: '#f5f3ff', icon: '📅' },
  DAILY_REST_INSUFFICIENT:  { label: 'Daily Rest Insufficient',   color: '#0369a1', bg: '#eff6ff', icon: '🌙' },
  EXTENSION_LIMIT_EXCEEDED: { label: 'Extension Limit Exceeded',  color: '#be123c', bg: '#fff1f2', icon: '⚠️' },
};

function fmtMins(mins) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Badge({ label, color, bg }) {
  return <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${color}33`, whiteSpace: 'nowrap' }}>{label}</span>;
}

function GlowCard({ children, glowColor = '37,99,235', onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}
      style={{ position: 'relative', borderRadius: 18, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 20,
        background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, rgba(${glowColor},0.4) 40%, transparent 60%, rgba(${glowColor},0.6) 80%, rgba(${glowColor},0.9) 100%)` : 'transparent',
        animation: hovered ? 'spin 2s linear infinite' : 'none', zIndex: 0
      }} />
      <div style={{
        position: 'relative', zIndex: 1, borderRadius: 16, background: '#fff', overflow: 'hidden',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 12px 32px rgba(${glowColor},0.15)` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, glowColor, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: 18, flex: 1, minWidth: 130 }}>
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 20,
        background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, transparent 50%)` : 'transparent',
        animation: hovered ? 'spin 2s linear infinite' : 'none', zIndex: 0
      }} />
      <div style={{
        position: 'relative', zIndex: 1, background: danger ? '#fff5f5' : '#fff',
        borderRadius: 16, padding: '16px 18px', border: danger ? '1px solid #fecaca' : '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 12,
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 24px rgba(${glowColor},0.15)` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: danger ? '#fee2e2' : `rgba(${glowColor},0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// ── ADD VEHICLE MODAL — identical fields to TM version ──
function AddVehicleModal({ companyId, onClose, onSaved }) {
  const [form, setForm] = useState({
    reg: '', type: 'HGV', make: '', model: '', year: new Date().getFullYear().toString(),
    mot_due: '', pmi_due: '', insurance_due: '', tacho_due: '', service_due: '', pmi_interval: '6',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function generateQRCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'QR-';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  async function save() {
    if (!form.reg.trim()) { setError('Registration is required'); return; }
    setSaving(true); setError('');
    const qr_code = generateQRCode();
    const { error: err } = await supabase.from('vehicles').insert({
      reg:           form.reg.trim().toUpperCase(),
      type:          form.type,
      make:          form.make || null,
      model:         form.model || null,
      year:          form.year ? parseInt(form.year) : null,
      mot_due:       form.mot_due || null,
      pmi_due:       form.pmi_due || null,
      insurance_due: form.insurance_due || null,
      tacho_due:     form.tacho_due || null,
      service_due:   form.service_due || null,
      pmi_interval:  form.pmi_interval ? parseInt(form.pmi_interval) : 6,
      company_id:    companyId,
      status:        'active',
      qr_code:       qr_code,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  }

  const inp = { width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>+ Add Vehicle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>⚠️ {error}</div>}

          {/* Registration + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Registration *</label>
              <input value={form.reg} onChange={e => setForm({ ...form, reg: e.target.value.toUpperCase() })} placeholder="BD63 XYZ" style={inp} />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                {['HGV', 'LGV', 'Van', 'Trailer', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Make + Model + Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Make</label>
              <input value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} placeholder="DAF" style={inp} />
            </div>
            <div>
              <label style={lbl}>Model</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="CF 330" style={inp} />
            </div>
            <div>
              <label style={lbl}>Year</label>
              <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="2024" style={inp} />
            </div>
          </div>

          {/* Compliance Dates */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', marginBottom: 14 }}>📅 Compliance Dates</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'mot_due',       label: 'MOT Due' },
                { key: 'pmi_due',       label: 'PMI Due' },
                { key: 'insurance_due', label: 'Insurance' },
                { key: 'tacho_due',     label: 'Tacho Cal' },
                { key: 'service_due',   label: 'Service Due' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ ...lbl, color: '#1e40af' }}>{f.label}</label>
                  <input type="date" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ ...inp, borderColor: '#bfdbfe' }} />
                </div>
              ))}
              <div>
                <label style={{ ...lbl, color: '#1e40af' }}>PMI Interval (wks)</label>
                <input value={form.pmi_interval} onChange={e => setForm({ ...form, pmi_interval: e.target.value })} placeholder="6" style={{ ...inp, borderColor: '#bfdbfe' }} />
              </div>
            </div>
          </div>

          {/* QR note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>A QR code will be automatically generated for walkaround checks</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '11px 22px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={save} disabled={saving || !form.reg.trim()}
            style={{ padding: '11px 24px', border: 'none', borderRadius: 12, background: form.reg.trim() ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : '#e5e7eb', color: '#fff', fontSize: 14, fontWeight: 700, cursor: form.reg.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: form.reg.trim() ? '0 4px 14px rgba(37,99,235,0.4)' : 'none' }}>
            {saving ? 'Adding...' : '+ Add Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PORTAL ──
export default function CompanyPortal() {
  const [company, setCompany] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverHours, setDriverHours] = useState([]);
  const [tachoUploads, setTachoUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: co } = await supabase.from('companies').select('*').eq('user_id', user.id).single();
    if (!co) { setLoading(false); return; }
    setCompany(co);
    const cid = co.id;
    const [{ data: v }, { data: d }, { data: c }, { data: dr }, { data: dh }, { data: tu }] = await Promise.all([
      supabase.from('vehicles').select('*').eq('company_id', cid).is('archived_at', null),
      supabase.from('defects').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('walkaround_checks').select('*, drivers(name)').eq('company_id', cid).order('created_at', { ascending: false }).limit(20),
      supabase.from('drivers').select('*').eq('company_id', cid).is('archived_at', null),
      supabase.from('driver_hours').select('*, drivers(name)').eq('company_id', cid).order('shift_date', { ascending: false }),
      supabase.from('tacho_uploads').select('*, drivers(name)').eq('company_id', cid).order('created_at', { ascending: false }),
    ]);
    setVehicles(v || []); setDefects(d || []); setChecks(c || []);
    setDrivers(dr || []);
    setDriverHours((dh || []).map(r => ({ ...r, driverName: r.drivers?.name || 'Unknown' })));
    setTachoUploads((tu || []).map(r => ({ ...r, driverName: r.drivers?.name || 'Unknown' })));
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚛</div>
        <div style={{ color: '#64748b' }}>Loading your portal...</div>
      </div>
    </div>
  );

  if (!company) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>No company linked</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Contact your Transport Manager or ComplyFleet support.</div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
      </div>
    </div>
  );

  const openDefects = defects.filter(d => d.status === 'open');
  const dangerousDefects = openDefects.filter(d => d.severity === 'DANGEROUS');
  const overdueVehicles = vehicles.filter(v => {
    if (v.mot_due && new Date(v.mot_due) < new Date()) return true;
    if (v.mot_expiry && new Date(v.mot_expiry) < new Date()) return true;
    return false;
  });
  const hoursViolations = driverHours.filter(h => h.violations?.length > 0);
  const qrCodes = vehicles.filter(v => v.qr_code);
  const complianceScore = Math.max(0, 100 - dangerousDefects.length * 20 - openDefects.length * 5 - overdueVehicles.length * 15 - hoursViolations.length * 3);
  const scoreColor = complianceScore >= 80 ? '#16a34a' : complianceScore >= 60 ? '#d97706' : '#dc2626';
  const scoreGlow = complianceScore >= 80 ? '22,163,74' : complianceScore >= 60 ? '217,119,6' : '220,38,38';

  const NAV = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'vehicles', icon: '🚛', label: 'Vehicles' },
    { key: 'checks',   icon: '📋', label: 'Checks' },
    { key: 'defects',  icon: '⚠️', label: 'Defects' },
    { key: 'drivers',  icon: '👤', label: 'Drivers' },
    { key: 'hours',    icon: '⏱️', label: 'Hours' },
    { key: 'qrcodes',  icon: '📱', label: 'QR Codes' },
    { key: 'tacho',    icon: '📁', label: 'Tacho' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚛</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Comply<span style={{ color: '#3b82f6' }}>Fleet</span></span>
          <span style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(59,130,246,0.3)' }}>COMPANY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{company.name}</div>
            {company.operator_licence && <div style={{ color: '#64748b', fontSize: 10 }}>{company.operator_licence}</div>}
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
            {company.name?.charAt(0).toUpperCase()}
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 16px', animation: 'slideIn 0.3s ease' }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{company.name}</h1>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{company.operator_licence ? `Licence: ${company.operator_licence}` : 'No licence set'}</div>
              </div>
              <button onClick={() => setShowAddVehicle(true)} style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', fontFamily: 'inherit' }}>
                + Add Vehicle
              </button>
            </div>

            {dangerousDefects.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 16px rgba(220,38,38,0.1)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🚨</div>
                <div>
                  <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 13 }}>Immediate action required</div>
                  <div style={{ color: '#dc2626', fontSize: 12, marginTop: 2 }}>{dangerousDefects.length} dangerous defect{dangerousDefects.length > 1 ? 's' : ''} — vehicle must not be driven</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard icon="🚛" value={vehicles.length}        label="Vehicles"      color="#2563eb"  glowColor="37,99,235"  danger={false} />
              <StatCard icon="⚠️" value={openDefects.length}     label="Open Defects"  color={openDefects.length > 0 ? '#dc2626' : '#16a34a'} glowColor={openDefects.length > 0 ? '220,38,38' : '22,163,74'} danger={openDefects.length > 0} />
              <StatCard icon="📋" value={checks.length}          label="Checks"        color="#7c3aed"  glowColor="124,58,237" danger={false} />
              <StatCard icon="👤" value={drivers.length}         label="Drivers"       color="#0369a1"  glowColor="3,105,161"  danger={false} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Score */}
              <GlowCard glowColor={scoreGlow}>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>📊 Compliance Score</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="7"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - complianceScore / 100)}`}
                          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor }}>{complianceScore}</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>
                        {complianceScore >= 80 ? '✅ Good Standing' : complianceScore >= 60 ? '⚠️ Needs Attention' : '🚨 High Risk'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.8 }}>
                        {openDefects.length > 0 && <div>🔧 {openDefects.length} open defects</div>}
                        {overdueVehicles.length > 0 && <div>⏰ {overdueVehicles.length} overdue</div>}
                        {complianceScore === 100 && <div>All checks passed!</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* Recent Checks */}
              <GlowCard glowColor="124,58,237">
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>📋 Recent Checks</div>
                  {checks.length === 0
                    ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No checks yet</div>
                    : checks.slice(0, 4).map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.drivers?.name || 'Unknown'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</div>
                        </div>
                        <Badge label={c.overall_status || 'PENDING'} color={c.overall_status === 'SAFE' ? '#16a34a' : '#dc2626'} bg={c.overall_status === 'SAFE' ? '#f0fdf4' : '#fef2f2'} />
                      </div>
                    ))
                  }
                </div>
              </GlowCard>

              {/* Defects */}
              <GlowCard glowColor={openDefects.length > 0 ? '220,38,38' : '22,163,74'}>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>⚠️ Open Defects</div>
                  {openDefects.length === 0
                    ? <div style={{ color: '#16a34a', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '12px 0' }}>✅ No open defects</div>
                    : openDefects.slice(0, 3).map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', flex: 1, marginRight: 8 }}>{d.description || d.category}</div>
                        <Badge label={d.severity} color={d.severity === 'DANGEROUS' ? '#dc2626' : d.severity === 'MAJOR' ? '#d97706' : '#64748b'} bg={d.severity === 'DANGEROUS' ? '#fef2f2' : d.severity === 'MAJOR' ? '#fffbeb' : '#f8fafc'} />
                      </div>
                    ))
                  }
                </div>
              </GlowCard>

              {/* Vehicles */}
              <GlowCard glowColor="37,99,235">
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>🚛 Vehicles</div>
                    <button onClick={() => setShowAddVehicle(true)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                  </div>
                  {vehicles.length === 0
                    ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No vehicles yet</div>
                    : vehicles.slice(0, 4).map(v => {
                      const overdue = (v.mot_due && new Date(v.mot_due) < new Date()) || (v.mot_expiry && new Date(v.mot_expiry) < new Date());
                      return (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{v.reg}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{v.type}</div>
                          </div>
                          {overdue ? <Badge label="Overdue" color="#dc2626" bg="#fef2f2" /> : <Badge label="✅ OK" color="#16a34a" bg="#f0fdf4" />}
                        </div>
                      );
                    })
                  }
                </div>
              </GlowCard>
            </div>
          </>
        )}

        {/* ── VEHICLES ── */}
        {activeTab === 'vehicles' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>🚛 Vehicles</h2>
              <button onClick={() => setShowAddVehicle(true)} style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', fontFamily: 'inherit' }}>+ Add Vehicle</button>
            </div>
            {vehicles.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No vehicles yet</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vehicles.map(v => {
                  const motOverdue = (v.mot_due && new Date(v.mot_due) < new Date()) || (v.mot_expiry && new Date(v.mot_expiry) < new Date());
                  const motDate = v.mot_due || v.mot_expiry;
                  return (
                    <GlowCard key={v.id} glowColor={motOverdue ? '220,38,38' : '37,99,235'}>
                      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: motOverdue ? '#fee2e2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{v.reg}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{[v.make, v.model, v.year].filter(Boolean).join(' ')} · {v.type}</div>
                            {motDate && <div style={{ fontSize: 11, color: motOverdue ? '#dc2626' : '#64748b', marginTop: 2 }}>MOT: {new Date(motDate).toLocaleDateString('en-GB')}</div>}
                            {v.qr_code && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>📱 {v.qr_code}</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                          {motOverdue && <Badge label="MOT Overdue" color="#dc2626" bg="#fef2f2" />}
                          <Badge label="Active" color="#16a34a" bg="#f0fdf4" />
                        </div>
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            }
          </>
        )}

        {/* ── CHECKS ── */}
        {activeTab === 'checks' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>📋 Walkaround Checks</h2>
            {checks.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No checks yet</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {checks.map(c => (
                  <GlowCard key={c.id} glowColor={c.overall_status === 'SAFE' ? '22,163,74' : '220,38,38'}>
                    <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.drivers?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ref: {c.reference} · {new Date(c.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                      <Badge label={c.overall_status || 'PENDING'} color={c.overall_status === 'SAFE' ? '#16a34a' : '#dc2626'} bg={c.overall_status === 'SAFE' ? '#f0fdf4' : '#fef2f2'} />
                    </div>
                  </GlowCard>
                ))}
              </div>
            }
          </>
        )}

        {/* ── DEFECTS ── */}
        {activeTab === 'defects' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>⚠️ Defects</h2>
            {defects.length === 0
              ? <GlowCard glowColor="22,163,74"><div style={{ padding: 48, textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>✅ No defects — all clear!</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {defects.map(d => (
                  <GlowCard key={d.id} glowColor={d.severity === 'DANGEROUS' ? '220,38,38' : d.severity === 'MAJOR' ? '217,119,6' : '100,116,139'}>
                    <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.description || d.category}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{new Date(d.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Badge label={d.severity} color={d.severity === 'DANGEROUS' ? '#dc2626' : d.severity === 'MAJOR' ? '#d97706' : '#64748b'} bg={d.severity === 'DANGEROUS' ? '#fef2f2' : d.severity === 'MAJOR' ? '#fffbeb' : '#f8fafc'} />
                        <Badge label={d.status?.toUpperCase()} color={d.status === 'open' ? '#dc2626' : '#16a34a'} bg={d.status === 'open' ? '#fff5f5' : '#f0fdf4'} />
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            }
          </>
        )}

        {/* ── DRIVERS ── */}
        {activeTab === 'drivers' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>👤 Drivers</h2>
            {drivers.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No drivers yet</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {drivers.map(d => (
                  <GlowCard key={d.id} glowColor="37,99,235">
                    <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                        {d.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{d.licence_number || 'No licence on file'}</div>
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            }
          </>
        )}

        {/* ── DRIVER HOURS ── */}
        {activeTab === 'hours' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>⏱️ Driver Hours</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Daily limit 9hrs · Break 45min after 4.5hrs · Weekly max 56hrs</p>
            {driverHours.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No driver hours logged yet</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {driverHours.map(row => {
                  const isBreached = row.violations?.length > 0;
                  return (
                    <GlowCard key={row.id} glowColor={isBreached ? '220,38,38' : '22,163,74'}>
                      <div style={{ padding: '14px 18px', borderLeft: `4px solid ${isBreached ? '#dc2626' : '#16a34a'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.driverName}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{row.shift_date}</div>
                          </div>
                          <Badge label={isBreached ? `● ${row.violations.length} Violation${row.violations.length > 1 ? 's' : ''}` : '● Compliant'} color={isBreached ? '#dc2626' : '#16a34a'} bg={isBreached ? '#fef2f2' : '#f0fdf4'} />
                        </div>
                        <div style={{ display: 'flex', gap: 20 }}>
                          {[
                            { label: 'Driving', val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
                            { label: 'Break',   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
                            { label: 'Rest',    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : '—', warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
                          ].map(({ label, val, warn }) => (
                            <div key={label}>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: warn ? '#dc2626' : '#1e293b' }}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {row.violations?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {row.violations.map(v => {
                              const meta = VIOLATION_META[v] || { label: v, color: '#6b7280', bg: '#f9fafb', icon: '⚡' };
                              return <Badge key={v} label={`${meta.icon} ${meta.label}`} color={meta.color} bg={meta.bg} />;
                            })}
                          </div>
                        )}
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            }
          </>
        )}

        {/* ── QR CODES ── */}
        {activeTab === 'qrcodes' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>📱 QR Codes</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Print and place in vehicle cab for driver walkaround checks</p>
            {qrCodes.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No QR codes yet — add vehicles to generate them automatically</div></GlowCard>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {qrCodes.map(v => (
                  <GlowCard key={v.id} glowColor="124,58,237">
                    <div style={{ padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{v.reg}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 12 }}>{v.qr_code}</div>
                      <a href={`/portal/${v.qr_code}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        Open →
                      </a>
                    </div>
                  </GlowCard>
                ))}
              </div>
            }
          </>
        )}

        {/* ── TACHO ── */}
        {activeTab === 'tacho' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>📁 Tacho Uploads</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>Tachograph .ddd file upload history</p>
            {tachoUploads.length === 0
              ? <GlowCard><div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No tacho files uploaded yet</div></GlowCard>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tachoUploads.map(u => (
                  <GlowCard key={u.id} glowColor={u.violations?.length > 0 ? '220,38,38' : '37,99,235'}>
                    <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📁</div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{u.file_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{u.driverName} · {new Date(u.created_at).toLocaleDateString('en-GB')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.violations?.length > 0 && <Badge label={`⚠️ ${u.violations.length}`} color="#dc2626" bg="#fef2f2" />}
                        <Badge label={u.status === 'processed' ? '✅ Done' : '⏳ Pending'} color={u.status === 'processed' ? '#16a34a' : '#d97706'} bg={u.status === 'processed' ? '#f0fdf4' : '#fffbeb'} />
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            }
          </>
        )}

      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', zIndex: 100, boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
        {NAV.map(n => (
          <button key={n.key} onClick={() => setActiveTab(n.key)}
            style={{ flex: 1, padding: '10px 4px 8px', border: 'none', background: activeTab === n.key ? '#eff6ff' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit', borderTop: activeTab === n.key ? '2px solid #1e40af' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: activeTab === n.key ? '#1e40af' : '#94a3b8' }}>{n.label}</span>
          </button>
        ))}
      </div>

      {showAddVehicle && <AddVehicleModal companyId={company.id} onClose={() => setShowAddVehicle(false)} onSaved={fetchData} />}
    </div>
  );
}
