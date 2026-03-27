// ============================================
// Asset Routes
// ============================================
// GET    /api/assets           → Get all assets (admin)
// GET    /api/assets/qr/:id    → Lookup by QR code (user)
// POST   /api/assets           → Create asset (admin)
// PUT    /api/assets/:id       → Update asset (admin)
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getAllAssets,
  getAssetByQR,
  createAsset,
  updateAsset,
  getAssetTypes,
  toggleAssetActive,
} = require('../controllers/assetController');

// QR lookup — any authenticated user can scan
router.get('/qr/:assetId', protect, getAssetByQR);

// Asset types — admin
router.get('/types', protect, authorize('ADMIN'), getAssetTypes);

// Admin routes
router.get('/', protect, authorize('ADMIN'), getAllAssets);
router.post('/', protect, authorize('ADMIN'), createAsset);
router.put('/:id', protect, authorize('ADMIN'), updateAsset);
router.put('/:id/toggle-active', protect, authorize('ADMIN'), toggleAssetActive);

module.exports = router;