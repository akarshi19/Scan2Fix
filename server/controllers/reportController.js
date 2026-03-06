// ============================================
// Report Controller
// ============================================
// Monthly, yearly, and staff-wise analytics
// ADMIN ONLY — matches your requirement:
// "Monthly, yearly data for each type of complaints
//  and maintenance staff wise data should be access
//  by the admin only"
//
// Uses MongoDB Aggregation Pipeline
// (This is equivalent to SQL GROUP BY queries)
// ============================================

const Complaint = require('../models/Complaint');
const User = require('../models/User');

// ────────────────────────────────────────
// GET /api/reports/monthly?year=2025
// ────────────────────────────────────────
// Monthly complaints grouped by asset type
//
// Returns data like:
// [
//   { month: 1, monthName: "January", AC: 12, WATER_COOLER: 5, DESERT_COOLER: 3, total: 20 },
//   { month: 2, monthName: "February", AC: 8, WATER_COOLER: 7, DESERT_COOLER: 1, total: 16 },
//   ...
// ]
// ────────────────────────────────────────
exports.getMonthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Aggregate: group by month and asset type
    const pipeline = [
      {
        $match: {
          created_at: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year + 1}-01-01`),
          },
        },
      },
      {
        // Join with assets collection to get asset type
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetInfo',
        },
      },
      {
        $unwind: {
          path: '$assetInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$created_at' },
            assetType: '$assetInfo.type',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.month': 1 },
      },
    ];

    const rawData = await Complaint.aggregate(pipeline);

    // Transform into a clean format for charts
    // Initialize all 12 months
    const monthlyData = [];
    for (let m = 1; m <= 12; m++) {
      const monthEntry = {
        month: m,
        monthName: monthNames[m],
        AC: 0,
        WATER_COOLER: 0,
        DESERT_COOLER: 0,
        total: 0,
      };

      // Fill in data from aggregation
      rawData.forEach((item) => {
        if (item._id.month === m && item._id.assetType) {
          monthEntry[item._id.assetType] = item.count;
          monthEntry.total += item.count;
        }
      });

      monthlyData.push(monthEntry);
    }

    // Summary totals
    const summary = {
      year,
      totalComplaints: monthlyData.reduce((sum, m) => sum + m.total, 0),
      totalAC: monthlyData.reduce((sum, m) => sum + m.AC, 0),
      totalWaterCooler: monthlyData.reduce(
        (sum, m) => sum + m.WATER_COOLER,
        0
      ),
      totalDesertCooler: monthlyData.reduce(
        (sum, m) => sum + m.DESERT_COOLER,
        0
      ),
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        monthly: monthlyData,
      },
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating monthly report',
    });
  }
};

// ────────────────────────────────────────
// GET /api/reports/yearly
// ────────────────────────────────────────
// Yearly summary — complaints per year grouped by type
//
// Returns:
// [
//   { year: 2024, AC: 45, WATER_COOLER: 23, DESERT_COOLER: 12, total: 80 },
//   { year: 2025, AC: 30, WATER_COOLER: 15, DESERT_COOLER: 8, total: 53 },
// ]
// ────────────────────────────────────────
exports.getYearlyReport = async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetInfo',
        },
      },
      {
        $unwind: {
          path: '$assetInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            assetType: '$assetInfo.type',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1 },
      },
    ];

    const rawData = await Complaint.aggregate(pipeline);

    // Get unique years
    const years = [...new Set(rawData.map((d) => d._id.year))].sort(
      (a, b) => b - a
    );

    const yearlyData = years.map((year) => {
      const entry = {
        year,
        AC: 0,
        WATER_COOLER: 0,
        DESERT_COOLER: 0,
        total: 0,
      };

      rawData.forEach((item) => {
        if (item._id.year === year && item._id.assetType) {
          entry[item._id.assetType] = item.count;
          entry.total += item.count;
        }
      });

      return entry;
    });

    res.status(200).json({
      success: true,
      data: yearlyData,
    });
  } catch (error) {
    console.error('Yearly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating yearly report',
    });
  }
};

// ────────────────────────────────────────
// GET /api/reports/staff
// ────────────────────────────────────────
// Staff-wise performance report
//
// Returns:
// [
//   {
//     staffName: "Rahul Sharma",
//     staffEmail: "rahul@test.com",
//     designation: "SENIOR",
//     totalAssigned: 25,
//     closed: 20,
//     open: 5,
//     avgResolutionHours: 4.5,
//     isOnLeave: false
//   },
//   ...
// ]
// ────────────────────────────────────────
exports.getStaffReport = async (req, res) => {
  try {
    const pipeline = [
      {
        // Only complaints that have been assigned
        $match: {
          assigned_staff_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$assigned_staff_id',
          totalAssigned: { $sum: 1 },
          closed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
          open: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
          avgResolutionMs: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'CLOSED'] },
                    { $ne: ['$closed_at', null] },
                  ],
                },
                { $subtract: ['$closed_at', '$created_at'] },
                null,
              ],
            },
          },
        },
      },
      {
        // Join with users to get staff details
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staffInfo',
        },
      },
      {
        $unwind: '$staffInfo',
      },
      {
        $project: {
          _id: 0,
          staffId: '$_id',
          staffName: '$staffInfo.full_name',
          staffEmail: '$staffInfo.email',
          designation: '$staffInfo.designation',
          isOnLeave: '$staffInfo.is_on_leave',
          photoUrl: '$staffInfo.photo_url',
          totalAssigned: 1,
          closed: 1,
          open: 1,
          avgResolutionHours: {
            $cond: [
              { $ne: ['$avgResolutionMs', null] },
              {
                $round: [
                  { $divide: ['$avgResolutionMs', 3600000] }, // ms to hours
                  1,
                ],
              },
              null,
            ],
          },
          completionRate: {
            $cond: [
              { $gt: ['$totalAssigned', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$closed', '$totalAssigned'] },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: { totalAssigned: -1 },
      },
    ];

    const staffData = await Complaint.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: staffData.length,
      data: staffData,
    });
  } catch (error) {
    console.error('Staff report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating staff report',
    });
  }
};

// ────────────────────────────────────────
// GET /api/reports/overview
// ────────────────────────────────────────
// Quick stats for admin dashboard
//
// Replaces (AdminDashboard.js):
//   Fetches all complaints and computes stats client-side
//   Now computed server-side for better performance
// ────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    // Count complaints by status
    const statusCounts = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Transform to object
    const stats = {
      total: 0,
      open: 0,
      assigned: 0,
      inProgress: 0,
      closed: 0,
    };

    statusCounts.forEach((item) => {
      stats.total += item.count;
      switch (item._id) {
        case 'OPEN':
          stats.open = item.count;
          break;
        case 'ASSIGNED':
          stats.assigned = item.count;
          break;
        case 'IN_PROGRESS':
          stats.inProgress = item.count;
          break;
        case 'CLOSED':
          stats.closed = item.count;
          break;
      }
    });

    // Count users by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const users = {
      totalUsers: 0,
      admins: 0,
      staff: 0,
      regularUsers: 0,
      staffOnLeave: 0,
      staffAvailable: 0,
    };

    userCounts.forEach((item) => {
      users.totalUsers += item.count;
      switch (item._id) {
        case 'ADMIN':
          users.admins = item.count;
          break;
        case 'STAFF':
          users.staff = item.count;
          break;
        case 'USER':
          users.regularUsers = item.count;
          break;
      }
    });

    // Count staff on leave
    users.staffOnLeave = await User.countDocuments({
      role: 'STAFF',
      is_on_leave: true,
    });
    users.staffAvailable = users.staff - users.staffOnLeave;

    // Count by asset type
    const typeCounts = await Complaint.aggregate([
      {
        $lookup: {
          from: 'assets',
          localField: 'asset',
          foreignField: '_id',
          as: 'assetInfo',
        },
      },
      { $unwind: { path: '$assetInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$assetInfo.type',
          count: { $sum: 1 },
        },
      },
    ]);

    const byType = {
      AC: 0,
      WATER_COOLER: 0,
      DESERT_COOLER: 0,
    };

    typeCounts.forEach((item) => {
      if (item._id && byType.hasOwnProperty(item._id)) {
        byType[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        complaints: stats,
        users,
        byType,
      },
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating overview',
    });
  }
};