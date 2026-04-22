const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaint_number: {
      type: String,
      unique: true,
      required: true,
    },

    // ── Reporter ──
    reported_by: {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2', default: null },
      name:    { type: String, required: true, trim: true },
      phone:   { type: String, required: true, trim: true },
      email:   { type: String, required: true, lowercase: true, trim: true },
    },

    // ── Location ──
    station:  { type: String, required: true, trim: true },
    area:     { type: String, default: null, trim: true },
    location: { type: String, required: true, trim: true },   // exact spot

    // ── Issue ──
    asset_type:  { type: String, required: true, trim: true },
    description: { type: String, required: true, minlength: 10, trim: true },
    photo_url:   { type: String, default: null },

    // ── Meta ──
    source: { type: String, enum: ['APP', 'WEB'], required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FINISHING', 'CLOSED'],
      default: 'OPEN',
    },

    // ── Staff assignment ──
    assigned_staff: {
      staff_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'UserV2', default: null },
      assigned_at:      { type: Date },
      assigned_by_admin:{ type: mongoose.Schema.Types.ObjectId, ref: 'UserV2' },
    },

    // ── Closure ──
    ack_photo_url: { type: String, default: null },
    closed_at:     { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Auto-generate complaint_number  e.g. "CMP-2026-00001"
complaintSchema.pre('validate', async function (next) {
  if (!this.complaint_number) {
    try {
      const year   = new Date().getFullYear();
      const prefix = `CMP-${year}-`;
      const latest = await this.constructor.findOne(
        { complaint_number: { $regex: `^${prefix}` } },
        { complaint_number: 1 },
        { sort: { complaint_number: -1 } }
      );
      const nextNum = latest
        ? parseInt(latest.complaint_number.split('-')[2], 10) + 1
        : 1;
      this.complaint_number = `${prefix}${String(nextNum).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema, 'complaints');
