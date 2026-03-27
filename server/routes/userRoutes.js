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
  deleteUser,
  toggleLeave,
  toggleSelfLeave,
  getLeaveStatus,
  getDesignations,
} = require('../controllers/userController');

// ── Self routes (staff managing their own leave) ──
router.get('/self/leave-status', protect, authorize('STAFF'), getLeaveStatus);
router.put('/self/toggle-leave', protect, authorize('STAFF'), toggleSelfLeave);

// ── Staff list (used in assignment dropdown) ──
router.get('/staff', protect, authorize('ADMIN'), getStaffList);

// ── Designations ──
router.get('/designations', protect, authorize('ADMIN'), getDesignations);

// ── Admin routes ──
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.post('/', protect, authorize('ADMIN'), createUser);

// ── These MUST come LAST ──
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.put('/:id', protect, authorize('ADMIN'), updateUser);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);
router.put('/:id/toggle-leave', protect, authorize('ADMIN'), toggleLeave);

module.exports = router;