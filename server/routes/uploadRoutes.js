// ============================================
// Upload Routes
// ============================================
// POST /api/upload/profile-photo     → Upload profile picture
// POST /api/upload/complaint-photo   → Upload complaint photo
//
// Both routes require authentication (protect middleware)
// Files are saved to server disk, not cloud storage
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, setUploadType, handleMulterError } = require('../middleware/upload');
const {
  uploadProfilePhoto,
  uploadComplaintPhoto,
} = require('../controllers/uploadController');

// Profile photo upload
// Middleware chain: protect → setType → multer → errorHandler → controller
router.post(
  '/profile-photo',
  protect,
  setUploadType('profiles'),
  upload.single('photo'),
  handleMulterError,
  uploadProfilePhoto
);

// Complaint photo upload
router.post(
  '/complaint-photo',
  protect,
  setUploadType('complaints'),
  upload.single('photo'),
  handleMulterError,
  uploadComplaintPhoto
);

module.exports = router;