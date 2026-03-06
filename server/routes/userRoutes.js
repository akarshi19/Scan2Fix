// ============================================
// User Management Routes
// ============================================
// GET    /api/users                     → Get all users (admin)
// GET    /api/users/staff               → Get staff list (admin)
// GET    /api/users/self/leave-status   → Get own leave status (staff)
// PUT    /api/users/self/toggle-leave   → Toggle own leave (staff)
// GET    /api/users/:id                 → Get user detail (admin)
// POST   /api/users                     → Create user (admin)
// PUT    /api/users/:id                 → Update user (admin)
// PUT    /api/users/:id/toggle-leave    → Toggle leave (admin)
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getAllUsers,
  getStaffList,
  getUserById,
  createUser,
  updateUser,
  toggleLeave,
  toggleSelfLeave,
  getLeaveStatus,
} = require('../controllers/userController');

// ── Self routes (staff managing their own leave) ──
// These must come BEFORE /:id routes to avoid conflict
router.get(
  '/self/leave-status',
  protect,
  authorize('STAFF'),
  getLeaveStatus
);
router.put(
  '/self/toggle-leave',
  protect,
  authorize('STAFF'),
  toggleSelfLeave
);

// ── Staff list (used in assignment dropdown) ──
router.get('/staff', protect, authorize('ADMIN'), getStaffList);

// ── Admin routes ──
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.post('/', protect, authorize('ADMIN'), createUser);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.put('/:id', protect, authorize('ADMIN'), updateUser);
router.put('/:id/toggle-leave', protect, authorize('ADMIN'), toggleLeave);

module.exports = router;