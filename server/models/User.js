// ============================================
// User Model
// ============================================
// Replaces Supabase's auth.users + profiles table
// Combines authentication AND profile into one document
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// P1.  SELECT role,full_name,email FROM profiles WHERE id=userId
// P2.  SELECT * FROM profiles WHERE role='STAFF'
// P3.  SELECT full_name,email,photo_url FROM profiles WHERE id=staffId
// P4.  SELECT * FROM profiles ORDER BY created_at DESC
// P5.  SELECT photo_url,full_name FROM profiles WHERE id=userId
// P6.  SELECT * FROM profiles WHERE id=userId
// P7.  SELECT is_on_leave FROM profiles WHERE id=userId
// P8.  INSERT INTO profiles {id,email,full_name,role}
// P9.  INSERT INTO profiles {id,email,role}
// P10. INSERT INTO profiles {id,email,full_name,role,phone,...}
// P11-P17. UPDATE profiles SET ... WHERE id=userId
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, DESIGNATIONS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    // ── Authentication Fields ──
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },

    // ── Profile Fields ──
    // (These were in the "profiles" table in Supabase)
    full_name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    photo_url: {
      type: String,
      default: '',
    },

    // ── Role ──
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Role must be ADMIN, STAFF, or USER',
      },
      default: ROLES.USER,
    },

    // ── Staff-Specific Fields ──
    // Only populated when role === 'STAFF'
    designation: {
      type: String,
      enum: {
        values: [...Object.values(DESIGNATIONS), null, ''],
        message: 'Designation must be JUNIOR or SENIOR',
      },
      default: null,
    },
    employee_id: {
      type: String,
      trim: true,
      default: null,
    },
    is_on_leave: {
      type: Boolean,
      default: false,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    leave_reason: {
      type: String,
      default: null,
    },
    leave_until: {
      type: Date,
      default: null,
    },
    auth_provider: {
      type: String,
      enum: ['local', 'google', 'microsoft', 'apple'],
      default: 'local',
    },
    google_id: {
      type: String,
      default: null,
    },
     reset_code: {
      type: String,
      default: null,
    },
    reset_code_expires: {
      type: Date,
      default: null,
    },
  },
  {
    // ── Schema Options ──
    timestamps: {
      createdAt: 'created_at', // Match Supabase column names
      updatedAt: 'updated_at', // so mobile app doesn't break
    },
  }
);

// ════════════════════════════════════════
// MIDDLEWARE — Hash password before saving
// ════════════════════════════════════════
userSchema.pre('save', async function (next) {
  // Only hash if password was modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ════════════════════════════════════════
// METHODS
// ════════════════════════════════════════

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Return user data without sensitive fields
// This is what gets sent to the mobile app
userSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    email: this.email,
    full_name: this.full_name,
    phone: this.phone,
    photo_url: this.photo_url,
    role: this.role,
    designation: this.designation,
    employee_id: this.employee_id,
    is_on_leave: this.is_on_leave,
    is_available: this.is_available,
    leave_reason: this.leave_reason,
    leave_until: this.leave_until,
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

// ════════════════════════════════════════
// INDEXES for faster queries
// ════════════════════════════════════════
userSchema.index({ role: 1 }); // Fast lookup: "get all STAFF"
//userSchema.index({ email: 1 }); // Fast lookup: login by email
userSchema.index({ role: 1, is_on_leave: 1 }); // Fast lookup: available staff

module.exports = mongoose.model('User', userSchema);//