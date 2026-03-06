// ============================================
// Report Routes (ADMIN ONLY)
// ============================================
// GET /api/reports/overview         → Dashboard stats
// GET /api/reports/monthly?year=    → Monthly by type
// GET /api/reports/yearly           → Yearly by type
// GET /api/reports/staff            → Staff performance
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getOverview,
  getMonthlyReport,
  getYearlyReport,
  getStaffReport,
} = require('../controllers/reportController');

// All report routes are ADMIN only
router.use(protect, authorize('ADMIN'));

router.get('/overview', getOverview);
router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/staff', getStaffReport);

module.exports = router;