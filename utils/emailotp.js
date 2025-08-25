// utils/emailOTPStore.js
const emailOtpStore = new Map();  // key: email, value: { otp, expiresAt }

export const setEmailOTP = (email, otp) => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  emailOtpStore.set(email, { otp, expiresAt });

  // Auto-delete after expiry
  setTimeout(() => {
    emailOtpStore.delete(email);
  }, 5 * 60 * 1000);
};

export const verifyEmailOTP = (email, otp) => {
  const record = emailOtpStore.get(email);
  if (!record) return { success: false, msg: "No OTP found or expired" };

  if (Date.now() > record.expiresAt) {
    emailOtpStore.delete(email);
    return { success: false, msg: "OTP expired" };
  }

  if (record.otp !== otp) {
    return { success: false, msg: "Invalid OTP" };
  }

  emailOtpStore.delete(email); // cleanup after success
  return { success: true };
};
