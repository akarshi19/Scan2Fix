// ============================================
// Social Auth Controller
// ============================================
// Handles Google, Microsoft, Apple login
// Flow:
//   1. Mobile app gets token from provider
//   2. Sends token to our server
//   3. Server verifies token with provider
//   4. Creates/finds user in MongoDB
//   5. Returns JWT token
// ============================================

const User = require('../models/User_v2');
const generateToken = require('../utils/generateToken');
const https = require('https');

// ────────────────────────────────────────
// Helper: Fetch URL (built-in, no axios needed)
// ────────────────────────────────────────
const fetchJSON = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid response from provider'));
        }
      });
    }).on('error', reject);
  });
};

// ────────────────────────────────────────
// POST /api/auth/google
// ────────────────────────────────────────
// Mobile sends: { access_token: "..." }
// Server verifies with Google and creates/finds user
// ────────────────────────────────────────
exports.googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token is required',
      });
    }

    // Verify token with Google
    const googleUser = await fetchJSON(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
    }

    console.log('Google user:', googleUser.email, googleUser.name);

    // Find or create user
    let user = await User.findOne({ email: googleUser.email.toLowerCase() });

    if (!user) {
      // Create new user from Google data
      // Generate a random password (user won't need it — they login via Google)
      const randomPassword = require('crypto').randomBytes(32).toString('hex');

      user = await User.create({
        email: googleUser.email.toLowerCase(),
        password: randomPassword,
        full_name: googleUser.name || '',
        photo_url: googleUser.picture || '',
        role: 'USER',
        auth_provider: 'google',
        google_id: googleUser.id,
      });

      console.log('Created new user from Google:', user.email);
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        token,
        user: user.toProfileJSON(),
        isNewUser: !user.phone, // Flag if profile needs completing
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Google login failed. Please try again.',
    });
  }
};

// ────────────────────────────────────────
// POST /api/auth/apple
// ────────────────────────────────────────
exports.appleLogin = async (req, res) => {
  try {
    const { email, full_name, identity_token } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const randomPassword = require('crypto').randomBytes(32).toString('hex');

      user = await User.create({
        email: email.toLowerCase(),
        password: randomPassword,
        full_name: full_name || '',
        role: 'USER',
        auth_provider: 'apple',
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Apple login successful',
      data: {
        token,
        user: user.toProfileJSON(),
        isNewUser: !user.phone,
      },
    });
  } catch (error) {
    console.error('Apple login error:', error);
    res.status(500).json({
      success: false,
      message: 'Apple login failed',
    });
  }
};