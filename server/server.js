// ============================================
// Scan2Fix - Complaint Management System
// Express + MongoDB Backend Server
// ============================================

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Disable HTTPS enforcement for local development
app.use((req, res, next) => {
  // Remove all HTTPS-forcing headers
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Content-Security-Policy');
  // Allow HTTP requests
  res.setHeader('Content-Security-Policy-Report-Only', "upgrade-insecure-requests 'none'");
  next();
});

// Security headers - DISABLE for local HTTP development
app.use(helmet({
  hsts: false,
  frameguard: false,
  contentSecurityPolicy: false,
  referrerPolicy: false,
}));

// CORS — allow mobile app and web admin to connect
app.use(cors({
  origin: '*', // In production, restrict to your domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000000,                  // max 1000000 requests per window per IP
  message: { 
    success: false, 
    message: 'Too many requests, please try again after 15 minutes' 
  },
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // only 20 login/signup attempts per 15 min
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again later' 
  },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve public files (web form, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Scan2Fix API is running 🔧',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// Auth routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));

// Social auth routes
app.use('/api/auth', authLimiter, require('./routes/socialAuthRoutes'));

// Complaint routes
app.use('/api/complaints', require('./routes/complaintRoutes'));

// User management routes 
app.use('/api/users', require('./routes/userRoutes'));

// Report routes
app.use('/api/reports', require('./routes/reportRoutes'));

// Upload routes
app.use('/api/upload', require('./routes/uploadRoutes'));

// OAuth callback (for Google/Microsoft redirect)
app.use('/auth', require('./routes/oauthCallbackRoutes'));

// ============================================
// WEB FORM ROUTES
// ============================================

// Serve complaint form
// Access via: /complaint?assetId=ASSET-ID or /complaint?qrId=ASSET-ID
app.get('/complaint', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'complaint-form.html'));
});

// Alternative route for web app scanning
app.get('/scan2fix/complaint/:assetId', (req, res) => {
  res.redirect(`/complaint?assetId=${req.params.assetId}`);
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler — route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired, please login again',
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🔧 ════════════════════════════════════════');
  console.log(`🚀 Scan2Fix Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log('🔧 ════════════════════════════════════════');
  console.log('');
});

module.exports = app;