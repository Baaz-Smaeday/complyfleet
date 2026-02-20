'use client';

import { useState } from 'react';

// ── Mock data matching your driver_hours table ──────────────────────────────
const MOCK_DATA = [
  {
    id: '1', driver: '3eeee', company: 'Navi exp', shift_date: '2026-02-19',
    driving_minutes: 660, break_minutes: 30, rest_minutes: 0,
    violations: ['DAILY_DRIVING_EXCEEDED'],
    notes: 'Drove 11hrs - legal max is 9hrs'
  },
  {
    id: '2', driver: 'Navi', company: 'Navi exp', shift_date: '2026-02-18',
    driving_minutes: 500, break_minutes: 15, rest_minutes: 0,
    violations: ['BREAK_NOT_TAKEN', 'DAILY_DRIVING_EXCEEDED'],
    notes: 'Drove 8h20m with only 15min break'
  },
  {
    id: '3', driver: '3eeee', company: 'Navi exp', shift_date: '2026-02-17',
    driving_minutes: 540, break_minutes: 0, rest_minutes: 0,
    violations: ['BREAK_NOT_TAKEN'],
    notes: '9hrs driving with zero break recorded'
  },
  {
    id: '4', driver: 'Navi', company: 'Navi exp', shift_date: '2026-02-16',
    driving_minutes: 620, break_minutes: 45, rest_minutes: 0,
    violations: ['DAILY_DRIVING_EXCEEDED', 'EXTENSION_LIMIT_EXCEEDED'],
    notes: 'Drove 10h20m - daily extension limit breached'
  },
  {
    id: '5', driver: '3eeee', company: 'Navi exp', shift_date: '2026-02-15',
    driving_minutes: 600, break_minutes: 45, rest_minutes: 0,
    violations: ['WEEKLY_HOURS_EXCEEDED'],
    notes: 'Weekly total now 58hrs - legal max 56hrs'
  },
  {
    id: '6', driver: 'Navi', company: 'Navi exp', shift_date: '2026-02-14',
    driving_minutes: 480, break_minutes: 45, rest_minutes: 0,
    violations: [],
    notes: 'Compliant shift - 8hrs driving with proper 45min break'
  },
  {
    id: '7', driver: '3eeee', company: 'Navi exp', shift_date: '2026-02-13',
    driving_minutes: 480, break_minutes: 45, rest_minutes: 480,
    violations: ['DAILY_REST_INSUFFICIENT'],
    notes: 'Only 8hrs rest before next shift - legal min is 11hrs'
  },
];

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
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      color: meta.color, background: meta.bg, border: `1px solid ${meta.color}22`,
      whiteSpace: 'nowrap'
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function StatCard({ icon, value, label, color = '#1e293b', danger }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      border: danger ? '1px solid #fecaca' : '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 160,
      background: danger ? '#fff5f5' : '#fff'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 20,
        background: danger ? '#fee2e2' : '#f1f5f9'
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export default function DriverHoursPage() {
  const [filter, setFilter] = useState('All');
  const [driverFilter, setDriverFilter] = useState('All Drivers');

  const drivers = ['All Drivers', ...new Set(MOCK_DATA.map(r => r.driver))];
  const filters = ['All', 'Violations', 'Compliant'];

  const totalViolations = MOCK_DATA.filter(r => r.violations.length > 0).length;
  const compliant       = MOCK_DATA.filter(r => r.violations.length === 0).length;
  const uniqueViolators = new Set(MOCK_DATA.filter(r => r.violations.length > 0).map(r => r.driver)).size;

  const filtered = MOCK_DATA.filter(row => {
    const matchDriver = driverFilter === 'All Drivers' || row.driver === driverFilter;
    const matchFilter =
      filter === 'All'        ? true :
      filter === 'Violations' ? row.violations.length > 0 :
                                row.violations.length === 0;
    return matchDriver && matchFilter;
  });

  const hasViolations = MOCK_DATA.some(r => r.violations.length > 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 32 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            ⏱️ Driver Hours
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Daily limit 9hrs · Break 45min after 4.5hrs · Weekly max 56hrs · DVSA legal requirements
          </p>
        </div>
        <button style={{
          background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          + Log Hours
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon="👥" value={new Set(MOCK_DATA.map(r => r.driver)).size} label="Total Drivers" />
        <StatCard icon="🚨" value={totalViolations} label="Shifts with Violations" danger={totalViolations > 0} color="#dc2626" />
        <StatCard icon="⚠️" value={uniqueViolators}  label="Drivers in Breach"     danger={uniqueViolators > 0} color="#d97706" />
        <StatCard icon="✅" value={compliant}         label="Compliant Shifts"      color="#16a34a" />
      </div>

      {/* Alert banner */}
      {hasViolations && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>DVSA compliance risk</div>
            <div style={{ color: '#dc2626', fontSize: 13 }}>
              {uniqueViolators} driver{uniqueViolators > 1 ? 's' : ''} with hours violations in the last 7 days
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Driver dropdown */}
        <select
          value={driverFilter}
          onChange={e => setDriverFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: 14, background: '#fff', color: '#1e293b', cursor: 'pointer'
          }}
        >
          {drivers.map(d => <option key={d}>{d}</option>)}
        </select>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: filter === f ? '#0f172a' : '#fff',
              color: filter === f ? '#fff' : '#64748b',
              transition: 'all 0.15s'
            }}>
              {f === 'All' ? '📋 All' : f === 'Violations' ? '🚨 Violations' : '✅ Compliant'}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(row => {
          const isBreached = row.violations.length > 0;
          return (
            <div key={row.id} style={{
              background: '#fff',
              border: isBreached ? '1px solid #fecaca' : '1px solid #dcfce7',
              borderLeft: isBreached ? '4px solid #dc2626' : '4px solid #16a34a',
              borderRadius: 12, padding: '18px 20px',
              transition: 'box-shadow 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

                {/* Left: driver info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    background: isBreached ? '#fee2e2' : '#dcfce7'
                  }}>
                    {isBreached ? '🚨' : '✅'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{row.driver}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{row.company} · {row.shift_date}</div>
                  </div>
                </div>

                {/* Right: status badge */}
                <span style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: isBreached ? '#fef2f2' : '#f0fdf4',
                  color: isBreached ? '#dc2626' : '#16a34a',
                  border: `1px solid ${isBreached ? '#fecaca' : '#bbf7d0'}`
                }}>
                  {isBreached ? `● ${row.violations.length} Violation${row.violations.length > 1 ? 's' : ''}` : '● Compliant'}
                </span>
              </div>

              {/* Hours breakdown */}
              <div style={{ display: 'flex', gap: 24, margin: '14px 0 12px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Driving', val: fmtMins(row.driving_minutes), warn: row.driving_minutes > 540 },
                  { label: 'Break',   val: fmtMins(row.break_minutes),   warn: row.break_minutes < 45 && row.driving_minutes > 270 },
                  { label: 'Rest',    val: row.rest_minutes > 0 ? fmtMins(row.rest_minutes) : '—', warn: row.rest_minutes > 0 && row.rest_minutes < 660 },
                ].map(({ label, val, warn }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: warn ? '#dc2626' : '#1e293b' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Violation badges */}
              {row.violations.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {row.violations.map(v => <ViolationBadge key={v} code={v} />)}
                </div>
              )}

              {/* Notes */}
              {row.notes && (
                <div style={{ fontSize: 13, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  📝 {row.notes}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 15 }}>
            No records found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
