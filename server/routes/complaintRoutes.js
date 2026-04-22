// ============================================
// Complaint Routes
// ============================================
// POST   /api/complaints                    → Create complaint (user, protected)
// POST   /api/complaints/qr-scan/submit     → Create complaint from QR (public/web)
// GET    /api/complaints                    → Get all complaints (admin)
// GET    /api/complaints/mine               → Get my complaints (user) - Active only
// GET    /api/complaints/mine/archived      → Get my archived complaints (user)
// GET    /api/complaints/staff-jobs         → Get my assigned jobs (staff) - Active only
// GET    /api/complaints/:id                → Get single complaint
// GET    /api/complaints/archived           → Get all archived (admin)
// GET    /api/complaints/archived/stats     → Get archive stats (admin)
// PUT    /api/complaints/:id/assign         → Assign staff (admin)
// PUT    /api/complaints/:id/status         → Update status (staff)
// POST   /api/complaints/:id/generate-otp   → Generate OTP (staff)
// POST   /api/complaints/:id/verify-otp     → Verify OTP (user)
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
  updateDescription,
  createQRComplaint,
  sendOTPByEmail,
  getArchivedComplaints,
  getMyArchivedComplaints,
  getArchivedStats,
  closeWithAck,
} = require('../controllers/complaintController');

// ── PUBLIC ROUTES (no auth needed) ──
// Must come BEFORE protected routes to avoid being caught by :id pattern
router.post('/qr-scan/submit', createQRComplaint);

// ── User routes ──
router.post('/', protect, authorize('USER', 'ADMIN'), createComplaint);
router.get('/mine', protect, getMyComplaints);
router.get('/mine/archived', protect, getMyArchivedComplaints);

// ── USER generates OTP ──
router.post('/:id/generate-otp', protect, authorize('USER'), generateComplaintOTP);

// ── Staff routes ──
router.get('/staff-jobs', protect, authorize('STAFF'), getStaffJobs);
router.put('/:id/status', protect, authorize('STAFF', 'ADMIN'), updateStatus);
router.post('/:id/send-otp', protect, authorize('STAFF', 'ADMIN'), sendOTPByEmail);

// ── STAFF verifies OTP ──
router.post('/:id/verify-otp', protect, authorize('STAFF'), verifyOTP);

// ── STAFF closes with written acknowledgement (no-email complaints) ──
router.post('/:id/close-with-ack', protect, authorize('STAFF'), closeWithAck);

// ── ADMIN archive routes (must come before /:id pattern) ──
router.get('/archived/stats', protect, authorize('ADMIN'), getArchivedStats);
router.get('/archived', protect, authorize('ADMIN'), getArchivedComplaints);

// ── Admin routes ──
router.get('/', protect, authorize('ADMIN'), getAllComplaints);
router.put('/:id/assign', protect, authorize('ADMIN'), assignStaff);

// ── Shared ──
router.get('/:id', protect, getComplaintById);
router.put('/:id/description', protect, updateDescription);

module.exports = router;
