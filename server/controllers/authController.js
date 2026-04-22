// ============================================
// Auth Controller
// ============================================
// Handles: Login, Signup, Get Profile, Update Profile, Delete Account

const User = require('../models/User_v2');
const generateToken = require('../utils/generateToken');
const dns = require('dns').promises;

// Email verification helper
const verifyEmailDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    const addresses = await dns.resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (error) {
    return false;
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user by email (explicitly include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Return user data + token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.toProfileJSON(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password, full_name, phone, role, employee_id, photo_url } = req.body;

    // Check if email was verified
    global.verificationCodes = global.verificationCodes || {};
    const storedData = global.verificationCodes[email.toLowerCase()];
    
    if (!storedData || !storedData.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
        requiresVerification: true,
      });
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Password strength validation
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one letter and one number',
      });
    }

    // Full name validation
    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your full name (at least 2 characters)',
      });
    }

    // Indian phone number validation (10 digits, starts with 6-9)
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits',
        });
      }
      if (!/^[6-9]/.test(phoneDigits)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Indian phone number. Must start with 6, 7, 8, or 9',
        });
      }
    }
     // Role validation
    const validRoles = ['USER', 'STAFF'];
    const userRole = (role || 'USER').toUpperCase();
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be USER or STAFF',
      });
    }

    // Staff-specific validation
    if (userRole === 'STAFF') {
      if (!employee_id || !employee_id.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required for staff members',
        });
      }
      if (!photo_url) {
        return res.status(400).json({
          success: false,
          message: 'Photo is required for staff members',
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name.trim(),
      phone: phone ? phone.replace(/\D/g, '') : '',
      role: userRole,
      employee_id: userRole === 'STAFF' ? employee_id.trim() : null,
      photo_url: photo_url || '',
      auth_provider: 'local',
      is_available: userRole === 'STAFF' ? true : undefined,
      is_on_leave: userRole === 'STAFF' ? false : undefined,
    });

    // Clear verification data
    delete global.verificationCodes[email.toLowerCase()];

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: user.toProfileJSON(),
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during signup',
    });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user.toProfileJSON(),
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;

    // Only allow updating safe fields
    const updateFields = {};
    if (full_name !== undefined) updateFields.full_name = full_name.trim();
    
    // Phone validation if provided
    if (phone !== undefined) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phone && phoneDigits.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits',
        });
      }
      updateFields.phone = phoneDigits;
    }

    // Email update with domain verification
    if (email !== undefined && email !== req.user.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
        });
      }

      // Verify email domain
      const domainExists = await verifyEmailDomain(email);
      if (!domainExists) {
        return res.status(400).json({
          success: false,
          message: 'Email domain does not exist. Please check your email address.',
          requiresVerification: true,
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use by another account',
        });
      }

      updateFields.email = email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toProfileJSON(),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

// DELETE /api/auth/account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    // MASTER ADMIN PROTECTION
    const MASTER_ADMIN_EMAIL = 'adminscan2fix@gmail.com';
    if (req.user.email === MASTER_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Master admin account cannot be deleted',
      });
    }

    // Verify password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Delete the account
    await User.findByIdAndDelete(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting account',
    });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.reset_code = resetCode;
    user.reset_code_expires = resetExpiry;
    await user.save();

    // In production, send email here
    console.log(`Password reset code for ${email}: ${resetCode}`);

    res.status(200).json({
      success: true,
      message: 'Password reset code generated. Contact your admin for the code.',
      data: {
        resetCode,
        expiresIn: '15 minutes',
      },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, reset_code, new_password } = req.body;

    if (!email || !reset_code || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset code, and new password are required',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    if (!user.reset_code || user.reset_code !== reset_code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code',
      });
    }

    if (user.reset_code_expires && new Date() > user.reset_code_expires) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    // Set new password
    user.password = new_password;
    user.reset_code = null;
    user.reset_code_expires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    if (!/[A-Za-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one letter and one number',
      });
    }

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.matchPassword(current_password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Set new password
    user.password = new_password;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// POST /api/auth/send-verification-code
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email, full_name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered',
      });
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in temporary collection or in-memory (using a simple map for now)
    // In production, use Redis or a temporary collection
    global.verificationCodes = global.verificationCodes || {};
    global.verificationCodes[email.toLowerCase()] = {
      code: verificationCode,
      expiry: codeExpiry,
      attempts: 0,
    };

    // Send email
    const emailService = require('../utils/emailService');
    const emailSent = await emailService.sendVerificationCode(
      email,
      verificationCode,
      full_name
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        expiresIn: '10 minutes',
        // Remove in production - only for development
        devCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
      },
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending verification code',
    });
  }
};

// POST /api/auth/verify-email-code
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    global.verificationCodes = global.verificationCodes || {};
    const storedData = global.verificationCodes[email.toLowerCase()];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new one.',
      });
    }

    // Check attempts
    if (storedData.attempts >= 3) {
      delete global.verificationCodes[email.toLowerCase()];
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
    }

    // Check expiry
    if (new Date() > storedData.expiry) {
      delete global.verificationCodes[email.toLowerCase()];
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    // Verify code
    if (storedData.code !== code) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        attemptsLeft: 3 - storedData.attempts,
      });
    }

    // Success - mark as verified
    storedData.verified = true;

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying code',
    });
  }
};