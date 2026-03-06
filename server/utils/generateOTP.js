// ============================================
// OTP Generator
// ============================================
// Generates a random 6-digit OTP for complaint verification
//
// REPLACES (from JobDetails.js):
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//
// Same logic, just moved to a reusable utility
// ============================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = generateOTP;