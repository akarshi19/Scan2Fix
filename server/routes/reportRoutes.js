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
  getWeeklyReport,
  getMonthlyReport,
  getYearlyReport,
  getStaffReport,
  getMyStaffReport,
  generateExcelReport,
  downloadExcelFile,
  listExcelReports,
} = require('../controllers/reportController');

// Staff can only access their own report
router.get('/staff/me', protect, authorize('STAFF', 'ADMIN'), getMyStaffReport);

// All other report routes are ADMIN only
router.use(protect, authorize('ADMIN'));

router.get('/overview', getOverview);
router.get('/weekly',   getWeeklyReport);
router.get('/monthly',  getMonthlyReport);
router.get('/yearly',   getYearlyReport);
router.get('/staff',    getStaffReport);

// Monthly Excel export routes
// GET /api/reports/excel                         → list all generated reports
// POST /api/reports/excel/generate?year=&month=  → generate report for a month
// GET /api/reports/excel/download?year=&month=&file= → download a specific file
router.get('/excel',             listExcelReports);
router.post('/excel/generate',   generateExcelReport);
router.get('/excel/download',    downloadExcelFile);

module.exports = router;