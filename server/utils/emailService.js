const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

// Send verification code
exports.sendVerificationCode = async (email, code, userName) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Scan2Fix Support'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification - Scan2Fix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7dd3fc 0%, #004e68 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Scan2Fix</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #333;">Email Verification</h2>
          <p style="color: #666; font-size: 16px;">Hi ${userName || 'there'},</p>
          <p style="color: #666; font-size: 16px;">Your verification code is:</p>
          <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #004e68; font-size: 36px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Send OTP for complaint closure
exports.sendComplaintOTP = async (email, otp, complaintNumber, userName, assetId) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Scan2Fix Support'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Complaint Closure OTP - ${complaintNumber} - Scan2Fix`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7dd3fc 0%, #004e68 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Scan2Fix</h1>
          <p style="color: #e0f4ff; font-size: 14px; margin: 5px 0 0 0;">Complaint Closure Verification</p>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #333;">Complaint Status Update</h2>
          <p style="color: #666; font-size: 16px;">Hi ${userName || 'there'},</p>
          <p style="color: #666; font-size: 16px;">
            Your complaint <strong>${complaintNumber}</strong> (Asset: <strong>${assetId}</strong>) is ready to be closed.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            To confirm and close this complaint, staff will verify the following OTP:
          </p>
          <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #004e68; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 12px;">This OTP will expire in <strong>5 minutes</strong>.</p>
          <div style="background: #e8f4ff; padding: 15px; border-left: 4px solid #004e68; margin-top: 20px; border-radius: 4px;">
            <p style="color: #004e68; font-size: 14px; margin: 0;">
              ℹ️ <strong>Note:</strong> You can also verify this OTP directly in the Scan2Fix mobile app if you have it installed.
            </p>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            If you didn't expect this email, please contact support.
          </p>
        </div>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">© 2025 Scan2Fix. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Complaint OTP email send error:', error.message);
    throw error;
  }
};

// Send password reset code
exports.sendPasswordReset = async (email, resetCode, userName) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Scan2Fix Support'}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset - Scan2Fix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7dd3fc 0%, #004e68 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Scan2Fix</h1>
        </div>
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px;">Hi ${userName || 'there'},</p>
          <p style="color: #666; font-size: 16px;">Your password reset code is:</p>
          <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #004e68; font-size: 36px; letter-spacing: 8px; margin: 0;">${resetCode}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in <strong>15 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Password reset email send error:', error.message);
    return false;
  }
};