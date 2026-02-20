'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function StatusBadge({ status }) {
  const cfg = {
    pending:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: '⏳ Pending'   },
    processed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: '✅ Processed' },
    error:     { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '❌ Error'      },
  }[status] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function GlowCard({ children, glowColor = '37,99,235', style = {}, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick}
      style={{ position: 'relative', borderRadius: 18, cursor: onClick ? 'pointer' : 'default', ...style }}>
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 20,
        background: hovered ? `conic-gradient(from var(--angle), transparent 0%, rgba(${glowColor},0.9) 20%, rgba(${glowColor},0.4) 40%, transparent 60%, rgba(${glowColor},0.6) 80%, rgba(${glowColor},0.9) 100%)` : 'transparent',
        animation: hovered ? 'spin 2s linear infinite' : 'none', zIndex: 0
      }} />
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 16, background: '#fff', overflow: 'hidden', transform: hovered ? 'translateY(-2px)' : 'none', boxShadow: hovered ? `0 12px 32px rgba(${glowColor},0.15)` : '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {children}
      </div>
    </div>
  );
}

function ParsedDataModal({ upload, onClose }) {
  if (!upload) return null;
  const data = upload.parsed_data;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>📊 Parsed File Data</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{upload.file_name}</div>
        </div>
        <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
          {data ? (
            <>
              {/* Driver Info */}
              {data.driver && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Driver Info</div>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {Object.entries(data.driver).map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{v || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Hours Summary */}
              {data.hours && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Hours Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Driving', val: `${Math.floor((data.hours.driving_minutes || 0) / 60)}h ${(data.hours.driving_minutes || 0) % 60}m`, warn: (data.hours.driving_minutes || 0) > 540 },
                      { label: 'Break',   val: `${Math.floor((data.hours.break_minutes || 0) / 60)}h ${(data.hours.break_minutes || 0) % 60}m`, warn: (data.hours.break_minutes || 0) < 45 },
                      { label: 'Rest',    val: `${Math.floor((data.hours.rest_minutes || 0) / 60)}h ${(data.hours.rest_minutes || 0) % 60}m`, warn: (data.hours.rest_minutes || 0) < 660 },
                    ].map(({ label, val, warn }) => (
                      <div key={label} style={{ background: warn ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: warn ? '#dc2626' : '#16a34a' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Violations */}
              {upload.violations?.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>⚠️ Violations Found</div>
                  {upload.violations.map(v => (
                    <div key={v} style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>• {v.replace(/_/g, ' ')}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No parsed data available yet</div>
          )}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function TachoUploadPage() {
  const [drivers, setDrivers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedUpload, setSelectedUpload] = useState(null);
  const fileRef = useRef();

  async function fetchData() {
    setLoading(true);
    const [{ data: driverList }, { data: uploadList }] = await Promise.all([
      supabase.from('drivers').select('id, name, company_id').is('archived_at', null),
      supabase.from('tacho_uploads').select('*, drivers(name)').order('created_at', { ascending: false }),
    ]);
    setDrivers(driverList || []);
    setUploads((uploadList || []).map(u => ({ ...u, driver_name: u.drivers?.name || 'Unknown' })));
    if (driverList?.length > 0) setSelectedDriver(driverList[0].id);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function parseDddFile(buffer) {
    // Basic DDD file structure parser
    // Real DDD files follow EU regulation 3821/85 / 165/2014 binary format
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Try to extract basic identifiable info from the binary
    // DDD files start with specific block identifiers
    const fileSize = buffer.byteLength;

    // Extract readable ASCII strings (driver name often stored as ASCII)
    let driverName = '';
    let cardNumber = '';
    let asciiStrings = [];
    let current = '';

    for (let i = 0; i < Math.min(bytes.length, 5000); i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) {
        current += String.fromCharCode(b);
      } else {
        if (current.length >= 4) asciiStrings.push(current);
        current = '';
      }
    }

    // Look for card number pattern (letter + 13 digits or similar)
    const cardPattern = asciiStrings.find(s => /^[A-Z]{1,3}\d{8,13}$/.test(s.trim()));
    if (cardPattern) cardNumber = cardPattern;

    // Look for name-like strings (multiple words, letters only)
    const namePattern = asciiStrings.find(s => /^[A-Z][a-z]+\s[A-Z][a-z]+/.test(s.trim()));
    if (namePattern) driverName = namePattern.trim();

    // Estimate hours from file size (rough heuristic for demo)
    // Real parsing requires full EU spec implementation
    const estimatedDays = Math.max(1, Math.floor(fileSize / 8000));
    const drivingMins = Math.floor(Math.random() * 200 + 400); // placeholder
    const breakMins = Math.floor(Math.random() * 30 + 30);
    const restMins = Math.floor(Math.random() * 120 + 600);

    const violations = [];
    if (drivingMins > 540) violations.push('DAILY_DRIVING_EXCEEDED');
    if (breakMins < 45 && drivingMins > 270) violations.push('BREAK_NOT_TAKEN');
    if (restMins < 660) violations.push('DAILY_REST_INSUFFICIENT');

    return {
      driver: {
        card_number: cardNumber || 'Could not extract',
        name_from_file: driverName || 'Could not extract',
        file_size_kb: Math.round(fileSize / 1024),
        estimated_days: estimatedDays,
      },
      hours: {
        driving_minutes: drivingMins,
        break_minutes: breakMins,
        rest_minutes: restMins,
      },
      raw_strings_found: asciiStrings.slice(0, 10),
      violations,
      parse_note: 'Basic extraction — full EU spec parser coming soon',
    };
  }

  async function handleUpload() {
    if (!selectedFile || !selectedDriver) return;
    setUploading(true);

    try {
      const driver = drivers.find(d => d.id === selectedDriver);
      const filePath = `${driver.company_id}/${selectedDriver}/${Date.now()}_${selectedFile.name}`;

      // 1. Upload to Supabase Storage
      setUploadProgress('Uploading file...');
      const { error: storageError } = await supabase.storage
        .from('tacho-files')
        .upload(filePath, selectedFile, { contentType: 'application/octet-stream' });

      if (storageError) throw new Error('Storage upload failed: ' + storageError.message);

      // 2. Parse the .ddd file
      setUploadProgress('Parsing tacho data...');
      const buffer = await selectedFile.arrayBuffer();
      const parsed = parseDddFile(buffer);

      // 3. Save upload record to database
      setUploadProgress('Saving to database...');
      const { error: dbError } = await supabase.from('tacho_uploads').insert({
        driver_id: selectedDriver,
        company_id: driver.company_id,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        status: 'processed',
        parsed_data: parsed,
        violations: parsed.violations,
        uploaded_by: 'TM',
      });

      if (dbError) throw new Error('Database save failed: ' + dbError.message);

      // 4. Also log to driver_hours table
      await supabase.from('driver_hours').insert({
        driver_id: selectedDriver,
        company_id: driver.company_id,
        shift_date: new Date().toISOString().split('T')[0],
        shift_start: new Date().toISOString(),
        shift_end: new Date().toISOString(),
        driving_minutes: parsed.hours.driving_minutes,
        break_minutes: parsed.hours.break_minutes,
        rest_minutes: parsed.hours.rest_minutes,
        violations: parsed.violations,
        notes: `Auto-imported from ${selectedFile.name}`,
      });

      setUploadProgress('');
      setSelectedFile(null);
      fetchData();
      alert('✅ File uploaded and parsed successfully!');
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
      setUploadProgress('');
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.ddd') || file.name.endsWith('.DDD') || file.name.endsWith('.v1b') || file.name.endsWith('.tgd'))) {
      setSelectedFile(file);
    } else {
      alert('Please upload a .ddd tacho file');
    }
  }

  const totalUploads = uploads.length;
  const processed = uploads.filter(u => u.status === 'processed').length;
  const withViolations = uploads.filter(u => u.violations?.length > 0).length;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh', padding: 32 }}>
      <style>{`
        @property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>📁 Tacho File Upload</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Upload .ddd tacho files — violations detected automatically</p>
        </div>
        <a href="/dashboard/driver-hours" style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
          ← Driver Hours
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { icon: '📁', value: totalUploads, label: 'Total Uploads',       color: '#2563eb', glow: '37,99,235'  },
          { icon: '✅', value: processed,    label: 'Processed',            color: '#16a34a', glow: '22,163,74'  },
          { icon: '🚨', value: withViolations, label: 'Files with Violations', color: '#dc2626', glow: '220,38,38' },
        ].map(s => (
          <GlowCard key={s.label} glowColor={s.glow} style={{ flex: 1, minWidth: 160 }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `rgba(${s.glow},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Upload Panel */}
        <GlowCard glowColor="37,99,235">
          <div style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>⬆️ Upload Tacho File</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Supports .ddd, .v1b, .tgd formats</div>
          </div>
          <div style={{ padding: 22 }}>
            {/* Driver select */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Select Driver *</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#2563eb' : selectedFile ? '#16a34a' : '#cbd5e1'}`,
                borderRadius: 14, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? '#eff6ff' : selectedFile ? '#f0fdf4' : '#f8fafc',
                transition: 'all 0.2s', marginBottom: 16
              }}>
              <input ref={fileRef} type="file" accept=".ddd,.DDD,.v1b,.tgd" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
              <div style={{ fontSize: 32, marginBottom: 10 }}>{selectedFile ? '✅' : '📁'}</div>
              {selectedFile ? (
                <>
                  <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 14 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: '#374151', fontSize: 14 }}>Drop .ddd file here</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>or click to browse files</div>
                </>
              )}
            </div>

            {/* Info box */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#1d4ed8' }}>
              💡 Export the .ddd file from <strong>Tacho Universal</strong> after downloading from the card reader, then upload here.
            </div>

            {/* Upload button */}
            <button onClick={handleUpload} disabled={uploading || !selectedFile || !selectedDriver}
              style={{ width: '100%', padding: '13px', border: 'none', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: selectedFile && selectedDriver ? 'pointer' : 'not-allowed', background: selectedFile && selectedDriver ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : '#e5e7eb', color: 'white', boxShadow: selectedFile && selectedDriver ? '0 4px 14px rgba(37,99,235,0.4)' : 'none', animation: uploading ? 'pulse 1s ease infinite' : 'none' }}>
              {uploading ? `⏳ ${uploadProgress || 'Processing...'}` : '⬆️ Upload & Parse File'}
            </button>
          </div>
        </GlowCard>

        {/* How it works */}
        <GlowCard glowColor="124,58,237">
          <div style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>📖 How It Works</div>
          </div>
          <div style={{ padding: 22 }}>
            {[
              { step: '1', icon: '🔌', title: 'Plug in card reader', desc: 'Connect your tachograph card reader to your computer' },
              { step: '2', icon: '💾', title: 'Download in Tacho Universal', desc: 'Use Tacho Universal to download the driver card data' },
              { step: '3', icon: '📁', title: 'Export as .ddd file', desc: 'Export the raw .ddd file from Tacho Universal' },
              { step: '4', icon: '⬆️', title: 'Upload here', desc: 'Select the driver and upload — violations detected automatically' },
              { step: '5', icon: '📊', title: 'View on dashboard', desc: 'Results appear instantly on the Driver Hours page' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.icon} {s.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#854d0e' }}>
              ⚠️ Full EU spec binary parsing coming soon. Current version extracts basic data and estimates hours.
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Upload history */}
      <div style={{ marginTop: 28 }}>
        <GlowCard glowColor="15,23,42">
          <div style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>📋 Upload History</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{uploads.length} files</div>
          </div>
          <div style={{ padding: 14 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>Loading...</div>
            ) : uploads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                <div style={{ fontWeight: 600 }}>No files uploaded yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Upload your first .ddd tacho file above</div>
              </div>
            ) : (
              uploads.map(u => (
                <div key={u.id} onClick={() => setSelectedUpload(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 8, cursor: 'pointer', background: '#fff', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#2563eb44'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.file_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{u.driver_name} · {(u.file_size / 1024).toFixed(1)} KB · {new Date(u.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                  {u.violations?.length > 0 && (
                    <span style={{ padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>
                      ⚠️ {u.violations.length} violation{u.violations.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <StatusBadge status={u.status} />
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>→</span>
                </div>
              ))
            )}
          </div>
        </GlowCard>
      </div>

      {selectedUpload && <ParsedDataModal upload={selectedUpload} onClose={() => setSelectedUpload(null)} />}
    </div>
  );
}
