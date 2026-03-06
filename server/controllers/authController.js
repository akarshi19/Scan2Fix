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

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already registered with this email',
      });
    }

    // Create user (password is hashed automatically by pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name || '',
      role: 'USER', // Self-signup is always USER role
    });

    // Generate token (auto-login after signup)
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

    // Handle duplicate email (mongoose error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already registered with this email',
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