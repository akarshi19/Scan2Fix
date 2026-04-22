const User = require('../models/User_v2');

// POST /api/upload/profile-photo
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

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

// POST /api/upload/complaint-photo
exports.uploadComplaintPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

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

// POST /api/upload/photo
// Generic upload for signup/add user (public route, no auth required)
exports.uploadGenericPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Build public URL
    // Folder is determined by req.uploadType (set by middleware)
    const uploadType = req.uploadType || 'general';
    const photoUrl = `/uploads/${uploadType}/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        url: photoUrl,
        filename: req.file.filename,
      },
    });
  } catch (error) {
    console.error('Generic photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
    });
  }
};