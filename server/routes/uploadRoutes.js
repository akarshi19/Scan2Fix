const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, setUploadType, handleMulterError } = require('../middleware/upload');
const {
  uploadProfilePhoto,
  uploadComplaintPhoto,
  uploadGenericPhoto, 
} = require('../controllers/uploadController');

// Profile photo upload (protected)
router.post(
  '/profile-photo',
  protect,
  setUploadType('profiles'),
  upload.single('photo'),
  handleMulterError,
  uploadProfilePhoto
);

// Complaint photo upload (protected)
router.post(
  '/complaint-photo',
  protect,
  setUploadType('complaints'),
  upload.single('photo'),
  handleMulterError,
  uploadComplaintPhoto
);

// Generic photo upload (PUBLIC - no protect)
// Used for signup/add user before authentication
router.post(
  '/photo',
  setUploadType('general'), // Saves to uploads/general/
  upload.single('photo'),
  handleMulterError,
  uploadGenericPhoto
);

module.exports = router;