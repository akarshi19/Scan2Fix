// ============================================
// File Upload Middleware (Multer)
// ============================================
// Replaces Supabase Storage completely
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// S1. supabase.storage.from('complaint-photos').upload(fileName, arrayBuffer)
// S2. supabase.storage.from('complaint-photos').getPublicUrl(fileName)
// S3. supabase.storage.from('complaint-photos').upload(filePath, arrayBuffer)  [profile]
// S4. supabase.storage.from('complaint-photos').getPublicUrl(filePath)         [profile]
//
// HOW IT WORKS:
// 1. Multer intercepts multipart/form-data requests
// 2. Saves file to /uploads/profiles/ or /uploads/complaints/
// 3. Controller reads req.file to get the saved file info
// 4. Returns URL like: http://your-server/uploads/complaints/photo123.jpg
//
// YOUR APP CURRENTLY:
//   LodgeComplaint.js → converts image to ArrayBuffer → uploads to Supabase bucket
//   PhotoPicker.js    → converts image to ArrayBuffer → uploads to Supabase bucket
//
// AFTER MIGRATION:
//   LodgeComplaint.js → sends FormData with image file → server saves to disk
//   PhotoPicker.js    → sends FormData with image file → server saves to disk
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ════════════════════════════════════════
// Ensure upload directories exist
// ════════════════════════════════════════
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(path.join(__dirname, '..', 'uploads', 'profiles'));
ensureDir(path.join(__dirname, '..', 'uploads', 'complaints'));

// ════════════════════════════════════════
// Storage Configuration
// ════════════════════════════════════════
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder based on upload type
    // The route will set req.uploadType before multer runs
    const uploadType = req.uploadType || 'complaints';
    const uploadPath = path.join(__dirname, '..', 'uploads', uploadType);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp.ext
    // e.g., 665abc123_1721234567890.jpg
    const userId = req.user ? req.user._id : 'unknown';
    const uniqueName = `${userId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ════════════════════════════════════════
// File Filter — only allow images
// ════════════════════════════════════════
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// ════════════════════════════════════════
// Create Multer Instance
// ════════════════════════════════════════
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
});

// ════════════════════════════════════════
// Middleware to set upload type BEFORE multer
// ════════════════════════════════════════
const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// ════════════════════════════════════════
// Error handler for multer
// ════════════════════════════════════════
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed',
    });
  }

  next();
};

module.exports = {
  upload,
  setUploadType,
  handleMulterError,
};