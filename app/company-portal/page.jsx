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
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Badge({ label, color, bg, border }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${border || color + '33'}`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export default function CompanyPortal() {
  const [company, setCompany] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [defects, setDefects] = useState([]);
  const [checks, setChecks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverHours, setDriverHours] = useState([]);
  const [tachoUploads, setTachoUploads] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: companyData } = await supabase
      .from('companies').select('*').eq('user_id', user.id).single();

    if (!companyData) { setLoading(false); return; }
    setCompany(companyData);

    const cid = companyData.id;
    const [{ data: v }, { data: d }, { data: c }, { data: dr }, { data: dh }, { data: tu }, { data: qr }] = await Promise.all([
      supabase.from('vehicles').select('*').eq('company_id', cid).is('archived_at', null),
      supabase.from('defects').select('*').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('walkaround_checks').select('*, drivers(name)').eq('company_id', cid).order('created_at', { ascending: false }).limit(20),
      supabase.from('drivers').select('*').eq('company_id', cid).is('archived_at', null),
      supabase.from('driver_hours').select('*, drivers(name)').eq('company_id', cid).order('shift_date', { ascending: false }),
      supabase.from('tacho_uploads').select('*, drivers(name)').eq('company_id', cid).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('id, registration, qr_code').eq('company_id', cid).not('qr_code', 'is', null),
    ]);

    setVehicles(v || []);
    setDefects(d || []);
    setChecks(c || []);
    setDrivers(dr || []);
    setDriverHours((dh || []).map(r => ({ ...r, driverName: r.drivers?.name || 'Unknown' })));
    setTachoUploads((tu || []).map(r => ({ ...r, driverName: r.drivers?.name || 'Unknown' })));
    setQrCodes(qr || []);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚛</div>
        <div style={{ color: '#64748b' }}>Loading your portal...</div>
      </div>
    </div>
  );

  if (!company) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>No company linked</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Your account isn't linked to a company yet. Contact your Transport Manager or ComplyFleet support.</div>
        <button onClick={signOut} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
      </div>
    </div>
  );

  const openDefects = defects.filter(d => d.status === 'open');
  const dangerousDefects = openDefects.filter(d => d.severity === 'DANGEROUS');
  const overdueVehicles = vehicles.filter(v => v.mot_expiry && new Date(v.mot_expiry) < new Date());
  const hoursViolations = driverHours.filter(h => h.violations?.length > 0);
  const complianceScore = Math.max(0, 100 - (dangerousDefects.length * 20) - (openDefects.length * 5) - (overdueVehicles.length * 15) - (hoursViolations.length * 3));
  const scoreColor = complianceScore >= 80 ? '#16a34a' : complianceScore >= 60 ? '#d97706' : '#dc2626';

  const TABS = [
    { key: 'overview',  icon: '📊', label: 'Overview' },
    { key: 'vehicles',  icon: '🚛', label: `Vehicles (${vehicles.length})` },
    { key: 'defects',   icon: '⚠️', label: `Defects (${openDefects.length})` },
    { key: 'checks',    icon: '📋', label: `Checks (${checks.length})` },
    { key: 'drivers',   icon: '👤', label: `Drivers (${drivers.length})` },
    { key: 'hours',     icon: '⏱️', label: `Driver Hours (${hoursViolations.length} violations)` },
    { key: 'qrcodes',   icon: '📱', label: `QR Codes (${qrCodes.length})` },
    { key: 'tacho',     icon: '📁', label: `Tacho (${tachoUploads.length})` },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: '#0f172a', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🚛</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Comply<span style={{ color: '#3b82f6' }}>Fleet</span></span>
          <span style={{ background: '#1e40af', color: '#93c5fd', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>COMPANY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>{company.name}</span>
          <button onClick={signOut} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '14px 16px', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: activeTab === t.key ? '#1e40af' : '#64748b', borderBottom: activeTab === t.key ? '2px solid #1e40af' : '2px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 32 }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>{company.name}</h1>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{company.operator_licence && `Licence: ${company.operator_licence}`}</div>
            </div>

            {dangerousDefects.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#991b1b' }}>Immediate action required</div>
                  <div style={{ color: '#dc2626', fontSize: 13 }}>{dangerousDefects.length} dangerous defect{dangerousDefects.length > 1 ? 's' : ''} — vehicle must not be driven</div>
                </div>
              </div>
            )}

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
              {[
                { icon: '🚛', val: vehicles.length,        label: 'Vehicles',          color: '#2563eb', danger: false },
                { icon: '⚠️', val: openDefects.length,     label: 'Open Defects',      color: openDefects.length > 0 ? '#dc2626' : '#16a34a', danger: openDefects.length > 0 },
                { icon: '📋', val: checks.length,           label: 'Checks',            color: '#7c3aed', danger: false },
                { icon: '👤', val: drivers.length,          label: 'Drivers',           color: '#0369a1', danger: false },
                { icon: '⏱️', val: hoursViolations.length, label: 'Hours Violations',  color: hoursViolations.length > 0 ? '#dc2626' : '#16a34a', danger: hoursViolations.length > 0 },
                { icon: '📁', val: tachoUploads.length,    label: 'Tacho Uploads',     color: '#374151', danger: false },
              ].map(s => (
                <div key={s.label} style={{ background: s.danger ? '#fff5f5' : '#fff', borderRadius: 14, padding: '18px 20px', border: s.danger ? '1px solid #fecaca' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: s.danger ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Score */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>📊 Compliance Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 88, height: 88, borderRadius: '50%', border: `6px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{complianceScore}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>{complianceScore >= 80 ? '✅ Good Standing' : complianceScore >= 60 ? '⚠️ Needs Attention' : '🚨 High Risk'}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.8 }}>
                      {dangerousDefects.length > 0 && <div>🚨 {dangerousDefects.length} dangerous defects</div>}
                      {openDefects.length > 0 && <div>🔧 {openDefects.length} open defects</div>}
                      {overdueVehicles.length > 0 && <div>⏰ {overdueVehicles.length} overdue vehicles</div>}
                      {hoursViolations.length > 0 && <div>⏱️ {hoursViolations.length} hours violations</div>}
                      {complianceScore === 100 && <div>All checks passed!</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent checks */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>📋 Recent Checks</div>
                {checks.slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.drivers?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</div>
                    </div>
                    <Badge label={c.overall_status || 'PENDING'} color={c.overall_status === 'SAFE' ? '#16a34a' : '#dc2626'} bg={c.overall_status === 'SAFE' ? '#f0fdf4' : '#fef2f2'} />
                  </div>
                ))}
                {checks.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>No checks yet</div>}
              </div>
            </div>
          </>
        )}

        {/* ── VEHICLES ── */}
        {activeTab === 'vehicles' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>🚛 Vehicles</h2>
            {vehicles.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No vehicles yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vehicles.map(v => {
                  const motOverdue = v.mot_expiry && new Date(v.mot_expiry) < new Date();
                  return (
                    <div key={v.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: `1px solid ${motOverdue ? '#fecaca' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚛</div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.registration}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{v.make} {v.model} · {v.vehicle_type}</div>
                          {v.mot_expiry && <div style={{ fontSize: 11, color: motOverdue ? '#dc2626' : '#64748b', marginTop: 2 }}>MOT: {new Date(v.mot_expiry).toLocaleDateString('en-GB')}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {motOverdue && <Badge label="MOT Overdue" color="#dc2626" bg="#fef2f2" />}
                        <Badge label="Active" color="#16a34a" bg="#f0fdf4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </>
        )}

        {/* ── DEFECTS ── */}
        {activeTab === 'defects' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>⚠️ Defects</h2>
            {defects.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#16a34a', background: '#f0fdf4', borderRadius: 16, fontWeight: 700 }}>✅ No defects — all clear!</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {defects.map(d => (
                  <div key={d.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: `1px solid ${d.severity === 'DANGEROUS' ? '#fecaca' : '#e2e8f0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.description || d.category}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{new Date(d.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Badge label={d.severity} color={d.severity === 'DANGEROUS' ? '#dc2626' : d.severity === 'MAJOR' ? '#d97706' : '#64748b'} bg={d.severity === 'DANGEROUS' ? '#fef2f2' : d.severity === 'MAJOR' ? '#fffbeb' : '#f8fafc'} />
                        <Badge label={d.status?.toUpperCase()} color={d.status === 'open' ? '#dc2626' : '#16a34a'} bg={d.status === 'open' ? '#fff5f5' : '#f0fdf4'} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </>
        )}

        {/* ── CHECKS ── */}
        {activeTab === 'checks' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>📋 Walkaround Checks</h2>
            {checks.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No checks yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {checks.map(c => (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.drivers?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Ref: {c.reference} · {new Date(c.created_at).toLocaleDateString('en-GB')}</div>
                    </div>
                    <Badge label={c.overall_status || 'PENDING'} color={c.overall_status === 'SAFE' ? '#16a34a' : '#dc2626'} bg={c.overall_status === 'SAFE' ? '#f0fdf4' : '#fef2f2'} />
                  </div>
                ))}
              </div>
            }
          </>
        )}

        {/* ── DRIVERS ── */}
        {activeTab === 'drivers' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>👤 Drivers</h2>
            {drivers.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No drivers yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {drivers.map(d => (
                  <div key={d.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {d.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{d.licence_number || 'No licence on file'}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </>
        )}

        {/* ── DRIVER HOURS ── */}
        {activeTab === 'hours' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>⏱️ Driver Hours</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Daily limit 9hrs · Break 45min after 4.5hrs · Weekly max 56hrs</p>

            {hoursViolations.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🚨</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{hoursViolations.length} shift{hoursViolations.length > 1 ? 's' : ''} with DVSA violations</div>
              </div>
            )}

            {driverHours.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No driver hours logged yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {driverHours.map(row => {
                  const isBreached = row.violations?.length > 0;
                  return (
                    <div key={row.id} style={{ background: isBreached ? '#fff5f5' : '#fff', borderRadius: 14, padding: '16px 20px', border: `1px solid ${isBreached ? '#fecaca' : '#e2e8f0'}`, borderLeft: `4px solid ${isBreached ? '#dc2626' : '#16a34a'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.driverName}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{row.shift_date}</div>
                        </div>
                        <Badge label={isBreached ? `● ${row.violations.length} Violation${row.violations.length > 1 ? 's' : ''}` : '● Compliant'} color={isBreached ? '#dc2626' : '#16a34a'} bg={isBreached ? '#fef2f2' : '#f0fdf4'} />
                      </div>
                      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                        {[
                          { label: 'Driving', val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
                          { label: 'Break',   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
                          { label: 'Rest',    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : '—', warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
                        ].map(({ label, val, warn }) => (
                          <div key={label}>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: warn ? '#dc2626' : '#1e293b' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {row.violations?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          {row.violations.map(v => {
                            const meta = VIOLATION_META[v] || { label: v, color: '#6b7280', bg: '#f9fafb', icon: '⚡' };
                            return <Badge key={v} label={`${meta.icon} ${meta.label}`} color={meta.color} bg={meta.bg} />;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            }
          </>
        )}

        {/* ── QR CODES ── */}
        {activeTab === 'qrcodes' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>📱 QR Codes</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Permanent QR codes for vehicle walkaround checks — print and place in vehicle cab</p>
            {qrCodes.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No QR codes generated yet — contact your Transport Manager</div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {qrCodes.map(v => (
                  <div key={v.id} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{v.registration}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{v.qr_code?.slice(0, 12)}...</div>
                    <a href={`/portal/${v.qr_code}`} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-block', marginTop: 12, padding: '7px 16px', borderRadius: 8, background: '#0f172a', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Open Check
                    </a>
                  </div>
                ))}
              </div>
            }
          </>
        )}

        {/* ── TACHO UPLOADS ── */}
        {activeTab === 'tacho' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>📁 Tacho Uploads</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>Tachograph .ddd file upload history</p>
            {tachoUploads.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16 }}>No tacho files uploaded yet</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tachoUploads.map(u => (
                  <div key={u.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📁</div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{u.file_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.driverName} · {(u.file_size / 1024).toFixed(1)} KB · {new Date(u.created_at).toLocaleDateString('en-GB')}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.violations?.length > 0 && <Badge label={`⚠️ ${u.violations.length} violation${u.violations.length > 1 ? 's' : ''}`} color="#dc2626" bg="#fef2f2" />}
                      <Badge label={u.status === 'processed' ? '✅ Processed' : '⏳ Pending'} color={u.status === 'processed' ? '#16a34a' : '#d97706'} bg={u.status === 'processed' ? '#f0fdf4' : '#fffbeb'} />
                    </div>
                  </div>
                ))}
              </div>
            }
          </>
        )}

      </div>
    </div>
  );
}
