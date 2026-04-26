// ============================================
// Complaint Controller
// ============================================

const Complaint = require('../models/Complaint_v2');
const User      = require('../models/User_v2');
const generateOTP = require('../utils/generateOTP');
const { notifyAdmins, sendPushNotification } = require('../utils/notificationService');

// ── helpers ──────────────────────────────────
const POPULATE_STAFF    = { path: 'assigned_staff.staff_id',  select: 'full_name email photo_url availability' };
const POPULATE_REPORTER = { path: 'reported_by.user_id',      select: 'full_name email' };

function transformComplaint(obj) {
  const staff    = obj.assigned_staff?.staff_id;   // populated
  const reporter = obj.reported_by?.user_id;        // populated

  const hasRealEmail = obj.reported_by?.email && !obj.reported_by.email.includes('@noreply.scan2fix');

  return {
    ...obj,
    id: obj._id,
    // flat contact fields (convenience for mobile)
    contact_name:  obj.reported_by?.name  || null,
    contact_email: hasRealEmail ? obj.reported_by?.email : null,
    contact_phone: obj.reported_by?.phone || null,
    // reporter object (for display)
    reporter: reporter
      ? { full_name: reporter.full_name, email: reporter.email }
      : { full_name: obj.reported_by?.name, email: obj.reported_by?.email },
    // assigned staff
    profiles: staff
      ? {
          full_name:   staff.full_name,
          email:       staff.email,
          photo_url:   staff.photo_url || null,
          is_on_leave: staff.availability?.is_on_leave || false,
        }
      : null,
    assigned_staff_id: staff ? staff._id : null,
    user_id: reporter ? reporter._id : null,
  };
}

// ─────────────────────────────────────────────
// POST /api/complaints   (APP — logged in user)
// ─────────────────────────────────────────────
exports.createComplaint = async (req, res) => {
  try {
    const { station, area, location, asset_type, description, photo_url,
            contact_name, contact_phone } = req.body;

    if (!station || !location || !asset_type || !description) {
      return res.status(400).json({ success: false, message: 'station, location, asset_type and description are required' });
    }
    if (description.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Description must be at least 10 characters' });
    }

    const user = req.user;
    const complaint = await Complaint.create({
      reported_by: {
        user_id: user._id,
        name:    contact_name || user.full_name,
        phone:   contact_phone || user.phone || 'N/A',
        email:   user.email,
      },
      station:     station.trim(),
      area:        area?.trim() || null,
      location:    location.trim(),
      asset_type:  asset_type.trim(),
      description: description.trim(),
      photo_url:   photo_url || null,
      source:      'APP',
      status:      'OPEN',
    });

    await complaint.populate([POPULATE_STAFF, POPULATE_REPORTER]);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: transformComplaint(complaint.toObject()),
    });

    notifyAdmins(
      'New Complaint',
      `${asset_type} issue at ${station} — ${location}`,
      { complaintId: complaint._id.toString() }
    ).catch(() => {});
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error creating complaint' });
  }
};

// ─────────────────────────────────────────────
// GET /api/complaints/mine   (USER)
// ─────────────────────────────────────────────
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ 'reported_by.user_id': req.user._id })
      .populate([POPULATE_STAFF, POPULATE_REPORTER])
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints.map(c => transformComplaint(c.toObject())),
    });
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// GET /api/complaints   (ADMIN)
// ─────────────────────────────────────────────
exports.getAllComplaints = async (req, res) => {
  try {
    const { status, asset_type, dateFrom, dateTo } = req.query;
    const filter = {};
    if (status)     filter.status = status.toUpperCase();
    if (asset_type) filter.asset_type = { $regex: asset_type, $options: 'i' };
    if (dateFrom || dateTo) {
      // Use $expr + $toDate to match the same approach as the report controller's aggregation,
      // ensuring type-safe comparison regardless of how created_at is stored in MongoDB.
      const dateConditions = [];
      if (dateFrom) dateConditions.push({ $gte: [{ $toDate: '$created_at' }, new Date(dateFrom)] });
      if (dateTo)   dateConditions.push({ $lte: [{ $toDate: '$created_at' }, new Date(dateTo)] });
      filter.$expr = dateConditions.length === 1 ? dateConditions[0] : { $and: dateConditions };
    }

    const complaints = await Complaint.find(filter)
      .populate([POPULATE_STAFF, POPULATE_REPORTER])
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints.map(c => transformComplaint(c.toObject())),
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// GET /api/complaints/staff-jobs   (STAFF)
// ─────────────────────────────────────────────
exports.getStaffJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { 'assigned_staff.staff_id': req.user._id };
    if (status) filter.status = status.toUpperCase();

    const jobs = await Complaint.find(filter)
      .populate([POPULATE_STAFF, POPULATE_REPORTER])
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs.map(c => transformComplaint(c.toObject())),
    });
  } catch (error) {
    console.error('Get staff jobs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// GET /api/complaints/:id
// ─────────────────────────────────────────────
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate([POPULATE_STAFF, POPULATE_REPORTER]);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.status(200).json({ success: true, data: transformComplaint(complaint.toObject()) });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/complaints/:id/assign   (ADMIN)
// ─────────────────────────────────────────────
exports.assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ success: false, message: 'staffId is required' });

    const staff = await User.findById(staffId);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found' });
    if (staff.role !== 'STAFF') return res.status(400).json({ success: false, message: 'Selected user is not a staff member' });
    if (staff.availability?.is_on_leave) {
      return res.status(400).json({ success: false, message: `${staff.full_name || staff.email} is currently on leave` });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    if (complaint.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Cannot assign staff to a closed complaint' });

    complaint.assigned_staff = { staff_id: staffId, assigned_at: new Date(), assigned_by_admin: req.user._id };
    complaint.status = 'ASSIGNED';
    await complaint.save();
    await complaint.populate([POPULATE_STAFF, POPULATE_REPORTER]);

    res.status(200).json({
      success: true,
      message: `Complaint assigned to ${staff.full_name || staff.email}`,
      data: transformComplaint(complaint.toObject()),
    });

    const staffWithToken = await User.findById(staffId).select('+push_token');
    if (staffWithToken?.push_token) {
      sendPushNotification(
        staffWithToken.push_token,
        'New Job Assigned',
        `${complaint.asset_type} at ${complaint.station} — ${complaint.location}`,
        { complaintId: complaint._id.toString() }
      ).catch(() => {});
    }
  } catch (error) {
    console.error('Assign staff error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/complaints/:id/status   (STAFF/ADMIN)
// ─────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status, resolution_notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const validStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FINISHING', 'RESOLVED', 'CLOSED'];
    const newStatus = status.toUpperCase();
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be: ${validStatuses.join(', ')}` });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = newStatus;
    if (newStatus === 'CLOSED') complaint.closed_at = new Date();
    if (resolution_notes) complaint.resolution_notes = resolution_notes;
    await complaint.save();

    res.status(200).json({ success: true, message: `Status updated to ${newStatus}`, data: complaint });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/complaints/:id/generate-otp   (USER — APP)
// ─────────────────────────────────────────────
exports.generateComplaintOTP = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const reporterUserId = complaint.reported_by?.user_id;
    if (!reporterUserId || reporterUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only generate OTP for your own complaints' });
    }
    if (complaint.status !== 'FINISHING') {
      return res.status(400).json({ success: false, message: 'OTP can only be generated once the staff has finished working' });
    }

    const otp = generateOTP();
    const ComplaintOTP = require('../models/ComplaintOTP');
    await ComplaintOTP.deleteMany({ complaint_id: complaint._id });
    await ComplaintOTP.create({
      complaint_id:      complaint._id,
      complaint_number:  complaint.complaint_number,
      otp_code:          otp,
      email:             complaint.reported_by.email,
      phone:             complaint.reported_by.phone,
      expires_at:        new Date(Date.now() + 5 * 60 * 1000),
    });

    res.status(200).json({
      success: true,
      message: 'OTP generated',
      data: { otp, expires_in: '5 minutes', complaint_id: complaint._id },
    });

    // Send email in background
    const emailService = require('../utils/emailService');
    emailService.sendComplaintOTP(
      complaint.reported_by.email, otp, complaint.complaint_number,
      complaint.reported_by.name, complaint.asset_type
    ).catch(err => console.error('OTP email error:', err));
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/complaints/:id/send-otp   (STAFF/ADMIN — WEB with email)
// ─────────────────────────────────────────────
exports.sendOTPByEmail = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const staffId = complaint.assigned_staff?.staff_id;
    if (!staffId || staffId.toString() !== req.user._id.toString()) {
      if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'You are not assigned to this complaint' });
    }

    const recipientEmail = complaint.reported_by?.email;
    if (!recipientEmail || recipientEmail.includes('@noreply.scan2fix')) {
      return res.status(400).json({ success: false, message: 'No real email for this complaint. Use acknowledgement photo instead.' });
    }

    const otp = generateOTP();

    // Save OTP record first, then send email
    const ComplaintOTP = require('../models/ComplaintOTP');
    await ComplaintOTP.deleteMany({ complaint_id: complaint._id });
    await ComplaintOTP.create({
      complaint_id:     complaint._id,
      complaint_number: complaint.complaint_number,
      otp_code:         otp,
      email:            recipientEmail,
      phone:            complaint.reported_by?.phone || 'N/A',
      expires_at:       new Date(Date.now() + 5 * 60 * 1000),
    });

    const emailService = require('../utils/emailService');
    await emailService.sendComplaintOTP(
      recipientEmail, otp, complaint.complaint_number,
      complaint.reported_by?.name, complaint.asset_type
    );

    res.status(200).json({
      success: true,
      message: `OTP sent to ${recipientEmail}`,
      data: { complaint_id: complaint._id, email_sent_to: recipientEmail, expires_in: '5 minutes' },
    });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to send OTP email' });
  }
};

// ─────────────────────────────────────────────
// POST /api/complaints/:id/verify-otp   (STAFF)
// ─────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || otp.length !== 6) return res.status(400).json({ success: false, message: 'Enter a valid 6-digit OTP' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const staffId = complaint.assigned_staff?.staff_id;
    if (!staffId || staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this complaint' });
    }

    const ComplaintOTP = require('../models/ComplaintOTP');
    const otpRecord = await ComplaintOTP.findOne({ complaint_id: complaint._id });
    if (!otpRecord)                           return res.status(400).json({ success: false, message: 'No OTP found. Ask the user to generate one.' });
    if (otpRecord.is_verified)                return res.status(400).json({ success: false, message: 'OTP already used.' });
    if (otpRecord.verification_attempts >= 3) return res.status(400).json({ success: false, message: 'Too many failed attempts.' });
    if (new Date() > otpRecord.expires_at)    return res.status(400).json({ success: false, message: 'OTP has expired. Ask user to generate a new one.' });
    if (otpRecord.otp_code !== otp) {
      otpRecord.verification_attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    otpRecord.is_verified = true;
    otpRecord.verified_at = new Date();
    await otpRecord.save();

    complaint.status    = 'CLOSED';
    complaint.closed_at = new Date();
    await complaint.save();

    res.status(200).json({ success: true, message: 'Complaint verified and closed.', data: complaint });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/complaints/:id/close-with-ack   (STAFF — no-email complaints)
// ─────────────────────────────────────────────
exports.closeWithAck = async (req, res) => {
  try {
    const { ack_photo_url } = req.body;
    if (!ack_photo_url) return res.status(400).json({ success: false, message: 'Acknowledgement photo URL is required' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const staffId = complaint.assigned_staff?.staff_id;
    if (!staffId || staffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this complaint' });
    }
    if (complaint.status !== 'FINISHING') {
      return res.status(400).json({ success: false, message: 'Complaint must be in FINISHING status' });
    }

    complaint.status        = 'CLOSED';
    complaint.closed_at     = new Date();
    complaint.ack_photo_url = ack_photo_url;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint closed with written acknowledgement.',
      data: { complaint_id: complaint._id, complaint_number: complaint.complaint_number },
    });
  } catch (error) {
    console.error('Close with ack error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/complaints/qr-scan/submit   (PUBLIC — WEB form)
// ─────────────────────────────────────────────
exports.createQRComplaint = async (req, res) => {
  try {
    const {
      station, area, location, asset_type, description, photo_url,
      contact_name, contact_phone, contact_email,
    } = req.body;

    if (!station || !location || !asset_type || !description) {
      return res.status(400).json({ success: false, message: 'station, location, asset_type and description are required' });
    }
    if (!contact_name || !contact_phone) {
      return res.status(400).json({ success: false, message: 'contact_name and contact_phone are required' });
    }
    if (description.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Description must be at least 10 characters' });
    }

    const emailToStore = (contact_email && contact_email.trim())
      ? contact_email.toLowerCase().trim()
      : 'noreply@noreply.scan2fix';

    const complaint = await Complaint.create({
      reported_by: {
        user_id: null,
        name:    contact_name.trim(),
        phone:   contact_phone.trim(),
        email:   emailToStore,
      },
      station:     station.trim(),
      area:        area?.trim() || null,
      location:    location.trim(),
      asset_type:  asset_type.trim(),
      description: description.trim(),
      photo_url:   photo_url || null,
      source:      'WEB',
      status:      'OPEN',
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        complaint_id:     complaint._id,
        complaint_number: complaint.complaint_number,
        station:          complaint.station,
      },
    });

    notifyAdmins(
      'New Complaint (Web)',
      `${asset_type} issue at ${station} — ${location}`,
      { complaintId: complaint._id.toString() }
    ).catch(() => {});
  } catch (error) {
    console.error('Create QR complaint error:', error);
    res.status(500).json({ success: false, message: 'Server error creating complaint' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/complaints/:id/description
// ─────────────────────────────────────────────
exports.updateDescription = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Description must be at least 10 characters' });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const reporterUserId = complaint.reported_by?.user_id;
    const isReporter = reporterUserId && reporterUserId.toString() === req.user._id.toString();
    if (!isReporter && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only the reporter or admin can edit the description' });
    }
    if (complaint.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Cannot edit a closed complaint' });

    complaint.description = description.trim();
    await complaint.save();
    res.status(200).json({ success: true, message: 'Description updated', data: complaint });
  } catch (error) {
    console.error('Update description error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// stubs for archive routes
exports.getArchivedComplaints    = (req, res) => res.status(200).json({ success: true, count: 0, data: [] });
exports.getMyArchivedComplaints  = (req, res) => res.status(200).json({ success: true, count: 0, data: [] });
exports.getArchivedStats         = (req, res) => res.status(200).json({ success: true, data: { total_active: 0, total_archived: 0 } });
