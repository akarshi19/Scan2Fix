// ============================================
// Upload Controller
// ============================================
// Handles profile photo and complaint photo uploads
//
// REPLACES IN YOUR MOBILE APP:
// ─────────────────────────────
// PhotoPicker.js:
//   const { data, error } = await supabase.storage
//     .from('complaint-photos')
//     .upload(filePath, arrayBuffer, { contentType })
//   const { data: urlData } = supabase.storage
//     .from('complaint-photos')
//     .getPublicUrl(filePath)
//   await supabase.from('profiles').update({ photo_url }).eq('id', userId)
//
// LodgeComplaint.js:
//   await supabase.storage.from('complaint-photos').upload(fileName, arrayBuffer)
//   supabase.storage.from('complaint-photos').getPublicUrl(fileName)
//
// AFTER MIGRATION:
//   Mobile sends FormData with file → Server saves to disk → Returns URL
// ============================================

const User = require('../models/User');

// ────────────────────────────────────────
// POST /api/upload/profile-photo
// ────────────────────────────────────────
// Upload or update profile photo
// Called by: PhotoPicker.js component
//
// Before (Supabase):
//   1. Upload to supabase.storage
//   2. Get public URL
//   3. Update profiles table with URL
//
// Now (MongoDB):
//   1. Multer saves file to /uploads/profiles/
//   2. We build the URL
//   3. Update User document with URL
//   All in one API call!
// ────────────────────────────────────────
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Build the public URL for this file
    // Format: /uploads/profiles/userId_timestamp.jpg
    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user's photo_url in database
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { photo_url: photoUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      data: {
        photo_url: photoUrl,
        user: user.toProfileJSON(),
      },
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
    });
  }
};

// ────────────────────────────────────────
// POST /api/upload/complaint-photo
// ────────────────────────────────────────
// Upload a photo for a complaint
// Called by: LodgeComplaint.js screen
//
// This just uploads and returns the URL.
// The complaint itself is created in a separate API call.
// The mobile app will:
//   1. Call POST /api/upload/complaint-photo → get URL
//   2. Call POST /api/complaints → pass the URL with complaint data
// ────────────────────────────────────────
exports.uploadComplaintPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Build the public URL
    const photoUrl = `/uploads/complaints/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photo_url: photoUrl,
      },
    });
  } catch (error) {
    console.error('Complaint photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload complaint photo',
    });
  }
};