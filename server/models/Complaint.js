// ============================================
// Complaint Model
// ============================================
// The core of the system — tracks issues from OPEN to CLOSED
//
// LIFECYCLE:
// 1. User scans QR → lodges complaint → status: OPEN
// 2. Admin assigns staff → status: ASSIGNED
// 3. Staff starts work → status: IN_PROGRESS
// 4. Staff generates OTP → shares with user
// 5. User verifies OTP → status: CLOSED
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// C1.  SELECT *,assets(*),profiles!fkey(*) WHERE user_id=me
// C2.  SELECT *,assets(*),profiles!fkey(*) ORDER BY created_at
// C3.  SELECT status,created_at,asset_id,assets(location)
// C4.  SELECT *,assets(*) WHERE staff_id=me AND status=tab
// C5.  SELECT otp,otp_created_at WHERE id=complaintId
// C6.  SELECT *,assets(*),profiles!fkey(*) ORDER BY created_at
// C7.  INSERT {asset_id,user_id,description,photo_url,status}
// C8.  UPDATE {assigned_staff_id,status:'ASSIGNED'}
// C9.  UPDATE {status,closed_at}
// C10. UPDATE {otp,otp_created_at}
// C11. UPDATE {status:'CLOSED',closed_at,verified_at,otp:null}
// ============================================

const mongoose = require('mongoose');
const { COMPLAINT_STATUS } = require('../config/constants');

const complaintSchema = new mongoose.Schema(
  {
    // ── Auto-generated Complaint Number ──
    // e.g., "CMP-2025-00042"
    complaint_number: {
      type: String,
      unique: true,
    },

    // ── Who reported this? ──
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    // ── Which asset/machine? ──
    // We store BOTH the reference AND the asset_id string
    // The reference is for MongoDB joins (populate)
    // The asset_id string is for display (matches QR code)
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset reference is required'],
    },
    asset_id: {
      type: String,
      required: [true, 'Asset ID is required'],
      // This is the human-readable ID like "AC-3F-017"
      // Stored separately so we don't need to populate just for display
    },

    // ── Issue Details ──
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
      trim: true,
    },
    photo_url: {
      type: String,
      default: null,
    },

    // ── Status Tracking ──
    status: {
      type: String,
      enum: {
        values: Object.values(COMPLAINT_STATUS),
        message: 'Status must be OPEN, ASSIGNED, IN_PROGRESS, FINISHING, or CLOSED',
      },
      default: COMPLAINT_STATUS.OPEN,
    },

    // ── Assignment ──
    assigned_staff_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      // The admin who assigned it
    },

    // ── OTP Verification ──
    otp: {
      type: String,
      default: null,
    },
    otp_created_at: {
      type: Date,
      default: null,
    },

    // ── Closure ──
    closed_at: {
      type: Date,
      default: null,
    },
    verified_at: {
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

// ════════════════════════════════════════
// PRE-SAVE: Auto-generate complaint number
// ════════════════════════════════════════
complaintSchema.pre('save', async function (next) {
  if (!this.complaint_number) {
    try {
      const count = await this.constructor.countDocuments();
      const year = new Date().getFullYear();
      this.complaint_number = `CMP-${year}-${String(count + 1).padStart(5, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// ════════════════════════════════════════
// INDEXES for faster queries
// ════════════════════════════════════════

// User's complaints list (MyComplaints screen)
complaintSchema.index({ user_id: 1, created_at: -1 });

// Staff's job list (StaffDashboard screen)
complaintSchema.index({ assigned_staff_id: 1, status: 1, created_at: -1 });

// Admin's complaint list (AllComplaints screen)
complaintSchema.index({ status: 1, created_at: -1 });

// Reports: monthly grouping
complaintSchema.index({ created_at: -1 });

// Reports: by asset type
complaintSchema.index({ asset_id: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);