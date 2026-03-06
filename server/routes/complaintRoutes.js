// ============================================
// Complaint Routes
// ============================================
// POST   /api/complaints                    → Create complaint (user)
// GET    /api/complaints                    → Get all complaints (admin)
// GET    /api/complaints/mine               → Get my complaints (user)
// GET    /api/complaints/staff-jobs         → Get my assigned jobs (staff)
// GET    /api/complaints/:id               → Get single complaint
// PUT    /api/complaints/:id/assign        → Assign staff (admin)
// PUT    /api/complaints/:id/status        → Update status (staff)
// POST   /api/complaints/:id/generate-otp  → Generate OTP (staff)
// POST   /api/complaints/:id/verify-otp    → Verify OTP (user)
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  getStaffJobs,
  getComplaintById,
  assignStaff,
  updateStatus,
  generateComplaintOTP,
  verifyOTP,
} = require('../controllers/complaintController');

// ── User routes ──
router.post('/', protect, authorize('USER', 'ADMIN'), createComplaint);
router.get('/mine', protect, getMyComplaints);

// ── Staff routes ──
router.get('/staff-jobs', protect, authorize('STAFF'), getStaffJobs);
router.put('/:id/status', protect, authorize('STAFF', 'ADMIN'), updateStatus);
router.post('/:id/generate-otp', protect, authorize('STAFF'), generateComplaintOTP);

// ── User verification ──
router.post('/:id/verify-otp', protect, verifyOTP);

// ── Admin routes ──
router.get('/', protect, authorize('ADMIN'), getAllComplaints);
router.put('/:id/assign', protect, authorize('ADMIN'), assignStaff);

// ── Shared (any authenticated user) ──
router.get('/:id', protect, getComplaintById);

module.exports = router;