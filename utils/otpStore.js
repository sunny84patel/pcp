/**
 * OTP Store - Production-ready OTP storage using MongoDB
 * Replaces in-memory Map storage that doesn't work in serverless
 */
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'mobile'],
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5, // Max 5 attempts
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - auto-deletes when expired
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for faster lookups
otpSchema.index({ identifier: 1, type: 1 });

const OTPModel = mongoose.model('OTP', otpSchema);

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MINUTES = 1; // Min time between OTP requests

/**
 * Store OTP in database
 */
export const setOTP = async (identifier, otp, type = 'email') => {
  const normalizedIdentifier = identifier.toLowerCase().trim();
  
  // Check rate limiting - prevent OTP spam
  const recentOTP = await OTPModel.findOne({
    identifier: normalizedIdentifier,
    type,
    createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000) }
  });

  if (recentOTP) {
    return { 
      success: false, 
      msg: `Please wait ${RATE_LIMIT_MINUTES} minute(s) before requesting another OTP.`,
      rateLimited: true 
    };
  }

  // Delete any existing OTP for this identifier
  await OTPModel.deleteMany({ identifier: normalizedIdentifier, type });

  // Create new OTP record
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  await OTPModel.create({
    identifier: normalizedIdentifier,
    otp,
    type,
    expiresAt,
    attempts: 0,
  });

  return { success: true };
};

/**
 * Verify OTP from database
 */
export const verifyOTP = async (identifier, otp, type = 'email') => {
  const normalizedIdentifier = identifier.toLowerCase().trim();

  const record = await OTPModel.findOne({
    identifier: normalizedIdentifier,
    type,
  });

  if (!record) {
    return { success: false, msg: 'No OTP found. Please request a new one.' };
  }

  // Check expiry
  if (new Date() > record.expiresAt) {
    await OTPModel.deleteOne({ _id: record._id });
    return { success: false, msg: 'OTP expired. Please request a new one.' };
  }

  // Check attempts (brute-force protection)
  if (record.attempts >= MAX_ATTEMPTS) {
    await OTPModel.deleteOne({ _id: record._id });
    return { 
      success: false, 
      msg: 'Too many failed attempts. Please request a new OTP.',
      locked: true 
    };
  }

  // Verify OTP
  if (record.otp !== otp) {
    // Increment attempts
    await OTPModel.updateOne(
      { _id: record._id },
      { $inc: { attempts: 1 } }
    );
    
    const remainingAttempts = MAX_ATTEMPTS - record.attempts - 1;
    return { 
      success: false, 
      msg: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` 
    };
  }

  // Success - delete OTP
  await OTPModel.deleteOne({ _id: record._id });
  return { success: true };
};

/**
 * Clean up expired OTPs (optional - TTL index handles this)
 */
export const cleanupExpiredOTPs = async () => {
  const result = await OTPModel.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// For backward compatibility with existing emailotp.js
export const setEmailOTP = (email, otp) => setOTP(email, otp, 'email');
export const verifyEmailOTP = async (email, otp) => verifyOTP(email, otp, 'email');
