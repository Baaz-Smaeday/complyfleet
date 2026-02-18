// lib/generate-pdf.js
// ============================================================
// ComplyFleet PDF Generation — Client-Side
// ============================================================
// Uses jsPDF loaded from CDN — no npm install needed
// Generates DVSA-compliant walkaround check reports,
// defect reports, and fleet compliance summaries.
// ============================================================

let jsPDFLoaded = null;

const CDN_URLS = [
  'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
];

function tryLoadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(true);
    script.onerror = () => { script.remove(); reject(); };
    document.head.appendChild(script);
  });
}

async function loadJsPDF() {
  if (jsPDFLoaded) return jsPDFLoaded;
  if (window.jspdf) { jsPDFLoaded = window.jspdf; return jsPDFLoaded; }

  for (const url of CDN_URLS) {
    try {
      await tryLoadScript(url);
      if (window.jspdf) { jsPDFLoaded = window.jspdf; return jsPDFLoaded; }
    } catch (e) { /* try next CDN */ }
  }
  throw new Error('Failed to load jsPDF from all CDNs. Check your internet connection or try again.');
}

// ============================================================
// Shared helpers
// ============================================================
function setupDoc(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header bar
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ComplyFleet', margin, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DVSA Compliance Platform', margin, 24);
  doc.setFontSize(9);
  doc.text(title, pageWidth - margin, 14, { align: 'right' });
  doc.text(new Date().toLocaleString('en-GB'), pageWidth - margin, 24, { align: 'right' });

  return { pageWidth, pageHeight, margin };
}

function addFooter(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text('ComplyFleet — DVSA Compliance Platform — This document is system-generated and forms part of the compliance audit trail', 20, pageHeight - 8);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
}

function drawSectionHeader(doc, y, text, { pageWidth, margin }) {
  doc.setFillColor(241, 245, 249); // #F1F5F9
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setTextColor(30, 41, 59); // #1E293B
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin + 4, y + 7);
  return y + 14;
}

function drawKeyValue(doc, y, label, value, { margin }) {
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(label, margin + 4, y);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value || '—'), margin + 60, y);
  return y + 7;
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'dangerous': return [220, 38, 38]; // red
    case 'major': return [245, 158, 11]; // amber
    case 'minor': return [59, 130, 246]; // blue
    default: return [107, 114, 128]; // grey
  }
}

// ============================================================
// 1. WALKAROUND CHECK PDF
// ============================================================
export async function generateCheckPDF(check, vehicle, defects = [], company = null) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const layout = setupDoc(doc, 'WALKAROUND CHECK REPORT');
  const { pageWidth, margin } = layout;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  // Result badge
  const isPass = check.result === 'pass' || defects.length === 0;
  doc.setFillColor(isPass ? 16 : 220, isPass ? 185 : 38, isPass ? 129 : 38);
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(isPass ? 'PASS — No Defects Found' : `DEFECTS FOUND — ${defects.length} defect${defects.length !== 1 ? 's' : ''} reported`, pageWidth / 2, y + 9, { align: 'center' });
  y += 20;

  // Vehicle details
  y = drawSectionHeader(doc, y, 'VEHICLE DETAILS', layout);
  y = drawKeyValue(doc, y, 'Registration:', vehicle?.registration || vehicle?.reg || check.vehicle_registration || '—', layout);
  y = drawKeyValue(doc, y, 'Make / Model:', `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || '—', layout);
  y = drawKeyValue(doc, y, 'Vehicle Type:', vehicle?.vehicle_type || vehicle?.type || '—', layout);
  y = drawKeyValue(doc, y, 'Company:', company?.name || vehicle?.company_name || '—', layout);
  if (vehicle?.operator_licence || company?.operator_licence) {
    y = drawKeyValue(doc, y, 'O-Licence:', vehicle?.operator_licence || company?.operator_licence, layout);
  }
  y += 4;

  // Check details
  y = drawSectionHeader(doc, y, 'CHECK DETAILS', layout);
  y = drawKeyValue(doc, y, 'Date / Time:', check.created_at ? new Date(check.created_at).toLocaleString('en-GB') : '—', layout);
  y = drawKeyValue(doc, y, 'Driver Name:', check.driver_name || '—', layout);
  y = drawKeyValue(doc, y, 'Odometer:', check.odometer ? `${check.odometer} miles` : '—', layout);
  y = drawKeyValue(doc, y, 'Location:', check.location || '—', layout);
  y = drawKeyValue(doc, y, 'Check ID:', check.id?.slice(0, 8) || '—', layout);
  y += 4;

  // Items checked
  if (check.items && check.items.length > 0) {
    y = drawSectionHeader(doc, y, 'ITEMS INSPECTED', layout);
    const colWidth = (contentWidth - 8) / 2;

    check.items.forEach((item, i) => {
      if (y > 260) {
        addFooter(doc, 1, 2);
        doc.addPage();
        setupDoc(doc, 'WALKAROUND CHECK REPORT');
        y = 44;
      }

      const isLeft = i % 2 === 0;
      const x = margin + 4 + (isLeft ? 0 : colWidth);

      // Item name and status
      const status = item.status || item.result || 'ok';
      const statusColor = status === 'ok' || status === 'pass' ? [16, 185, 129] : [220, 38, 38];

      doc.setFillColor(...statusColor);
      doc.circle(x + 2, y - 1, 1.5, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item.name || item.label || item, x + 6, y);

      if (isLeft && i + 1 < check.items.length) {
        // Don't advance y yet
      } else {
        y += 6;
      }
    });
    y += 4;
  }

  // Defects section
  if (defects.length > 0) {
    if (y > 220) {
      addFooter(doc, 1, 2);
      doc.addPage();
      setupDoc(doc, 'WALKAROUND CHECK REPORT');
      y = 44;
    }

    y = drawSectionHeader(doc, y, `DEFECTS REPORTED (${defects.length})`, layout);

    defects.forEach((defect, i) => {
      if (y > 250) {
        doc.addPage();
        setupDoc(doc, 'WALKAROUND CHECK REPORT');
        y = 44;
      }

      const sevColor = getSeverityColor(defect.severity);

      // Severity badge
      doc.setFillColor(...sevColor);
      doc.roundedRect(margin + 4, y - 3, 24, 7, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text((defect.severity || 'unknown').toUpperCase(), margin + 16, y + 1, { align: 'center' });

      // Description
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(defect.description || defect.item || `Defect ${i + 1}`, margin + 32, y + 1);
      y += 5;

      if (defect.notes) {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(defect.notes, contentWidth - 36);
        doc.text(lines, margin + 32, y);
        y += lines.length * 4;
      }
      y += 4;
    });
  }

  // Driver declaration
  if (y > 230) {
    doc.addPage();
    setupDoc(doc, 'WALKAROUND CHECK REPORT');
    y = 44;
  }
  y += 4;
  y = drawSectionHeader(doc, y, 'DRIVER DECLARATION', layout);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const declaration = 'I confirm that I have carried out a thorough walkaround check of this vehicle in accordance with the operator\'s instructions and DVSA guidelines. All items listed above have been inspected and any defects found have been reported.';
  const declLines = doc.splitTextToSize(declaration, contentWidth - 8);
  doc.text(declLines, margin + 4, y);
  y += declLines.length * 4 + 8;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Driver: ${check.driver_name || '—'}`, margin + 4, y);
  doc.text(`Date: ${check.created_at ? new Date(check.created_at).toLocaleDateString('en-GB') : '—'}`, margin + 90, y);
  y += 6;
  doc.setDrawColor(30, 41, 59);
  doc.line(margin + 4, y, margin + 80, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Digital signature', margin + 4, y + 4);

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  // Download
  const filename = `walkaround-check-${vehicle?.registration || vehicle?.reg || 'report'}-${new Date(check.created_at || Date.now()).toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/\s/g, '-'));
}


// ============================================================
// 2. DEFECT REPORT PDF
// ============================================================
export async function generateDefectPDF(defect, vehicle, company = null) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const layout = setupDoc(doc, 'DEFECT REPORT');
  const { pageWidth, margin } = layout;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  // Severity banner
  const sevColor = getSeverityColor(defect.severity);
  doc.setFillColor(...sevColor);
  doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${(defect.severity || 'UNKNOWN').toUpperCase()} DEFECT — ${defect.status === 'open' ? 'OPEN' : defect.status === 'in_progress' ? 'IN PROGRESS' : 'RESOLVED'}`, pageWidth / 2, y + 9, { align: 'center' });
  y += 20;

  if (defect.severity === 'dangerous') {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('WARNING: This vehicle must be taken off the road immediately until this defect is repaired.', pageWidth / 2, y + 7, { align: 'center' });
    y += 16;
  }

  // Vehicle details
  y = drawSectionHeader(doc, y, 'VEHICLE', layout);
  y = drawKeyValue(doc, y, 'Registration:', vehicle?.registration || vehicle?.reg || '—', layout);
  y = drawKeyValue(doc, y, 'Make / Model:', `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || '—', layout);
  y = drawKeyValue(doc, y, 'Company:', company?.name || vehicle?.company_name || '—', layout);
  y += 4;

  // Defect details
  y = drawSectionHeader(doc, y, 'DEFECT DETAILS', layout);
  y = drawKeyValue(doc, y, 'Defect ID:', defect.id?.slice(0, 8) || '—', layout);
  y = drawKeyValue(doc, y, 'Reported:', defect.created_at ? new Date(defect.created_at).toLocaleString('en-GB') : '—', layout);
  y = drawKeyValue(doc, y, 'Severity:', (defect.severity || '—').toUpperCase(), layout);
  y = drawKeyValue(doc, y, 'Status:', (defect.status || '—').replace('_', ' ').toUpperCase(), layout);
  y = drawKeyValue(doc, y, 'Category:', defect.item || defect.category || '—', layout);
  y += 4;

  // Description
  y = drawSectionHeader(doc, y, 'DESCRIPTION', layout);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(defect.description || defect.notes || 'No description provided', contentWidth - 8);
  doc.text(descLines, margin + 4, y);
  y += descLines.length * 5 + 6;

  // Resolution section
  if (defect.status === 'resolved' || defect.resolved_at) {
    y = drawSectionHeader(doc, y, 'RESOLUTION', layout);
    y = drawKeyValue(doc, y, 'Resolved:', defect.resolved_at ? new Date(defect.resolved_at).toLocaleString('en-GB') : '—', layout);
    y = drawKeyValue(doc, y, 'Resolved By:', defect.resolved_by_name || '—', layout);
    if (defect.resolution_notes) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const resLines = doc.splitTextToSize(defect.resolution_notes, contentWidth - 8);
      doc.text(resLines, margin + 4, y);
      y += resLines.length * 4 + 4;
    }
  }

  addFooter(doc, 1, 1);

  const filename = `defect-${(defect.severity || 'report').toUpperCase()}-${vehicle?.registration || vehicle?.reg || ''}-${new Date(defect.created_at || Date.now()).toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/\s/g, '-'));
}


// ============================================================
// 3. FLEET COMPLIANCE SUMMARY PDF
// ============================================================
export async function generateFleetSummaryPDF({ vehicles = [], checks = [], defects = [], company = null, dateRange = null }) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const layout = setupDoc(doc, 'FLEET COMPLIANCE SUMMARY');
  const { pageWidth, pageHeight, margin } = layout;
  const contentWidth = pageWidth - margin * 2;
  let y = 44;

  // Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.name || 'Fleet Compliance Summary', margin, y + 6);
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const period = dateRange ? `${dateRange.from} — ${dateRange.to}` : `Generated: ${new Date().toLocaleDateString('en-GB')}`;
  doc.text(period, margin, y + 4);
  y += 12;

  // Summary stats
  const totalVehicles = vehicles.length;
  const totalChecks = checks.length;
  const openDefects = defects.filter(d => d.status === 'open').length;
  const dangerousDefects = defects.filter(d => d.severity === 'dangerous' && d.status === 'open').length;

  const stats = [
    { label: 'Vehicles', value: totalVehicles, color: [30, 64, 175] },
    { label: 'Checks', value: totalChecks, color: [16, 185, 129] },
    { label: 'Open Defects', value: openDefects, color: [245, 158, 11] },
    { label: 'Dangerous', value: dangerousDefects, color: [220, 38, 38] },
  ];

  const statWidth = (contentWidth - 12) / 4;
  stats.forEach((stat, i) => {
    const x = margin + i * (statWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, statWidth, 22, 2, 2, 'F');
    doc.setDrawColor(...stat.color);
    doc.setLineWidth(0.8);
    doc.line(x, y, x, y + 22);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label.toUpperCase(), x + 6, y + 7);
    doc.setTextColor(...stat.color);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value), x + 6, y + 18);
  });
  y += 30;

  // Vehicle table
  y = drawSectionHeader(doc, y, 'VEHICLE STATUS', layout);

  // Table header
  const cols = [
    { label: 'Registration', width: 30 },
    { label: 'Make / Model', width: 35 },
    { label: 'Type', width: 18 },
    { label: 'MOT Expiry', width: 25 },
    { label: 'Tax Expiry', width: 25 },
    { label: 'Open Defects', width: 22 },
    { label: 'Status', width: 20 },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let colX = margin + 2;
  cols.forEach(col => {
    doc.text(col.label.toUpperCase(), colX, y + 5);
    colX += col.width;
  });
  y += 9;

  // Table rows
  vehicles.forEach((v) => {
    if (y > 260) {
      addFooter(doc, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages() + 1);
      doc.addPage();
      setupDoc(doc, 'FLEET COMPLIANCE SUMMARY');
      y = 44;
    }

    const vDefects = defects.filter(d => d.vehicle_id === v.id && d.status === 'open');
    const hasDangerous = vDefects.some(d => d.severity === 'dangerous');
    const now = new Date();

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    colX = margin + 2;
    // Registration
    doc.setFont('helvetica', 'bold');
    doc.text(v.registration || v.reg || '—', colX, y);
    colX += cols[0].width;

    doc.setFont('helvetica', 'normal');
    // Make/Model
    doc.text(`${v.make || ''} ${v.model || ''}`.trim() || '—', colX, y);
    colX += cols[1].width;

    // Type
    doc.text(v.vehicle_type || v.type || '—', colX, y);
    colX += cols[2].width;

    // MOT
    const motDays = v.mot_expiry ? Math.ceil((new Date(v.mot_expiry) - now) / (1000 * 60 * 60 * 24)) : null;
    if (motDays !== null && motDays <= 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else if (motDays !== null && motDays <= 30) {
      doc.setTextColor(245, 158, 11);
    }
    doc.text(v.mot_expiry || '—', colX, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    colX += cols[3].width;

    // Tax
    const taxDays = v.tax_expiry ? Math.ceil((new Date(v.tax_expiry) - now) / (1000 * 60 * 60 * 24)) : null;
    if (taxDays !== null && taxDays <= 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else if (taxDays !== null && taxDays <= 30) {
      doc.setTextColor(245, 158, 11);
    }
    doc.text(v.tax_expiry || '—', colX, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    colX += cols[4].width;

    // Open defects count
    doc.text(String(vDefects.length), colX, y);
    colX += cols[5].width;

    // Status
    if (hasDangerous) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('DANGEROUS', colX, y);
    } else if (vDefects.length > 0) {
      doc.setTextColor(245, 158, 11);
      doc.text('Defects', colX, y);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('Clear', colX, y);
    }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    y += 6;

    // Light separator line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y - 1, margin + contentWidth, y - 1);
  });

  y += 6;

  // Open defects summary
  const openDefs = defects.filter(d => d.status === 'open');
  if (openDefs.length > 0 && y < 220) {
    y = drawSectionHeader(doc, y, `OPEN DEFECTS (${openDefs.length})`, layout);

    openDefs.forEach(d => {
      if (y > 255) return; // Skip if near end of page

      const sevColor = getSeverityColor(d.severity);
      doc.setFillColor(...sevColor);
      doc.roundedRect(margin + 2, y - 2.5, 20, 5.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text((d.severity || '').toUpperCase(), margin + 12, y + 0.5, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(d.description || d.item || 'Defect', margin + 26, y + 0.5);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const veh = vehicles.find(v => v.id === d.vehicle_id);
      doc.text(`${veh?.registration || veh?.reg || ''} — ${d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB') : ''}`, margin + 26, y + 5);
      y += 10;
    });
  }

  // Footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const filename = `fleet-summary-${company?.name?.replace(/\s+/g, '-') || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/\s/g, '-'));
}


// ============================================================
// 4. BATCH CHECKS PDF (multiple checks in one document)
// ============================================================
export async function generateBatchChecksPDF(checks, vehicles = [], company = null) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for table
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ComplyFleet — Walkaround Check Log', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${company?.name || 'All Companies'} — Generated ${new Date().toLocaleString('en-GB')}`, margin, 22);
  doc.text(`${checks.length} checks`, pageWidth - margin, 12, { align: 'right' });

  let y = 36;

  // Table header
  const checkCols = [
    { label: 'Date', width: 30 },
    { label: 'Time', width: 20 },
    { label: 'Vehicle', width: 30 },
    { label: 'Driver', width: 40 },
    { label: 'Result', width: 20 },
    { label: 'Defects', width: 20 },
    { label: 'Odometer', width: 25 },
    { label: 'Check ID', width: 25 },
  ];

  function drawTableHeader() {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    let cx = margin + 2;
    checkCols.forEach(col => {
      doc.text(col.label.toUpperCase(), cx, y + 5);
      cx += col.width;
    });
    y += 9;
  }

  drawTableHeader();

  checks.forEach((c, i) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 15;
      drawTableHeader();
    }

    const date = c.created_at ? new Date(c.created_at) : null;
    const veh = vehicles.find(v => v.id === c.vehicle_id);
    const isPass = c.result === 'pass';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    let cx = margin + 2;
    doc.text(date ? date.toLocaleDateString('en-GB') : '—', cx, y); cx += checkCols[0].width;
    doc.text(date ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—', cx, y); cx += checkCols[1].width;
    doc.setFont('helvetica', 'bold');
    doc.text(veh?.registration || veh?.reg || c.vehicle_registration || '—', cx, y); cx += checkCols[2].width;
    doc.setFont('helvetica', 'normal');
    doc.text(c.driver_name || '—', cx, y); cx += checkCols[3].width;

    // Result with colour
    doc.setTextColor(isPass ? 16 : 220, isPass ? 185 : 38, isPass ? 129 : 38);
    doc.setFont('helvetica', 'bold');
    doc.text(isPass ? 'Pass' : 'Defects', cx, y); cx += checkCols[4].width;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(String(c.defects_found || 0), cx, y); cx += checkCols[5].width;
    doc.text(c.odometer ? `${c.odometer}` : '—', cx, y); cx += checkCols[6].width;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(c.id?.slice(0, 8) || '—', cx, y);

    y += 5.5;

    // Row separator
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(margin, y - 1, margin + contentWidth, y - 1);
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('ComplyFleet — DVSA Compliance Platform — Audit Trail Document', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const filename = `check-log-${company?.name?.replace(/\s+/g, '-') || 'all'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename.replace(/\s/g, '-'));
}
