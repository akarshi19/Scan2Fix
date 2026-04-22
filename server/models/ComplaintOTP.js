/**
 * ╔════════════════════════════════════════════════════════════════╗
 * ║         COMPLAINT OTP MODEL - AUTH MANAGEMENT                 ║
 * ║   Separate collection for OTP lifecycle (not in complaints)   ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const complaintOtpSchema = new mongoose.Schema(
  {
    // ╔─── WHICH COMPLAINT ───╗
    complaint_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint ID is required'],
      index: true,
    },

    complaint_number: {
      type: String,
      required: true,
      // Denormalized for queries
    },

    // ╔─── OTP DATA ───╗
    otp_code: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6,
      // 6-digit code
    },

    // ╔─── WHO FOR ───╗
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // Email address OTP was sent to
    },

    phone: {
      type: String,
      default: null,
      // Phone for SMS-based OTP (if implemented)
    },

    // ╔─── VALIDITY ───╗
    created_at: {
      type: Date,
      default: Date.now,
    },

    expires_at: {
      type: Date,
      required: true,
      // TTL: 5 minutes from creation
      index: { expireAfterSeconds: 0 },
      // MongoDB will automatically delete this document after expires_at
    },

    // ╔─── VERIFICATION ───╗
    is_verified: {
      type: Boolean,
      default: false,
    },

    verified_at: {
      type: Date,
      default: null,
    },

    verification_attempts: {
      type: Number,
      default: 0,
      // Track brute-force attempts
    },

    last_verification_attempt: {
      type: Date,
      default: null,
    },

    // ╔─── STATUS ───╗
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'VERIFIED', 'EXPIRED', 'INVALID'],
        message: 'Status must be PENDING, VERIFIED, EXPIRED, or INVALID',
      },
      default: 'PENDING',
      index: true,
    },

    // ╔─── DELIVERY ───╗
    delivery_method: {
      type: String,
      enum: ['EMAIL', 'SMS', 'MANUAL'],
      default: 'EMAIL',
    },

    delivery_timestamp: {
      type: Date,
      default: null,
    },

    delivery_status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },

    // ╔─── SECURITY ───╗
    max_attempts: {
      type: Number,
      default: 3,
      // Max incorrect attempts before lockout
    },

    is_locked: {
      type: Boolean,
      default: false,
      // Locked after too many failed attempts
    },

    locked_until: {
      type: Date,
      default: null,
      // Unlock after 15 minutes
    },
  },
  {
    timestamps: {
      updatedAt: 'updated_at',
    },
  }
);

// ╔════════════════════════════════════════════════════════════════╗
// ║                      INDEXES                                  ║
// ╚════════════════════════════════════════════════════════════════╝

// Query: Get OTP for specific complaint
complaintOtpSchema.index({ 'complaint_id': 1, 'created_at': -1 });

// Query: Cleanup - Find expired but not deleted OTPs
complaintOtpSchema.index({ 'expires_at': -1 });

// Query: Find pending OTPs for email
complaintOtpSchema.index({ 'email': 1, 'status': 1 });

// Query: Find unverified OTPs (for staff)
complaintOtpSchema.index({ 'status': 1, 'created_at': -1 });

// TTL Index: Auto-delete after expiry (must be set correctly)
// expires_at field with expireAfterSeconds: 0 means MongoDB deletes 0 seconds after expires_at

// ╔════════════════════════════════════════════════════════════════╗
// ║                      HELPER METHODS                           ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * Check if OTP has expired
 */
complaintOtpSchema.methods.isExpired = function () {
  return new Date() > this.expires_at;
};

/**
 * Check if OTP is locked due to too many attempts
 */
complaintOtpSchema.methods.isLocked = function () {
  if (!this.is_locked) return false;
  if (new Date() > this.locked_until) {
    this.is_locked = false;
    return false;
  }
  return true;
};

/**
 * Verify OTP code
 */
complaintOtpSchema.methods.verifyCode = async function (inputCode) {
  // Check if expired
  if (this.isExpired()) {
    this.status = 'EXPIRED';
    await this.save();
    return { success: false, message: 'OTP has expired' };
  }

  // Check if locked
  if (this.isLocked()) {
    const minutesLeft = Math.ceil(
      (this.locked_until - new Date()) / (1000 * 60)
    );
    return {
      success: false,
      message: `Too many attempts. Try again in ${minutesLeft} minutes`,
    };
  }

  // Increment attempts
  this.verification_attempts += 1;
  this.last_verification_attempt = new Date();

  // Check if code matches
  if (inputCode !== this.otp_code) {
    // Wrong code
    if (this.verification_attempts >= this.max_attempts) {
      this.is_locked = true;
      this.locked_until = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
    }
    this.status = 'INVALID';
    await this.save();
    const remainingAttempts = this.max_attempts - this.verification_attempts;
    return {
      success: false,
      message: `Invalid OTP. ${remainingAttempts} attempts remaining`,
    };
  }

  // Correct code
  this.is_verified = true;
  this.verified_at = new Date();
  this.status = 'VERIFIED';
  await this.save();

  return { success: true, message: 'OTP verified successfully' };
};

// ╔════════════════════════════════════════════════════════════════╗
// ║                      STATIC METHODS                           ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * Generate and create OTP
 */
complaintOtpSchema.statics.generateOTP = async function (complaintId, complaintNumber, email) {
  // Generate random 6-digit code
  const otp_code = Math.floor(100000 + Math.random() * 900000).toString();

  const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const otpDoc = new this({
    complaint_id: complaintId,
    complaint_number: complaintNumber,
    otp_code,
    email,
    expires_at,
    delivery_method: 'EMAIL',
  });

  return await otpDoc.save();
};

/**
 * Verify OTP for complaint
 */
complaintOtpSchema.statics.verifyComplaintOTP = async function (complaintId, inputCode) {
  const otp = await this.findOne({
    complaint_id: complaintId,
    status: 'PENDING',
  });

  if (!otp) {
    return { success: false, message: 'No pending OTP found' };
  }

  return await otp.verifyCode(inputCode);
};

/**
 * Get OTP by complaint ID
 */
complaintOtpSchema.statics.getOtpByComplaint = async function (complaintId) {
  return await this.findOne({ complaint_id: complaintId }).sort({ created_at: -1 });
};

/**
 * Clean up expired OTPs manually (MongoDB should do this auto)
 */
complaintOtpSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expires_at: { $lt: new Date() },
    status: 'PENDING',
  });
  return result.deletedCount;
};

module.exports = mongoose.model('ComplaintOTP', complaintOtpSchema);
