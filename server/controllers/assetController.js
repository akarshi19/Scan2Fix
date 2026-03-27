// ============================================
// Asset Controller
// ============================================
// Manages equipment (AC, Water Cooler, Desert Cooler)
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// AS1. supabase.from('assets').select('*').eq('id', assetId).single()
//      → Used in ScanQR.js when user scans a QR code
//
// YOUR APP FLOW:
// 1. User scans QR code → gets string like "AC-3F-017"
// 2. App calls this API with that string
// 3. API returns asset details (type, location)
// 4. App navigates to LodgeComplaint with asset info
// ============================================

const Asset = require('../models/Asset');

// ────────────────────────────────────────
// GET /api/assets/qr/:assetId
// ────────────────────────────────────────
// Lookup asset by QR code value
//
// Replaces (ScanQR.js):
//   const { data: asset, error } = await supabase
//     .from('assets')
//     .select('*')
//     .eq('id', assetId)
//     .single();
//
// The QR code contains the asset_id string (e.g., "AC-3F-017")
// NOT the MongoDB ObjectId
// ────────────────────────────────────────
exports.getAssetByQR = async (req, res) => {
  try {
    const { assetId } = req.params;

    const asset = await Asset.findOne({
      asset_id: assetId.toUpperCase(),
      is_active: true,
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `No machine found with ID: "${assetId}"`,
      });
    }

    // Return in same shape your mobile app expects
    res.status(200).json({
      success: true,
      data: {
        id: asset.asset_id,        // "AC-3F-017" — what QR contains
        _id: asset._id,            // MongoDB ObjectId — for complaint reference
        type: asset.type,           // "AC" | "WATER_COOLER" | "DESERT_COOLER"
        location: asset.location,   // "3rd Floor, Room 317"
        brand: asset.brand,
        model: asset.model,
        install_date: asset.install_date,
        is_active: asset.is_active,
      },
    });
  } catch (error) {
    console.error('Asset lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error looking up asset',
    });
  }
};

// ────────────────────────────────────────
// GET /api/assets
// ────────────────────────────────────────
// Get all assets (admin use)
// ────────────────────────────────────────
exports.getAllAssets = async (req, res) => {
  try {
    const { type, location, active } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type.toUpperCase();
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (active !== undefined) filter.is_active = active === 'true';

    const assets = await Asset.find(filter).sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching assets',
    });
  }
};

// ────────────────────────────────────────
// POST /api/assets
// ────────────────────────────────────────
// Create a new asset (admin only)
// Used when installing new equipment
// ────────────────────────────────────────
exports.createAsset = async (req, res) => {
  try {
    const { asset_id, type, location, brand, model, install_date } = req.body;

    // Validate required fields
    if (!asset_id || !type || !location) {
      return res.status(400).json({
        success: false,
        message: 'asset_id, type, and location are required',
      });
    }

    // Check if asset_id already exists
    const existing = await Asset.findOne({ asset_id: asset_id.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Asset with ID "${asset_id}" already exists`,
      });
    }

    const asset = await Asset.create({
      asset_id: asset_id.toUpperCase(),
      type: type.toUpperCase(),
      location,
      brand: brand || '',
      model: model || '',
      install_date: install_date || null,
    });

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset,
    });
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating asset',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/assets/:id
// ────────────────────────────────────────
// Update an asset (admin only)
// ────────────────────────────────────────
exports.updateAsset = async (req, res) => {
  try {
    const { location, brand, model, is_active, install_date } = req.body;

    const updateFields = {};
    if (location !== undefined) updateFields.location = location;
    if (brand !== undefined) updateFields.brand = brand;
    if (model !== undefined) updateFields.model = model;
    if (is_active !== undefined) updateFields.is_active = is_active;
    if (install_date !== undefined) updateFields.install_date = install_date;

    const asset = await Asset.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating asset',
    });
  }
};

// ────────────────────────────────────────
// GET /api/assets/types
// ────────────────────────────────────────
// Get all unique asset types
// ────────────────────────────────────────
exports.getAssetTypes = async (req, res) => {
  try {
    const types = await Asset.distinct('type');
    res.status(200).json({
      success: true,
      data: types.sort(),
    });
  } catch (error) {
    console.error('Get asset types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching asset types',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/assets/:id/toggle-active
// ────────────────────────────────────────
// Toggle asset active/inactive status
// ────────────────────────────────────────
exports.toggleAssetActive = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    asset.is_active = !asset.is_active;
    await asset.save();

    res.status(200).json({
      success: true,
      message: `Asset ${asset.asset_id} is now ${asset.is_active ? 'Active' : 'Inactive'}`,
      data: asset,
    });
  } catch (error) {
    console.error('Toggle asset active error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling asset status',
    });
  }
};