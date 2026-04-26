/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║         USER MODEL - PRODUCTION v2.0                          ║
 * ║   Cleaner role-based structure (ADMIN, STAFF, USER)           ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    // ╔─── AUTHENTICATION ───╗
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
      index: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
      // Don't return password in queries by default
    },

    // ╔─── PROFILE ───╗
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },

    photo_url: {
      type: String,
      default: null,
    },

    // ╔─── ROLE-BASED ACCESS ───╗
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'STAFF', 'USER'],
        message: 'Role must be ADMIN, STAFF, or USER',
      },
      default: 'USER',
      required: true,
      index: true,
    },

    // ╔─── STAFF-SPECIFIC FIELDS (only for role: STAFF) ───╗
    staff_details: {
      designation: {
        type: String,
        trim: true,
        default: null,
        // e.g., "Sr.Tech", "Tech-I", "Assist/Helper"
      },

      employee_id: {
        type: String,
        trim: true,
        default: null,
        // Unique index is defined separately below with sparse flag
      },

      department: {
        type: String,
        trim: true,
        default: null,
        // e.g., "Maintenance", "Operations"
      },

      skills: [
        {
          type: String,
          // e.g., ["AC", "WATER_COOLER", "ELECTRICAL"]
        },
      ],

      specialization: {
        type: String,
        default: null,
        // e.g., "HVAC", "PLUMBING", "ELECTRICAL"
      },
    },

    // ╔─── AVAILABILITY TRACKING ───╗
    availability: {
      is_available: {
        type: Boolean,
        default: true,
        // Can staff member be assigned new jobs?
      },

      is_on_leave: {
        type: Boolean,
        default: false,
      },

      leave_until: {
        type: Date,
        default: null,
      },

      leave_reason: {
        type: String,
        default: null,
      },

      workload_capacity: {
        type: Number,
        default: 10,
        // Max concurrent jobs this staff member can handle
      },

      current_workload: {
        type: Number,
        default: 0,
        // Current number of IN_PROGRESS jobs
      },
    },

    // ╔─── PERFORMANCE TRACKING ───╗
    stats: {
      total_complaints_resolved: {
        type: Number,
        default: 0,
      },

      total_complaints_assigned: {
        type: Number,
        default: 0,
      },

      average_resolution_time: {
        type: Number,
        default: null,
        // In milliseconds
      },

      customer_satisfaction_rating: {
        type: Number,
        default: null,
        min: 1,
        max: 5,
      },
    },

    // ╔─── ACCOUNT STATUS ───╗
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },

    is_verified: {
      type: Boolean,
      default: false,
      // Email verified?
    },

    verification_token: {
      type: String,
      select: false,
      default: null,
    },

    // ╔─── PUSH NOTIFICATIONS ───╗
    push_token: {
      type:    String,
      default: null,
      select:  false,
    },

    // ╔─── TIMESTAMPS ───╗
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },

    last_login: {
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

// ╔════════════════════════════════════════════════════════════════╗
// ║                INDEXES                                        ║
// ╚════════════════════════════════════════════════════════════════╝

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, is_active: 1 });
userSchema.index({ 'staff_details.employee_id': 1 }, { sparse: true });
userSchema.index({ is_active: 1 });

// ╔════════════════════════════════════════════════════════════════╗
// ║                PRE-SAVE: Hash Password                        ║
// ╚════════════════════════════════════════════════════════════════╝

userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ╔════════════════════════════════════════════════════════════════╗
// ║                METHODS                                        ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * Compare password for login
 */
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};


/**
 * Return safe user profile (no password, no internal fields)
 */
userSchema.methods.toProfileJSON = function () {
  return {
    id: this._id.toString(),
    _id: this._id,
    email: this.email,
    full_name: this.full_name,
    phone: this.phone,
    photo_url: this.photo_url,
    role: this.role,
    is_active: this.is_active,
    is_verified: this.is_verified,
    staff_details: this.staff_details,
    availability: this.availability,
    stats: this.stats,
    last_login: this.last_login,
    created_at: this.created_at,
  };
};


module.exports = mongoose.model('UserV2', userSchema);
