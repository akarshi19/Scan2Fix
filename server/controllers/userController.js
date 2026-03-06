// ============================================
// User Management Controller
// ============================================
// Admin manages all users — create, edit, toggle leave
//
// SUPABASE CALLS THIS REPLACES:
// ─────────────────────────────
// P2.  SELECT * FROM profiles WHERE role='STAFF'             → getStaffList
// P4.  SELECT * FROM profiles ORDER BY created_at DESC       → getAllUsers
// P10. INSERT profiles {id,email,full_name,role,phone,...}   → createUser (AddUser.js)
// P11. UPDATE {is_on_leave,leave_reason} WHERE id            → toggleLeave (ManageUsers.js)
// P15. UPDATE {full_name,phone,designation,employee_id}      → updateUser (UserDetail.js)
// P16. UPDATE {is_on_leave} WHERE id                         → toggleLeave (UserDetail.js)
// P17. UPDATE {photo_url} WHERE id                           → (handled by upload route)
//
// ALSO REPLACES (AddUser.js):
//   supabase.auth.signUp({ email, password })  ← was creating auth user
//   supabase.from('profiles').insert({...})    ← was creating profile
//   Now ONE call creates both (User model has auth+profile)
// ============================================

const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// ────────────────────────────────────────
// GET /api/users
// ────────────────────────────────────────
// Get all users (ADMIN only)
//
// Replaces (ManageUsers.js):
//   const { data, error } = await supabase
//     .from('profiles')
//     .select('*')
//     .order('created_at', { ascending: false });
// ────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    // Build filter
    const filter = {};
    if (role && role !== 'ALL') {
      filter.role = role.toUpperCase();
    }

    // Search by name, email, or employee_id
    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ created_at: -1 });

    // Return profiles (without passwords)
    const profiles = users.map((u) => u.toProfileJSON());

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
    });
  }
};

// ────────────────────────────────────────
// GET /api/users/staff
// ────────────────────────────────────────
// Get only STAFF members (used in assignment dropdown)
//
// Replaces (ComplaintDetail.js):
//   const { data, error } = await supabase
//     .from('profiles')
//     .select('id, email, full_name, photo_url, is_on_leave, is_available')
//     .eq('role', 'STAFF');
// ────────────────────────────────────────
exports.getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: 'STAFF' }).sort({ full_name: 1 });

    const profiles = staff.map((s) => s.toProfileJSON());

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error('Get staff list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching staff',
    });
  }
};

// ────────────────────────────────────────
// GET /api/users/:id
// ────────────────────────────────────────
// Get single user details (ADMIN only)
//
// Replaces: Direct supabase query in UserDetail.js
// (UserDetail.js received user data via navigation params,
//  but this endpoint is useful for refreshing)
// ────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user',
    });
  }
};

// ────────────────────────────────────────
// POST /api/users
// ────────────────────────────────────────
// Create a new user (ADMIN only)
//
// Replaces (AddUser.js):
//   // Step 1: Create auth user
//   const { data: authData, error: authError } = await supabase.auth.signUp({
//     email, password
//   });
//   // Step 2: Create profile
//   const { error: profileError } = await supabase.from('profiles').insert({
//     id: authData.user.id,
//     email, full_name, role, phone, designation, employee_id,
//     is_available: true, is_on_leave: false,
//   });
//
// NOW: One single API call creates both auth + profile
// ────────────────────────────────────────
exports.createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      role,
      phone,
      designation,
      employee_id,
    } = req.body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Validate role
    const validRoles = ['USER', 'STAFF', 'ADMIN'];
    const userRole = (role || 'USER').toUpperCase();
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be USER, STAFF, or ADMIN',
      });
    }

    // Staff must have employee_id
    if (userRole === 'STAFF' && !employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for staff members',
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered',
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name.trim(),
      role: userRole,
      phone: phone.trim(),
      designation: userRole === 'STAFF' ? designation || 'JUNIOR' : null,
      employee_id: userRole === 'STAFF' ? employee_id.trim() : null,
      is_available: true,
      is_on_leave: false,
    });

    res.status(201).json({
      success: true,
      message: `${full_name} has been added as ${userRole}`,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    console.error('Create user error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating user',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/users/:id
// ────────────────────────────────────────
// Update user details (ADMIN only)
//
// Replaces (UserDetail.js):
//   const { error } = await supabase
//     .from('profiles')
//     .update({
//       full_name, phone, designation, employee_id,
//     })
//     .eq('id', user.id);
// ────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { full_name, phone, designation, employee_id } = req.body;

    const updateFields = {};
    if (full_name !== undefined) updateFields.full_name = full_name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (designation !== undefined) updateFields.designation = designation;
    if (employee_id !== undefined) updateFields.employee_id = employee_id;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User details updated',
      data: user.toProfileJSON(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/users/:id/toggle-leave
// ────────────────────────────────────────
// Toggle staff leave status
//
// Replaces (ManageUsers.js + UserDetail.js + StaffDashboard.js):
//   const { error } = await supabase
//     .from('profiles')
//     .update({
//       is_on_leave: newStatus,
//       leave_reason: newStatus ? 'Marked by Admin' : null
//     })
//     .eq('id', userId);
// ────────────────────────────────────────
exports.toggleLeave = async (req, res) => {
  try {
    const { leave_reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Toggle the status
    const newStatus = !user.is_on_leave;

    user.is_on_leave = newStatus;
    user.is_available = !newStatus;
    user.leave_reason = newStatus
      ? leave_reason || 'Marked by Admin'
      : null;

    await user.save();

    const statusText = newStatus ? 'On Leave' : 'Available';

    res.status(200).json({
      success: true,
      message: `${user.full_name || user.email} is now ${statusText}`,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    console.error('Toggle leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling leave status',
    });
  }
};

// ────────────────────────────────────────
// PUT /api/users/self/toggle-leave
// ────────────────────────────────────────
// Staff toggles their OWN leave status
//
// Replaces (StaffDashboard.js):
//   const { error } = await supabase
//     .from('profiles')
//     .update({ is_on_leave: true, leave_reason: 'Self-marked' })
//     .eq('id', user.id);
// ────────────────────────────────────────
exports.toggleSelfLeave = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const newStatus = !user.is_on_leave;

    user.is_on_leave = newStatus;
    user.is_available = !newStatus;
    user.leave_reason = newStatus ? 'Self-marked' : null;

    await user.save();

    const statusText = newStatus ? 'On Leave' : 'Available';

    res.status(200).json({
      success: true,
      message: `You are now marked as ${statusText}`,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    console.error('Self toggle leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling leave status',
    });
  }
};

// ────────────────────────────────────────
// GET /api/users/self/leave-status
// ────────────────────────────────────────
// Get own leave status (STAFF)
//
// Replaces (StaffDashboard.js):
//   const { data, error } = await supabase
//     .from('profiles')
//     .select('is_on_leave, leave_reason, leave_until')
//     .eq('id', user.id)
//     .single();
// ────────────────────────────────────────
exports.getLeaveStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        is_on_leave: user.is_on_leave,
        leave_reason: user.leave_reason,
        leave_until: user.leave_until,
      },
    });
  } catch (error) {
    console.error('Get leave status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};