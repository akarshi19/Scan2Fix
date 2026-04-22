// User Management Controller
// Admin manages all users — create, edit, toggle leave, delete

const User = require('../models/User_v2');
const generateToken = require('../utils/generateToken');
const dns = require('dns').promises;

// Email verification helper
const verifyEmailDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    const addresses = await dns.resolveMx(domain);
    return addresses && addresses.length > 0;
  } catch (error) {
    return false;
  }
};

// GET /api/users
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
        { 'staff_details.employee_id': { $regex: search, $options: 'i' } },
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

// GET /api/users/staff
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

// GET /api/users/:id
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

// POST /api/users
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
      photo_url,
    } = req.body;

    // Validate required fields
    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required',
      });
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Verify email domain exists
    const dns = require('dns').promises;
    try {
      const domain = email.split('@')[1];
      const addresses = await dns.resolveMx(domain);
      if (!addresses || addresses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Email domain does not exist',
          requiresManualVerification: true,
        });
      }
    } catch (dnsError) {
      // Domain doesn't exist - require verification code
      return res.status(400).json({
        success: false,
        message: 'Unable to verify email domain. Verification code required.',
        requiresManualVerification: true,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Indian phone validation
    if (phone) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits',
        });
      }
      if (!/^[6-9]/.test(phoneDigits)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Indian phone number. Must start with 6, 7, 8, or 9',
        });
      }
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

    // Staff must have employee_id and photo
    if (userRole === 'STAFF') {
      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required for staff members',
        });
      }
      if (!photo_url) {
        return res.status(400).json({
          success: false,
          message: 'Photo is required for staff members',
        });
      }
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
      phone: phone.replace(/\D/g, ''),
      photo_url: photo_url || '',
      staff_details: userRole === 'STAFF' ? {
        designation: designation || 'HELPER',
        employee_id: employee_id.trim(),
      } : undefined,
      availability: {
        is_available: true,
        is_on_leave: false,
      },
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

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { full_name, phone, designation, employee_id, email } = req.body;

    const updateFields = {};
    if (full_name !== undefined) updateFields.full_name = full_name.trim();
    
    // Phone validation
    if (phone !== undefined) {
      const phoneDigits = phone.replace(/\D/g, '');
      if (phone && phoneDigits.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be exactly 10 digits',
        });
      }
      updateFields.phone = phoneDigits;
    }

    if (designation !== undefined) updateFields['staff_details.designation'] = designation;
    if (employee_id !== undefined) updateFields['staff_details.employee_id'] = employee_id;

    // Email update with verification
    if (email !== undefined) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address',
        });
      }

      const domainExists = await verifyEmailDomain(email);
      if (!domainExists) {
        return res.status(400).json({
          success: false,
          message: 'Email domain does not exist. Please check the email address.',
          requiresVerification: true,
        });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use by another account',
        });
      }

      updateFields.email = email.toLowerCase();
    }

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

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const MASTER_ADMIN_EMAIL = 'adminscan2fix@gmail.com';
    const MASTER_ADMIN_USERNAME = 'Scan2fix_Admin';

    // Check if target user is master admin
    if (user.email === MASTER_ADMIN_EMAIL || user.full_name === MASTER_ADMIN_USERNAME) {
      return res.status(403).json({
        success: false,
        message: 'Master admin account cannot be deleted',
      });
    }

    // Only master admin can delete other admins
    if (user.role === 'ADMIN') {
      if (req.user.email !== MASTER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: 'Only the master admin can delete admin accounts',
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `User ${user.full_name || user.email} has been deleted`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user',
    });
  }
};

// PUT /api/users/:id/toggle-leave
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
    const newStatus = !user.availability.is_on_leave;

    user.availability.is_on_leave = newStatus;
    user.availability.is_available = !newStatus;
    user.availability.leave_reason = newStatus ? leave_reason || 'Marked by Admin' : null;
    user.markModified('availability');

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

// PUT /api/users/self/toggle-leave
exports.toggleSelfLeave = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const newStatus = !user.availability.is_on_leave;

    user.availability.is_on_leave = newStatus;
    user.availability.is_available = !newStatus;
    user.availability.leave_reason = newStatus ? 'Self-marked' : null;
    user.markModified('availability');

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

// GET /api/users/self/leave-status
exports.getLeaveStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        is_on_leave: user.availability?.is_on_leave,
        leave_reason: user.availability?.leave_reason,
        leave_until: user.availability?.leave_until,
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

// GET /api/users/designations
exports.getDesignations = async (req, res) => {
  try {
    const { DESIGNATIONS } = require('../config/constants');
    const predefined = Object.values(DESIGNATIONS); // ['Sr.Tech', 'Tech-I', ...]

    const fromDB = await User.distinct('staff_details.designation', {
      'staff_details.designation': { $exists: true, $ne: null, $ne: '' },
    });

    // Merge: start with predefined, add DB values only if not already present (case-insensitive)
    const merged = [...predefined];
    const lowerSet = new Set(predefined.map(d => d.toLowerCase()));
    for (const d of fromDB.filter(Boolean)) {
      if (!lowerSet.has(d.toLowerCase())) {
        merged.push(d);
        lowerSet.add(d.toLowerCase());
      }
    }
    merged.sort();

    res.status(200).json({
      success: true,
      data: merged,
    });
  } catch (error) {
    console.error('Get designations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching designations',
    });
  }
};
