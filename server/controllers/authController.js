// ============================================
// Auth Controller
// ============================================
// Handles: Login, Signup, Get Profile, Update Profile
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// A1. supabase.auth.signInWithPassword({email,password})  → login()
// A2. supabase.auth.signUp({email,password})              → signup()
// A3. supabase.auth.signOut()                             → (client-side: delete token)
// A4. supabase.auth.getSession()                          → getMe()
// A5. supabase.auth.onAuthStateChange()                   → (client-side: check stored token)
// P1. SELECT role,full_name,email FROM profiles           → getMe()
// P8. INSERT profiles {id,email,full_name,role:'USER'}    → signup()
// P9. INSERT profiles {id,email,role:'USER'}              → signup()
// ============================================

const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// ────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────
// Replaces: supabase.auth.signInWithPassword({ email, password })
//
// Your LoginScreen.js currently does:
//   const { error } = await signIn(email.trim(), password);
//
// After migration it will do:
//   const { data } = await api.post('/auth/login', { email, password });
//   Store data.token in SecureStore
// ────────────────────────────────────────
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
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Return user data + token
    // This matches what Supabase returned: session + user
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

// ────────────────────────────────────────
// POST /api/auth/signup
// ────────────────────────────────────────
// Replaces:
//   supabase.auth.signUp({ email, password })
//   THEN supabase.from('profiles').insert({ id, email, full_name, role: 'USER' })
//
// Your SignupScreen.js currently does TWO steps:
//   1. Create auth user
//   2. Create profile row
// Now it's ONE step — because User model has both auth + profile
// ────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

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
        message: 'Please enter a valid email address (e.g., user@example.com)',
      });
    }

    // Block disposable email domains
    const blockedDomains = [
      'tempmail.com', 'throwaway.email', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'trashmail.com',
      'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com',
    ];
    const emailDomain = email.split('@')[1].toLowerCase();
    if (blockedDomains.includes(emailDomain)) {
      return res.status(400).json({
        success: false,
        message: 'Disposable email addresses are not allowed',
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please login instead.',
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name.trim(),
      role: 'USER',
      auth_provider: 'local',
    });

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

// ────────────────────────────────────────
// GET /api/auth/me
// ────────────────────────────────────────
// Replaces:
//   supabase.auth.getSession()  → to check if logged in
//   supabase.from('profiles').select('role,full_name,email').eq('id',userId)
//
// Your AuthContext.js currently:
//   1. Calls getSession() on app start
//   2. If session exists, calls fetchUserRole(userId)
//
// After migration:
//   1. Check SecureStore for saved token
//   2. If token exists, call GET /api/auth/me
//   3. Server verifies token and returns user data with role
// ────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    // req.user is already set by the protect middleware
    // It contains the full user document (minus password)
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

// ────────────────────────────────────────
// PUT /api/auth/profile
// ────────────────────────────────────────
// Replaces:
//   supabase.from('profiles').update({ full_name, phone }).eq('id', user.id)
//
// Your ProfileScreen.js currently calls this to save profile changes
// ────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    // Only allow updating safe fields
    const updateFields = {};
    if (full_name !== undefined) updateFields.full_name = full_name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();

    const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true, // Return updated document
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

// ────────────────────────────────────────
// POST /api/auth/forgot-password
// ────────────────────────────────────────
// Generates a temporary reset code and returns it
// In a real production app, you'd email this code
// For office use, admin can share the code
// ────────────────────────────────────────
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
    // For now, return the code (admin can share it)
    console.log(`Password reset code for ${email}: ${resetCode}`);

    res.status(200).json({
      success: true,
      message: 'Password reset code generated. Contact your admin for the code.',
      // Remove this in production — only for development/office use
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

// ────────────────────────────────────────
// POST /api/auth/reset-password
// ────────────────────────────────────────
// Verify reset code and set new password
// ────────────────────────────────────────
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

// ────────────────────────────────────────
// PUT /api/auth/change-password
// ────────────────────────────────────────
// Logged-in user changes their own password
// ────────────────────────────────────────
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