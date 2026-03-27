const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send verification code
exports.sendVerificationCode = async (email, code, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
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