const ExcelJS   = require('exceljs');
const path       = require('path');
const fs         = require('fs');
const Complaint  = require('../models/Complaint_v2');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

const COLUMNS = [
  { header: 'Complaint #',         key: 'complaint_number', width: 16 },
  { header: 'Date Submitted',      key: 'created_at',       width: 22 },
  { header: 'Source',              key: 'source',           width: 8  },
  { header: 'Status',              key: 'status',           width: 14 },
  { header: 'Station',             key: 'station',          width: 20 },
  { header: 'Area',                key: 'area',             width: 15 },
  { header: 'Location',            key: 'location',         width: 22 },
  { header: 'Asset Type',          key: 'asset_type',       width: 18 },
  { header: 'Description',         key: 'description',      width: 45 },
  { header: 'Reporter Name',       key: 'reporter_name',    width: 22 },
  { header: 'Reporter Phone',      key: 'reporter_phone',   width: 15 },
  { header: 'Reporter Email',      key: 'reporter_email',   width: 28 },
  { header: 'Assigned Staff',      key: 'staff_name',       width: 22 },
  { header: 'Staff Email',         key: 'staff_email',      width: 28 },
  { header: 'Assigned At',         key: 'assigned_at',      width: 22 },
  { header: 'Resolution Notes',    key: 'resolution_notes', width: 40 },
  { header: 'Closed At',           key: 'closed_at',        width: 22 },
  { header: 'Time to Close (hrs)', key: 'time_to_close',    width: 20 },
];

const STATUS_COLORS = {
  CLOSED:      'FF4CAF50',
  RESOLVED:    'FF8BC34A',
  IN_PROGRESS: 'FF2196F3',
  FINISHING:   'FFFF9800',
  ASSIGNED:    'FFFFC107',
  OPEN:        'FFF44336',
};

function fmt(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }).replace(',', '');
}

// ── Determine effective status at end of a given month ────────────
// Uses created_at, assigned_staff.assigned_at and closed_at — the only
// timestamps we store — to reconstruct the most accurate historical status.
function statusAtMonthEnd(c, monthEnd) {
  const closedAt   = c.closed_at                    ? new Date(c.closed_at)                    : null;
  const assignedAt = c.assigned_staff?.assigned_at  ? new Date(c.assigned_staff.assigned_at)   : null;

  if (closedAt && closedAt <= monthEnd)   return 'CLOSED';
  if (assignedAt && assignedAt <= monthEnd) {
    // Was assigned by end of this month but not yet closed — still in progress.
    // Current status may be CLOSED (closed in a later month), so cap it.
    const s = c.status;
    if (s === 'CLOSED' || s === 'RESOLVED') return 'IN_PROGRESS';
    return s; // ASSIGNED / IN_PROGRESS / FINISHING
  }
  return 'OPEN';
}

// ── Convert one complaint document to an Excel row ─────────────────
// Pass monthEnd to get the historical status for that month.
// Omit monthEnd (or pass null) to use the complaint's current status.
function toRow(c, monthEnd) {
  const staffPopulated = c.assigned_staff?.staff_id;
  const hasRealEmail   = c.reported_by?.email && !c.reported_by.email.includes('@noreply.scan2fix');

  const createdAt    = new Date(c.created_at);
  const closedAt     = c.closed_at ? new Date(c.closed_at) : null;
  const hoursToClose = closedAt
    ? Math.round(((closedAt - createdAt) / 36e5) * 10) / 10
    : '';

  const effectiveStatus = monthEnd ? statusAtMonthEnd(c, monthEnd) : c.status;

  return {
    complaint_number: c.complaint_number || '',
    created_at:       fmt(c.created_at),
    source:           c.source   || '',
    status:           effectiveStatus,
    station:          c.station  || '',
    area:             c.area     || '',
    location:         c.location || '',
    asset_type:       c.asset_type  || '',
    description:      c.description || '',
    reporter_name:    c.reported_by?.name  || '',
    reporter_phone:   c.reported_by?.phone || '',
    reporter_email:   hasRealEmail ? c.reported_by.email : '',
    staff_name:       staffPopulated?.full_name || '',
    staff_email:      staffPopulated?.email     || '',
    assigned_at:      fmt(c.assigned_staff?.assigned_at),
    resolution_notes: c.resolution_notes || '',
    closed_at:        fmt(c.closed_at),
    time_to_close:    hoursToClose,
  };
}

// ── Style a worksheet ─────────────────────────────────────────────
function styleSheet(sheet, rowCount) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.border    = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let r = 2; r <= rowCount + 1; r++) {
    const row = sheet.getRow(r);
    row.height = 16;
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = COLUMNS[colNum - 1];
      if (col?.key === 'status' && cell.value) {
        const argb = STATUS_COLORS[cell.value] || 'FFE0E0E0';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF' } };
        cell.font = { size: 10 };
      }
      cell.border    = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
      cell.alignment = { vertical: 'middle', wrapText: col?.key === 'description' };
    });
  }

  sheet.views       = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter  = { from: 'A1', to: `${String.fromCharCode(64 + COLUMNS.length)}1` };
}

// ── Add a sheet from complaint documents ──────────────────────────
function addSheet(workbook, sheetName, complaints, monthEnd) {
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  sheet.columns = COLUMNS;
  const rows = complaints.map(c => toRow(c, monthEnd || null));
  rows.forEach(r => sheet.addRow(r));
  styleSheet(sheet, rows.length);
  return sheet;
}

// ─────────────────────────────────────────────
// Core: generate folder + files for a month
// ─────────────────────────────────────────────
exports.generateMonthlyReport = async (year, month) => {
  const monthStr  = String(month).padStart(2, '0');
  const label     = `${year}-${monthStr}`;
  const folderDir = path.join(REPORTS_DIR, label);

  // UTC month boundaries
  const monthStart = new Date(`${year}-${monthStr}-01T00:00:00.000Z`);
  const monthEnd   = month === 12
    ? new Date(`${year + 1}-01-01T00:00:00.000Z`)
    : new Date(`${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`);
  // Last millisecond of the month — used for historical status calculation
  const monthEndMs = new Date(monthEnd.getTime() - 1);

  // ── DAILY query: complaints CREATED in this month ────────────────
  const dailyComplaints = await Complaint.find({
    $expr: {
      $and: [
        { $gte: [{ $toDate: '$created_at' }, monthStart] },
        { $lt:  [{ $toDate: '$created_at' }, monthEnd]   },
      ],
    },
  })
    .populate({ path: 'assigned_staff.staff_id', select: 'full_name email' })
    .sort({ created_at: 1 })
    .lean();

  // ── COMBINED query: complaints ACTIVE during this month ──────────
  // Active = created before month end AND (not closed OR closed after month start)
  const activeComplaints = await Complaint.find({
    $and: [
      { $expr: { $lt: [{ $toDate: '$created_at' }, monthEnd] } },
      {
        $or: [
          { closed_at: null },
          { $expr: { $gte: [{ $toDate: '$closed_at' }, monthStart] } },
        ],
      },
    ],
  })
    .populate({ path: 'assigned_staff.staff_id', select: 'full_name email' })
    .sort({ created_at: 1 })
    .lean();

  if (!activeComplaints.length && !dailyComplaints.length) {
    return { label, folder: null, filesCreated: 0, totalComplaints: 0, message: 'No complaints for this month' };
  }

  if (!fs.existsSync(folderDir)) fs.mkdirSync(folderDir, { recursive: true });

  let filesCreated = 0;

  // ── Daily files: group by creation day ───────────────────────────
  const byDay = {};
  for (const c of dailyComplaints) {
    const d   = new Date(c.created_at);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000); // IST offset
    const dayKey = ist.toISOString().slice(0, 10);
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(c);
  }

  for (const [day, dayCmps] of Object.entries(byDay)) {
    // Daily files show current status (complaint was created today, status is live)
    const wb   = new ExcelJS.Workbook();
    wb.creator = 'Scan2Fix';
    wb.created = wb.modified = new Date();
    addSheet(wb, `Complaints ${day}`, dayCmps, null);
    await wb.xlsx.writeFile(path.join(folderDir, `${day}.xlsx`));
    filesCreated++;
  }

  // ── Combined file: all active complaints with historical status ───
  // One sheet only — same detail as daily files, no summary numbers.
  const wb      = new ExcelJS.Workbook();
  wb.creator    = 'Scan2Fix';
  wb.created    = wb.modified = new Date();
  // Pass monthEndMs so status shown = what the complaint's status WAS at end of this month
  addSheet(wb, `All Complaints — ${label}`, activeComplaints, monthEndMs);
  await wb.xlsx.writeFile(path.join(folderDir, `combined-${label}.xlsx`));
  filesCreated++;

  console.log(`📊 Monthly report: ${label} — ${activeComplaints.length} active, ${dailyComplaints.length} created, ${filesCreated} files`);

  return {
    label,
    folder:          folderDir,
    filesCreated,
    totalComplaints: activeComplaints.length,
    newThisMonth:    dailyComplaints.length,
    dailyFiles:      Object.keys(byDay).length,
    combinedFile:    `combined-${label}.xlsx`,
  };
};

exports.listReports = () => {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs.readdirSync(REPORTS_DIR)
    .filter(f => /^\d{4}-\d{2}$/.test(f))
    .sort().reverse()
    .map(month => {
      const dir   = path.join(REPORTS_DIR, month);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
      return { month, files };
    });
};

exports.REPORTS_DIR = REPORTS_DIR;
