'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import BackButton from '../../components/BackButton';

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

function ViolationBadge({ code }) {
  const meta = VIOLATION_META[code] || { label: code, color: '#6b7280', bg: '#f9fafb', icon: '⚡' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`,
      whiteSpace: 'nowrap'
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function GlowCard({ children, glowColor = '220,38,38', danger, style = {}, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: 18, cursor: onClick ? 'pointer' : 'default', ...style }}>
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 20,
        background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, rgba(${glowColor},0.4) 40%, transparent 60%, rgba(${glowColor},0.6) 80%, rgba(${glowColor},0.9) 100%)` : 'transparent',
        animation: hovered ? 'spin 2s linear infinite' : 'none', zIndex: 0
      }} />
      <div style={{
        position: 'relative', zIndex: 1, borderRadius: 16,
        background: danger ? '#fff5f5' : '#fff',
        borderLeft: danger ? '4px solid #dc2626' : '4px solid #16a34a',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 16px 40px rgba(${glowColor},0.2)` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color = '#1e293b', danger }) {
  const [hovered, setHovered] = useState(false);
  const glowColor = danger ? '220,38,38' : '5,150,105';
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: 18, flex: 1, minWidth: 160 }}>
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 20,
        background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, transparent 50%)` : 'transparent',
        animation: hovered ? 'spin 2s linear infinite' : 'none', zIndex: 0
      }} />
      <div style={{
        position: 'relative', zIndex: 1, background: danger ? '#fff5f5' : '#fff',
        borderRadius: 16, padding: '20px 24px', border: danger ? '1px solid #fecaca' : '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 16,
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 24px rgba(${glowColor},0.15)` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: danger ? '#fee2e2' : '#f1f5f9' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function LogHoursModal({ onClose, onSaved, drivers }) {
  const [form, setForm] = useState({
    driver_id: drivers[0]?.id || '',
    shift_date: new Date().toISOString().split('T')[0],
    driving_minutes: '', break_minutes: '', rest_minutes: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  function calcViolations(f) {
    const v = [];
    const driving = parseInt(f.driving_minutes) || 0;
    const breakMins = parseInt(f.break_minutes) || 0;
    const rest = parseInt(f.rest_minutes) || 0;
    if (driving > 600) v.push('EXTENSION_LIMIT_EXCEEDED');
    else if (driving > 540) v.push('DAILY_DRIVING_EXCEEDED');
    if (driving > 270 && breakMins < 45) v.push('BREAK_NOT_TAKEN');
    if (rest > 0 && rest < 660) v.push('DAILY_REST_INSUFFICIENT');
    return v;
  }

  async function save() {
    setSaving(true);
    const violations = calcViolations(form);
    const shiftStart = new Date(`${form.shift_date}T06:00:00`);
    const shiftEnd = new Date(shiftStart.getTime() + ((parseInt(form.driving_minutes) || 0) + (parseInt(form.break_minutes) || 0)) * 60000);
    const driver = drivers.find(d => d.id === form.driver_id);
    const { error } = await supabase.from('driver_hours').insert({
      driver_id: form.driver_id, company_id: driver?.company_id,
      shift_date: form.shift_date, shift_start: shiftStart.toISOString(), shift_end: shiftEnd.toISOString(),
      driving_minutes: parseInt(form.driving_minutes) || 0, break_minutes: parseInt(form.break_minutes) || 0,
      rest_minutes: parseInt(form.rest_minutes) || 0, violations, notes: form.notes || null,
    });
    setSaving(false);
    if (!error) { onSaved(); onClose(); }
    else alert('Error saving: ' + error.message);
  }

  const violations = calcViolations(form);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>⏱️ Log Driver Hours</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Violations are calculated automatically</div>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Driver *</label>
            <select value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Shift Date *</label>
            <input type="date" value={form.shift_date} onChange={e => setForm({ ...form, shift_date: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { key: 'driving_minutes', label: 'Driving (mins)', placeholder: '540' },
              { key: 'break_minutes',   label: 'Break (mins)',   placeholder: '45' },
              { key: 'rest_minutes',    label: 'Rest (mins)',    placeholder: '660' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                <input type="number" value={form[f.key]} placeholder={f.placeholder} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          {violations.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>⚠️ Violations detected:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {violations.map(v => <ViolationBadge key={v} code={v} />)}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '20px 28px', borderTop: '1px solid #f3f4f6', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving || !form.driver_id || !form.driving_minutes}
            style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: form.driver_id && form.driving_minutes ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : '#e5e7eb', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ row, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{row.driver}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{row.shift_date}</div>
          </div>
          <span style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: row.violations?.length ? '#fef2f2' : '#f0fdf4', color: row.violations?.length ? '#dc2626' : '#16a34a', border: `1px solid ${row.violations?.length ? '#fecaca' : '#bbf7d0'}` }}>
            {row.violations?.length ? `${row.violations.length} Violation${row.violations.length > 1 ? 's' : ''}` : '✅ Compliant'}
          </span>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Driving', val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
              { label: 'Break',   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
              { label: 'Rest',    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : '—', warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
            ].map(({ label, val, warn }) => (
              <div key={label} style={{ background: warn ? '#fef2f2' : '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: warn ? '#dc2626' : '#0f172a' }}>{val}</div>
              </div>
            ))}
          </div>
          {row.violations?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Violations</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {row.violations.map(v => <ViolationBadge key={v} code={v} />)}
              </div>
            </div>
          )}
          {row.notes && <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#64748b' }}>📝 {row.notes}</div>}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function DriverHoursPage() {
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [driverFilter, setDriverFilter] = useState('All Drivers');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  async function fetchData() {
    setLoading(true);
    const [{ data: hours }, { data: driverList }] = await Promise.all([
      supabase.from('driver_hours').select('*, drivers(name, company_id)').order('shift_date', { ascending: false }),
      supabase.from('drivers').select('id, name, company_id').is('archived_at', null),
    ]);
    setRows((hours || []).map(row => ({ ...row, driver: row.drivers?.name || 'Unknown' })));
    setDrivers(driverList || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const driverNames = ['All Drivers', ...new Set(rows.map(r => r.driver))];
  const totalViolations = rows.filter(r => r.violations?.length > 0).length;
  const compliant = rows.filter(r => !r.violations?.length).length;
  const uniqueViolators = new Set(rows.filter(r => r.violations?.length > 0).map(r => r.driver)).size;
  const hasViolations = rows.some(r => r.violations?.length > 0);

  const filtered = rows.filter(row => {
    const matchDriver = driverFilter === 'All Drivers' || row.driver === driverFilter;
    const matchFilter = filter === 'All' ? true : filter === 'Violations' ? row.violations?.length > 0 : !row.violations?.length;
    return matchDriver && matchFilter;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 32 }}>
      <style>{`
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <BackButton href="/dashboard" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>⏱️ Driver Hours</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Daily limit 9hrs · Break 45min after 4.5hrs · Weekly max 56hrs · DVSA legal requirements</p>
        </div>
        <button onClick={() => setShowLogModal(true)}
          style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', fontFamily: 'inherit' }}>
          + Log Hours
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="👥" value={new Set(rows.map(r => r.driver)).size} label="Total Drivers" />
        <StatCard icon="🚨" value={totalViolations} label="Shifts with Violations" danger={totalViolations > 0} color="#dc2626" />
        <StatCard icon="⚠️" value={uniqueViolators} label="Drivers in Breach" danger={uniqueViolators > 0} color="#d97706" />
        <StatCard icon="✅" value={compliant} label="Compliant Shifts" color="#16a34a" />
      </div>

      {hasViolations && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>DVSA compliance risk</div>
            <div style={{ color: '#dc2626', fontSize: 13 }}>{uniqueViolators} driver{uniqueViolators > 1 ? 's' : ''} with hours violations in the last 7 days</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          {driverNames.map(d => <option key={d}>{d}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Violations', 'Compliant'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#0f172a' : '#fff', color: filter === f ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
              {f === 'All' ? '📋 All' : f === 'Violations' ? '🚨 Violations' : '✅ Compliant'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading driver hours...</div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(row => {
            const isBreached = row.violations?.length > 0;
            return (
              <GlowCard key={row.id} glowColor={isBreached ? '220,38,38' : '22,163,74'} danger={isBreached} onClick={() => setSelectedRow(row)}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: isBreached ? '#fee2e2' : '#dcfce7' }}>
                        {isBreached ? '🚨' : '✅'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{row.driver}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>{row.shift_date}</div>
                      </div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: isBreached ? '#fef2f2' : '#f0fdf4', color: isBreached ? '#dc2626' : '#16a34a', border: `1px solid ${isBreached ? '#fecaca' : '#bbf7d0'}` }}>
                      {isBreached ? `● ${row.violations.length} Violation${row.violations.length > 1 ? 's' : ''}` : '● Compliant'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 24, margin: '14px 0 12px' }}>
                    {[
                      { label: 'Driving', val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
                      { label: 'Break',   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
                      { label: 'Rest',    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : '—', warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
                    ].map(({ label, val, warn }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: warn ? '#dc2626' : '#1e293b' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {row.violations?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {row.violations.map(v => <ViolationBadge key={v} code={v} />)}
                    </div>
                  )}
                  {row.notes && <div style={{ fontSize: 13, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>📝 {row.notes}</div>}
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 8, textAlign: 'right' }}>Click to view details →</div>
                </div>
              </GlowCard>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found.</div>}
        </div>
      )}

      {showLogModal && <LogHoursModal drivers={drivers} onClose={() => setShowLogModal(false)} onSaved={fetchData} />}
      {selectedRow && <DetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}
