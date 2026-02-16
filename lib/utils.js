// ============================================================
// COMPLYFLEET — Shared Utilities
// CSV Export, Compliance Score, Report Generators
// ============================================================

// --- CSV Export ---
export function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// --- Fleet CSV ---
export function exportFleetCSV(vehicles, filename = "fleet-compliance.csv") {
  const headers = ["Reg", "Type", "Make", "Model", "Year", "MOT Due", "PMI Due", "Insurance Due", "Tacho Due", "Service Due"];
  const rows = vehicles.map(v => [v.reg, v.type, v.make, v.model, v.year, v.mot_due, v.pmi_due, v.insurance_due, v.tacho_due, v.service_due]);
  downloadCSV(filename, headers, rows);
}

// --- Defects CSV ---
export function exportDefectsCSV(defects, filename = "defects.csv") {
  const headers = ["Vehicle Reg", "Company", "Description", "Category", "Severity", "Status", "Reported Date", "Reported By", "Assigned To"];
  const rows = defects.map(d => [d.vehicle_reg, d.company_name, d.description, d.category, d.severity, d.status, d.reported_date, d.reported_by, d.assigned_to]);
  downloadCSV(filename, headers, rows);
}

// --- Checks CSV ---
export function exportChecksCSV(checks, filename = "walkaround-checks.csv") {
  const headers = ["Reference", "Vehicle Reg", "Driver", "Result", "Total Items", "Passed", "Failed", "Defects Reported", "Date"];
  const rows = checks.map(ch => [ch.reference_id, ch.vehicle_reg, ch.driver_name, ch.result, ch.total_items, ch.passed_items, ch.failed_items, ch.defects_reported, ch.completed_at]);
  downloadCSV(filename, headers, rows);
}

// --- Compliance Score ---
export function calcComplianceScore(vehicles, defects) {
  let score = 100;
  const today = new Date();
  const daysUntil = (d) => { if (!d) return 999; return Math.floor((new Date(d) - today) / 86400000); };
  const DATE_FIELDS = ["mot_due", "pmi_due", "insurance_due", "tacho_due", "service_due"];

  (vehicles || []).forEach(v => {
    DATE_FIELDS.forEach(f => {
      const days = daysUntil(v[f]);
      if (days < 0) score -= (f === "mot_due" || f === "pmi_due") ? 20 : 15;
      else if (days <= 7) score -= 5;
      else if (days <= 30) score -= 2;
    });
  });

  (defects || []).filter(d => d.status === "open" || d.status === "in_progress").forEach(d => {
    if (d.severity === "dangerous" || d.severity === "major") score -= 15;
  });

  return Math.max(0, Math.min(100, score));
}

export function scoreColor(score) {
  if (score < 50) return { ring: "#EF4444", bg: "#FEF2F2", text: "#991B1B", label: "Critical" };
  if (score < 75) return { ring: "#F59E0B", bg: "#FFFBEB", text: "#92400E", label: "Needs Attention" };
  return { ring: "#10B981", bg: "#ECFDF5", text: "#065F46", label: "Good" };
}

// --- Print Report (opens print-ready window) ---
export function printReport(title, subtitle, tableHeaders, tableRows, rowClassFn) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><title>ComplyFleet - ${title}</title><style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
    body { font-family: 'DM Sans', sans-serif; padding: 30px; max-width: 1000px; margin: 0 auto; color: #0F172A; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 12px; margin-bottom: 20px; }
    .logo { font-size: 18px; font-weight: 800; } .logo span { color: #2563EB; }
    .sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0F172A; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 700; }
    td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
    tr.danger td { background: #FEF2F2; } tr.warn td { background: #FFFBEB; }
    .mono { font-family: monospace; font-weight: 700; }
    .red { color: #DC2626; font-weight: 700; } .amber { color: #D97706; font-weight: 700; } .green { color: #059669; font-weight: 700; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94A3B8; border-top: 2px solid #E5E7EB; padding-top: 12px; }
    @media print { body { padding: 15px; } @page { margin: 1cm; } }
  </style></head><body>
  <div class="header"><div><div class="logo">\u{1F69B} Comply<span>Fleet</span></div><div class="sub">${title}</div></div>
  <div style="text-align:right"><div class="sub">${subtitle || ""}</div><div class="sub">Generated: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div></div></div>
  <table><thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>
  ${tableRows.map((row, i) => {
    const cls = rowClassFn ? rowClassFn(row, i) : "";
    return `<tr class="${cls}">${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`;
  }).join("")}
  </tbody></table>
  <div class="footer">ComplyFleet \u00B7 DVSA Compliance Platform \u00B7 complyfleet.vercel.app</div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
