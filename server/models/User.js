// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

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
      select: false,
    },

    // ── Profile Fields ──
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
    // Designation — NO enum restriction, accepts any string
    designation: {
      type: String,
      trim: true,
      uppercase: true,
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
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);
// MIDDLEWARE — Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// METHODS
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

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
// INDEXES
userSchema.index({ role: 1 });
userSchema.index({ role: 1, is_on_leave: 1 });
userSchema.index({ designation: 1 });

module.exports = mongoose.model('User', userSchema);