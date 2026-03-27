// ============================================
// Complaint Controller
// ============================================
// The CORE of the system — handles the full complaint lifecycle
//
// LIFECYCLE:
//   OPEN → ASSIGNED → IN_PROGRESS → CLOSED
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// C1.  SELECT *,assets(*),profiles!fkey(*) WHERE user_id=me      → getMyComplaints
// C2.  SELECT *,assets(*),profiles!fkey(*) ORDER BY created_at   → getAllComplaints
// C3.  SELECT status,created_at,asset_id,assets(location)        → getAllComplaints (admin stats)
// C4.  SELECT *,assets(*) WHERE staff_id=me AND status=tab       → getStaffJobs
// C5.  SELECT otp,otp_created_at WHERE id=complaintId            → verifyOTP
// C7.  INSERT {asset_id,user_id,description,photo_url,status}    → createComplaint
// C8.  UPDATE {assigned_staff_id,status:'ASSIGNED'}              → assignStaff
// C9.  UPDATE {status,closed_at}                                 → updateStatus
// C10. UPDATE {otp,otp_created_at}                               → generateOTP
// C11. UPDATE {status:'CLOSED',closed_at,verified_at,otp:null}   → verifyOTP
// ============================================

const Complaint = require('../models/Complaint');
const Asset = require('../models/Asset');
const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');

// ────────────────────────────────────────
// POST /api/complaints
// ────────────────────────────────────────
// Create a new complaint (USER role)
// ────────────────────────────────────────
exports.createComplaint = async (req, res) => {
  try {
    const { asset_id, description, photo_url } = req.body;

    // Validate
    if (!asset_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'asset_id and description are required',
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters',
      });
    }

    // Find the asset by its human-readable ID (from QR code)
    const asset = await Asset.findOne({ asset_id: asset_id.toUpperCase() });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: `Asset "${asset_id}" not found`,
      });
    }

    // Create complaint
    const complaint = await Complaint.create({
      user_id: req.user._id,
      asset: asset._id,             // MongoDB ObjectId reference
      asset_id: asset.asset_id,     // Human-readable string for display
      description: description.trim(),
      photo_url: photo_url || null,
      status: 'OPEN',
    });

    // Populate asset info for response
    await complaint.populate('asset', 'type location');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating complaint',
    });
  }
};

// ────────────────────────────────────────
// GET /api/complaints/mine
// ────────────────────────────────────────
// Get complaints submitted by current user
//
// Replaces (MyComplaints.js):
//   const { data, error } = await supabase
//     .from('complaints')
//     .select(`*, assets(location, type),
//       profiles!complaints_assigned_staff_id_fkey(full_name, email, photo_url)`)
//     .eq('user_id', user.id)
//     .order('created_at', { ascending: false });
// ────────────────────────────────────────
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user_id: req.user._id })
      .populate('asset', 'type location brand model install_date')  // ← Added brand, model, install_date
      .populate('assigned_staff_id', 'full_name email photo_url is_on_leave')
      .populate('user_id', 'full_name email')  // ← ADD THIS: populate reporter
      .sort({ created_at: -1 });

    const transformed = complaints.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        id: obj._id,
        assets: obj.asset
          ? {
              location: obj.asset.location,
              type: obj.asset.type,
              brand: obj.asset.brand,        // ← Added
              model: obj.asset.model,        // ← Added
              install_date: obj.asset.install_date,  // ← Added
            }
          : null,
        profiles: obj.assigned_staff_id
          ? {
              full_name: obj.assigned_staff_id.full_name,
              email: obj.assigned_staff_id.email,
              photo_url: obj.assigned_staff_id.photo_url,
              is_on_leave: obj.assigned_staff_id.is_on_leave,
            }
          : null,
        reporter: obj.user_id              // ← ADD THIS
          ? {
              full_name: obj.user_id.full_name,
              email: obj.user_id.email,
            }
          : null,
        assigned_staff_id: obj.assigned_staff_id
          ? obj.assigned_staff_id._id
          : null,
        user_id: obj.user_id ? obj.user_id._id : null,
      };
    });

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed,
    });
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching complaints' });
  }
};

// ────────────────────────────────────────
// GET /api/complaints
// ────────────────────────────────────────
// Get ALL complaints (ADMIN only)
//
// Replaces (AllComplaints.js & AdminDashboard.js):
//   const { data, error } = await supabase
//     .from('complaints')
//     .select(`*, assets(location, type),
//       profiles!complaints_assigned_staff_id_fkey(full_name, email, photo_url)`)
//     .order('created_at', { ascending: false });
// ────────────────────────────────────────
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, asset_type } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (asset_type) filter.asset_id = { $regex: asset_type, $options: 'i' };

    const complaints = await Complaint.find(filter)
      .populate('asset', 'type location brand model install_date')
      .populate('assigned_staff_id', 'full_name email photo_url is_on_leave')
      .populate('user_id', 'full_name email')
      .sort({ created_at: -1 });

    // Transform to match Supabase response shape
    const transformed = complaints.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        id: obj._id,
        assets: obj.asset
          ? { location: obj.asset.location, type: obj.asset.type }
          : null,
        profiles: obj.assigned_staff_id
          ? {
              full_name: obj.assigned_staff_id.full_name,
              email: obj.assigned_staff_id.email,
              photo_url: obj.assigned_staff_id.photo_url,
              is_on_leave: obj.assigned_staff_id.is_on_leave, 
            }
          : null,
        reporter: obj.user_id
          ? {
              full_name: obj.user_id.full_name,
              email: obj.user_id.email,
            }
          : null,
        assigned_staff_id: obj.assigned_staff_id
          ? obj.assigned_staff_id._id
          : null,
        user_id: obj.user_id ? obj.user_id._id : null,
      };
    });

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed,
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching complaints',
    });
  }
};

// ────────────────────────────────────────
// GET /api/complaints/staff-jobs
// ────────────────────────────────────────
// Get complaints assigned to current staff member
//
// Replaces (StaffDashboard.js):
//   const { data, error } = await supabase
//     .from('complaints')
//     .select('*, assets(location, type)')
//     .eq('assigned_staff_id', user.id)
//     .eq('status', activeTab)
//     .order('created_at', { ascending: false });
// ────────────────────────────────────────
exports.getStaffJobs = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { assigned_staff_id: req.user._id };
    if (status) filter.status = status.toUpperCase();

    const jobs = await Complaint.find(filter)
      .populate('asset', 'type location brand model install_date')
      .populate('user_id', 'full_name email')           // ← ADD THIS
      .populate('assigned_staff_id', 'full_name email')  // ← ADD THIS
      .sort({ created_at: -1 });

    // Transform
    const transformed = jobs.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        id: obj._id,
        assets: obj.asset
          ? {
              location: obj.asset.location,
              type: obj.asset.type,
              brand: obj.asset.brand,
              model: obj.asset.model,
              install_date: obj.asset.install_date,
            }
          : null,
        reporter: obj.user_id
          ? {
              full_name: obj.user_id.full_name,
              email: obj.user_id.email,
            }
          : null,
        profiles: obj.assigned_staff_id
          ? {
              full_name: obj.assigned_staff_id.full_name,
              email: obj.assigned_staff_id.email,
            }
          : null,
        user_id: obj.user_id ? obj.user_id._id : null,
        assigned_staff_id: obj.assigned_staff_id
          ? obj.assigned_staff_id._id
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: transformed.length,
      data: transformed,
    });
  } catch (error) {
    console.error('Get staff jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching jobs',
    });
  }
};

// ────────────────────────────────────────
// GET /api/complaints/:id
// ────────────────────────────────────────
// Get single complaint detail
// ────────────────────────────────────────
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('asset', 'type location brand model install_date')
      .populate('assigned_staff_id', 'full_name email photo_url is_on_leave')
      .populate('user_id', 'full_name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    const obj = complaint.toObject();
    const transformed = {
      ...obj,
      id: obj._id,
      assets: obj.asset
        ? {
          location: obj.asset.location,
          type: obj.asset.type,
          brand: obj.asset.brand,
          model: obj.asset.model,
          install_date: obj.asset.install_date,
        }
        : null,
      profiles: obj.assigned_staff_id
        ? {
            full_name: obj.assigned_staff_id.full_name,
            email: obj.assigned_staff_id.email,
            photo_url: obj.assigned_staff_id.photo_url,
            is_on_leave: obj.assigned_staff_id.is_on_leave, 
          }
        : null,
      reporter: obj.user_id
        ? { full_name: obj.user_id.full_name, email: obj.user_id.email }
        : null,
      assigned_staff_id: obj.assigned_staff_id
        ? obj.assigned_staff_id._id
        : null,
      user_id: obj.user_id ? obj.user_id._id : null,
    };

    res.status(200).json({
      success: true,
      data: transformed,
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching complaint',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/complaints/:id/assign
// ────────────────────────────────────────
// Assign staff to a complaint (ADMIN only)
//
// Replaces (ComplaintDetail.js):
//   const { error } = await supabase
//     .from('complaints')
//     .update({ assigned_staff_id: selectedStaff, status: 'ASSIGNED' })
//     .eq('id', complaint.id);
// ────────────────────────────────────────
exports.assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide staffId',
      });
    }

    // Verify staff exists and is actually a STAFF member
    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    if (staff.role !== 'STAFF') {
      return res.status(400).json({
        success: false,
        message: 'Selected user is not a staff member',
      });
    }

    // Check if staff is on leave
    if (staff.is_on_leave) {
      return res.status(400).json({
        success: false,
        message: `${staff.full_name || staff.email} is currently on leave and cannot be assigned new tasks`,
      });
    }

    // Find and update complaint
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (complaint.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign staff to a closed complaint',
      });
    }

    // Update complaint
    complaint.assigned_staff_id = staffId;
    complaint.assigned_by = req.user._id;
    complaint.assigned_at = new Date();
    complaint.status = 'ASSIGNED';
    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint assigned to ${staff.full_name || staff.email}`,
      data: complaint,
    });
  } catch (error) {
    console.error('Assign staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error assigning staff',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/complaints/:id/status
// ────────────────────────────────────────
// Update complaint status (STAFF role)
//
// Replaces (JobDetails.js):
//   const { error } = await supabase
//     .from('complaints')
//     .update({ status: newStatus, closed_at: ... })
//     .eq('id', job.id);
// ────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status',
      });
    }

    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be: ${validStatuses.join(', ')}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Update status
    complaint.status = status.toUpperCase();

    // Set closed_at if closing
    if (status.toUpperCase() === 'CLOSED') {
      complaint.closed_at = new Date();
    }

    // Clear closed_at if reopening
    if (status.toUpperCase() !== 'CLOSED') {
      complaint.closed_at = null;
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Status updated to ${status.toUpperCase()}`,
      data: complaint,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating status',
    });
  }
};

// POST /api/complaints/:id/generate-otp
exports.generateComplaintOTP = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Verify this is the user who created the complaint
    if (complaint.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate OTP for your own complaints',
      });
    }

    // Only allow OTP generation if complaint is FINISHING
    if (complaint.status !== 'FINISHING') {
      return res.status(400).json({
        success: false,
        message: 'OTP can only be generated when the work is finished by staff',
      });
    }

    // Generate OTP
    const otp = generateOTP();

    complaint.otp = otp;
    complaint.otp_created_at = new Date();
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      data: {
        otp,
        expires_in: '5 minutes',
        complaint_id: complaint._id,
        asset_id: complaint.asset_id,
      },
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating OTP',
    });
  }
};

// Update the updateStatus function to allow FINISHING status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status',
      });
    }

    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FINISHING', 'CLOSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be: ${validStatuses.join(', ')}`,
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Validate status transitions
    if (status.toUpperCase() === 'FINISHING') {
      if (complaint.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          success: false,
          message: 'Can only mark as FINISHING when work is IN_PROGRESS',
        });
      }
    }

    // Update status
    complaint.status = status.toUpperCase();

    // Set closed_at if closing
    if (status.toUpperCase() === 'CLOSED') {
      complaint.closed_at = new Date();
    }

    // Clear closed_at if reopening
    if (status.toUpperCase() !== 'CLOSED') {
      complaint.closed_at = null;
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Status updated to ${status.toUpperCase()}`,
      data: complaint,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating status',
    });
  }
};

// POST /api/complaints/:id/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit OTP',
      });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('user_id', 'full_name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Verify this staff member is assigned to this complaint
    if (
      !complaint.assigned_staff_id ||
      complaint.assigned_staff_id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this complaint',
      });
    }

    // Check if OTP exists
    if (!complaint.otp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. User needs to generate one.',
      });
    }

    // Check if OTP expired (5 minutes = 300 seconds)
    const otpAge =
      (Date.now() - new Date(complaint.otp_created_at).getTime()) / 1000;
    if (otpAge > 300) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Ask user to generate a new one.',
      });
    }

    // Verify OTP
    if (complaint.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    // OTP is valid — close the complaint
    complaint.status = 'CLOSED';
    complaint.closed_at = new Date();
    complaint.verified_at = new Date();
    complaint.otp = null; // Clear OTP after use
    complaint.otp_created_at = null;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint verified and closed successfully. User ${complaint.user_id.full_name || complaint.user_id.email} confirmed completion.`,
      data: complaint,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying OTP',
    });
  }
};

// PUT /api/complaints/:id/description
exports.updateDescription = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters',
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Only reporter or admin can edit
    const isReporter = complaint.user_id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isReporter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the reporter or admin can edit the description',
      });
    }

    if (complaint.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a closed complaint',
      });
    }

    complaint.description = description.trim();
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Description updated successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('Update description error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating description',
    });
  }
};