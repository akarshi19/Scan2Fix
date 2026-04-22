// ============================================
// Report Controller — complaints + staff analytics
// ============================================

const Complaint = require('../models/Complaint_v2');
const User      = require('../models/User_v2');

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─────────────────────────────────────────────
// GET /api/reports/overview
// ─────────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    const statusCounts = await Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const stats = { total: 0, open: 0, assigned: 0, inProgress: 0, finishing: 0, closed: 0 };
    statusCounts.forEach(item => {
      stats.total += item.count;
      if (item._id === 'OPEN')        stats.open        = item.count;
      if (item._id === 'ASSIGNED')    stats.assigned    = item.count;
      if (item._id === 'IN_PROGRESS') stats.inProgress  = item.count;
      if (item._id === 'FINISHING')   stats.finishing   = item.count;
      if (item._id === 'CLOSED')      stats.closed      = item.count;
    });

    const userCounts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const users = { totalUsers: 0, admins: 0, staff: 0, regularUsers: 0, staffOnLeave: 0, staffAvailable: 0 };
    userCounts.forEach(item => {
      users.totalUsers += item.count;
      if (item._id === 'ADMIN') users.admins       = item.count;
      if (item._id === 'STAFF') users.staff        = item.count;
      if (item._id === 'USER')  users.regularUsers = item.count;
    });
    users.staffOnLeave  = await User.countDocuments({ role: 'STAFF', 'availability.is_on_leave': true });
    users.staffAvailable = users.staff - users.staffOnLeave;

    // Group by asset_type directly from complaint
    const typeCounts = await Complaint.aggregate([
      { $group: { _id: '$asset_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byType = {};
    typeCounts.forEach(item => { if (item._id) byType[item._id] = item.count; });

    res.status(200).json({ success: true, data: { complaints: stats, users, byType } });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ success: false, message: 'Server error generating overview' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/weekly
// Last 7 days — complaints per day + by asset_type
// ─────────────────────────────────────────────
exports.getWeeklyReport = async (req, res) => {
  try {
    const now   = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const rawData = await Complaint.aggregate([
      { $match: { created_at: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: {
            day:       { $dayOfMonth: '$created_at' },
            month:     { $month: '$created_at' },
            year:      { $year: '$created_at' },
            dayOfWeek: { $dayOfWeek: '$created_at' },
            assetType: '$asset_type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const allTypes = [...new Set(rawData.map(d => d._id.assetType).filter(Boolean))].sort();

    // Build 7-day array
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const day   = d.getDate();
      const month = d.getMonth() + 1;
      const year  = d.getFullYear();
      const entry = {
        label: `${DAY_NAMES[d.getDay()]} ${day}/${month}`,
        date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        total: 0,
        byType: {},
      };
      allTypes.forEach(t => { entry.byType[t] = 0; });
      rawData.forEach(item => {
        if (item._id.day === day && item._id.month === month && item._id.year === year && item._id.assetType) {
          entry.byType[item._id.assetType] = (entry.byType[item._id.assetType] || 0) + item.count;
          entry.total += item.count;
        }
      });
      days.push(entry);
    }

    const totalWeek = days.reduce((s, d) => s + d.total, 0);

    res.status(200).json({ success: true, data: { days, assetTypes: allTypes, totalComplaints: totalWeek } });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({ success: false, message: 'Server error generating weekly report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/monthly?year=2026
// Monthly complaints grouped by asset_type
// ─────────────────────────────────────────────
exports.getMonthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const rawData = await Complaint.aggregate([
      { $match: { created_at: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${year+1}-01-01`) } } },
      { $group: { _id: { month: { $month: '$created_at' }, assetType: '$asset_type' }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]);

    const allTypes = [...new Set(rawData.map(d => d._id.assetType).filter(Boolean))].sort();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const entry = { month: m, monthName: MONTH_NAMES[m], total: 0, byType: {} };
      allTypes.forEach(t => { entry.byType[t] = 0; });
      rawData.forEach(item => {
        if (item._id.month === m && item._id.assetType) {
          entry.byType[item._id.assetType] = item.count;
          entry.total += item.count;
        }
      });
      months.push(entry);
    }

    const total = months.reduce((s, m) => s + m.total, 0);

    res.status(200).json({ success: true, data: { months, assetTypes: allTypes, total, year } });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ success: false, message: 'Server error generating monthly report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/yearly
// ─────────────────────────────────────────────
exports.getYearlyReport = async (req, res) => {
  try {
    const rawData = await Complaint.aggregate([
      { $match: { created_at: { $exists: true, $ne: null, $type: 'date' } } },
      { $group: { _id: { year: { $year: '$created_at' }, assetType: '$asset_type' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1 } },
    ]);

    const years    = [...new Set(rawData.map(d => d._id.year).filter(y => y != null))].sort((a, b) => b - a);
    const allTypes = [...new Set(rawData.map(d => d._id.assetType).filter(Boolean))].sort();

    const yearlyData = years.map(year => {
      const byType = {};
      allTypes.forEach(t => { byType[t] = 0; });
      let total = 0;
      rawData.forEach(item => {
        if (item._id.year === year && item._id.assetType) {
          byType[item._id.assetType] = item.count;
          total += item.count;
        }
      });
      return { year, total, byType };
    });

    res.status(200).json({ success: true, data: yearlyData });
  } catch (error) {
    console.error('Yearly report error:', error);
    res.status(500).json({ success: false, message: 'Server error generating yearly report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/staff   (ADMIN)
// ─────────────────────────────────────────────
exports.getStaffReport = async (req, res) => {
  try {
    const allStaff = await User.find({ role: 'STAFF', is_active: true }).lean();

    const complaintStats = await Complaint.aggregate([
      { $match: { 'assigned_staff.staff_id': { $ne: null } } },
      {
        $group: {
          _id:             '$assigned_staff.staff_id',
          totalAssigned:   { $sum: 1 },
          closed:          { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          open:            { $sum: { $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0] } },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'CLOSED'] }, { $ne: ['$closed_at', null] }, { $ne: ['$assigned_staff.assigned_at', null] }] },
                { $subtract: ['$closed_at', '$assigned_staff.assigned_at'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    for (const s of complaintStats) statsMap[s._id.toString()] = s;

    const staffData = allStaff.map(staff => {
      const stats       = statsMap[staff._id.toString()] || { totalAssigned: 0, closed: 0, open: 0, avgResolutionMs: null };
      const avgHours    = stats.avgResolutionMs ? Math.round((stats.avgResolutionMs / 3600000) * 10) / 10 : null;
      const completionRate = stats.totalAssigned > 0 ? Math.round((stats.closed / stats.totalAssigned) * 1000) / 10 : 0;
      return {
        staffId: staff._id, staffName: staff.full_name, staffEmail: staff.email,
        designation: staff.staff_details?.designation || null,
        isOnLeave: staff.availability?.is_on_leave || false,
        photoUrl: staff.photo_url || null,
        totalAssigned: stats.totalAssigned, closed: stats.closed, open: stats.open,
        avgResolutionHours: avgHours, completionRate,
      };
    }).sort((a, b) => b.totalAssigned - a.totalAssigned || (a.staffName || '').localeCompare(b.staffName || ''));

    const withComplaints = staffData.filter(s => s.totalAssigned > 0);
    let starStaff = null;
    if (withComplaints.length > 0) {
      const scored = withComplaints.map(s => ({
        ...s,
        score: (s.completionRate * 0.5) + (s.closed * 2) - (s.avgResolutionHours != null ? s.avgResolutionHours * 0.1 : 0),
      })).sort((a, b) => b.score - a.score);
      starStaff = scored[0];
    }

    res.status(200).json({ success: true, count: staffData.length, data: staffData, starStaff });
  } catch (error) {
    console.error('Staff report error:', error);
    res.status(500).json({ success: false, message: 'Server error generating staff report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/staff/me   (STAFF)
// ─────────────────────────────────────────────
exports.getMyStaffReport = async (req, res) => {
  try {
    const staffUser = await User.findById(req.user._id).lean();
    if (!staffUser) return res.status(404).json({ success: false, message: 'Staff not found' });

    const stats = await Complaint.aggregate([
      { $match: { 'assigned_staff.staff_id': req.user._id } },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          open:   { $sum: { $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0] } },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'CLOSED'] }, { $ne: ['$closed_at', null] }, { $ne: ['$assigned_staff.assigned_at', null] }] },
                { $subtract: ['$closed_at', '$assigned_staff.assigned_at'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const s       = stats[0] || { totalAssigned: 0, closed: 0, open: 0, avgResolutionMs: null };
    const avgHours = s.avgResolutionMs ? Math.round((s.avgResolutionMs / 3600000) * 10) / 10 : null;

    res.status(200).json({
      success: true,
      data: {
        staffId: staffUser._id, staffName: staffUser.full_name, staffEmail: staffUser.email,
        designation: staffUser.staff_details?.designation || null,
        isOnLeave: staffUser.availability?.is_on_leave || false,
        photoUrl: staffUser.photo_url || null,
        totalAssigned: s.totalAssigned, closed: s.closed, open: s.open,
        avgResolutionHours: avgHours,
        completionRate: s.totalAssigned > 0 ? Math.round((s.closed / s.totalAssigned) * 1000) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('My staff report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
