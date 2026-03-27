// ============================================
// Asset Model
// ============================================
// Represents physical equipment: AC, Water Cooler, Desert Cooler, etc.
// Each asset has a QR code sticker on it
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// AS1. SELECT * FROM assets WHERE id=assetId
//
// QR CODE FORMAT:
// The QR code on each machine contains the asset's `asset_id`
// e.g., "AC-3F-017" or "WC-2F-005"
// When scanned, the app calls GET /api/assets/qr/AC-3F-017
//
// CUSTOM TYPES:
// Admin can now add custom equipment types (e.g., FAN, PROJECTOR, UPS)
// Type field no longer restricted to enum — accepts any uppercase string
// ============================================

const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    // ── Asset Identifier ──
    // This is what's encoded in the QR code
    // Also what users see: "AC-3F-017"
    asset_id: {
      type: String,
      required: [true, 'Asset ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    // ── Type of Equipment ──
    // No longer restricted to enum — admin can add custom types
    // Examples: AC, WATER_COOLER, DESERT_COOLER, FAN, PROJECTOR, UPS
    type: {
      type: String,
      required: [true, 'Asset type is required'],
      uppercase: true,
      trim: true,
    },

    // ── Physical Location ──
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      // e.g., "3rd Floor, Room 317"
    },

    // ── Optional Metadata ──
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    model: {
      type: String,
      trim: true,
      default: '',
    },
    install_date: {
      type: Date,
      default: null,
    },

    // ── Status ──
    is_active: {
      type: Boolean,
      default: true,
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
// INDEXES
// ════════════════════════════════════════
assetSchema.index({ type: 1 });     // Filter by equipment type
assetSchema.index({ location: 1 }); // Filter by location
assetSchema.index({ is_active: 1 }); // Filter active/inactive

module.exports = mongoose.model('Asset', assetSchema);