import User from '../models/User.js';
import twilio from "twilio";
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmailOTP } from '../utils/emailSender.js';
import { setEmailOTP, verifyEmailOTP } from '../utils/otpStore.js'; // Use MongoDB-based store
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import { parsePhoneNumberFromString } from "libphonenumber-js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'TWILIO_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
  }
}

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

const isProd = process.env.NODE_ENV === 'production';

// 🔧 Logging helper (only log sensitive data in dev)
const devLog = (...args) => {
  if (!isProd) console.log(...args);
};

// 🔧 Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🔧 Sanitize string input
const sanitizeInput = (str) => {
  if (!str || typeof str !== 'string') return '';
  return validator.escape(validator.trim(str));
};

// 🔧 Normalize phone numbers (E.164)
const normalizePhoneNumber = (phone, countryCode) => {
  try {
    if (!phone || typeof phone !== 'string') return null;
    const phoneNumber = parsePhoneNumberFromString(phone, countryCode);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number; // Always returns E.164 (+14155552671)
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Try to find a user when input may be a local number (no country code).
 * Strategy:
 * 1. If input starts with '+', try exact match.
 * 2. Match users whose stored mobile ends with the cleaned digits (suffix match).
 * 3. Exact match on cleaned digits.
 *
 * Note: cleaned is digits-only (enforced), so regex is safe.
 */
const findUserByPhoneInput = async (input) => {
  if (!input) return null;
  const trimmed = String(input).trim();
  // Strictly extract digits only - prevents regex injection
  const cleaned = trimmed.replace(/\D/g, '');
  if (!cleaned || cleaned.length < 6) return null; // Minimum phone length

  // 1) If it's already E.164-like (starts with +), try exact match first
  if (trimmed.startsWith('+')) {
    const exact = await User.findOne({ mobile: trimmed });
    if (exact) return exact;
  }

  // 2) Suffix match: stored E.164 ends with cleaned digits (best for local input)
  // Use RegExp constructor with escaped input for safety
  const suffixMatch = await User.findOne({
    mobile: { $regex: new RegExp(`${cleaned}$`), $options: 'i' }
  });
  if (suffixMatch) return suffixMatch;

  // 3) Exact match on cleaned (in case DB stored without +)
  const exactClean = await User.findOne({ mobile: cleaned });
  return exactClean;
};

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
  try {
    const { fullName, email, mobile, zipCode, role, countryCode } = req.body;

    // Validate required fields
    if (!email || !mobile || !fullName || !countryCode) {
      return res.status(400).json({ msg: 'Full name, email, mobile, and country code are required.' });
    }

    // Sanitize inputs
    const sanitizedFullName = sanitizeInput(fullName);
    const sanitizedZipCode = zipCode ? sanitizeInput(zipCode) : '';

    if (sanitizedFullName.length < 2 || sanitizedFullName.length > 100) {
      return res.status(400).json({ msg: 'Full name must be between 2 and 100 characters.' });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ msg: 'Invalid email format.' });
    }
    const normalizedEmail = validator.normalizeEmail(email);

    // Normalize phone number
    const normalizedMobile = normalizePhoneNumber(mobile, countryCode);
    if (!normalizedMobile) {
      return res.status(400).json({ msg: 'Invalid phone number format. Please include a valid country code.' });
    }

    // Validate role
    const validRoles = ['user', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Check for existing user
    const existing = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { mobile: normalizedMobile }
      ]
    });

    if (existing) {
      // Don't reveal which field exists (security)
      return res.status(400).json({ msg: 'An account with this email or mobile already exists.' });
    }

    const newUser = new User({
      fullName: sanitizedFullName,
      email: normalizedEmail,
      mobile: normalizedMobile,
      zipCode: sanitizedZipCode,
      isVerified: false,
      role: userRole,
    });

    await newUser.save();

    devLog('✅ New user created with mobile:', normalizedMobile);

    res.status(201).json({
      msg: `Account created successfully. Please login to continue.`,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
      }
    });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'An account with this email or mobile already exists.' });
    }
    
    res.status(500).json({ msg: 'Server error during signup. Please try again.' });
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res) => {
  try {
    const { identifier, countryCode } = req.body;

    if (!identifier) return res.status(400).json({ msg: 'Email or mobile required.' });

    const trimmedIdentifier = String(identifier).trim();

    // Email flow
    if (validator.isEmail(trimmedIdentifier)) {
      const normalizedEmail = validator.normalizeEmail(trimmedIdentifier);
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) return res.status(404).json({ msg: 'No account found with this email.' });

      const otp = generateOTP();
      
      // Use MongoDB-based OTP store (async now)
      const otpResult = await setEmailOTP(normalizedEmail, otp);
      if (!otpResult.success) {
        return res.status(429).json({ msg: otpResult.msg }); // Rate limited
      }
      
      await sendEmailOTP(normalizedEmail, otp);
      return res.status(200).json({ msg: 'Verification code sent to your email.' });
    }

    // Mobile flow: countryCode optional now.
    let user;
    let toSend; // E.164 number to send OTP to (Twilio expects E.164)

    if (countryCode) {
      // If frontend provided countryCode, normalize strictly
      const normalizedIdentifier = normalizePhoneNumber(trimmedIdentifier, countryCode);
      if (!normalizedIdentifier) {
        return res.status(400).json({ msg: 'Invalid phone number. Please check the number and country code.' });
      }

      user = await User.findOne({ mobile: normalizedIdentifier });
      if (!user) return res.status(404).json({ msg: 'No account found with this mobile number.' });

      toSend = normalizedIdentifier;
    } else {
      // countryCode not provided — try to find user by local number heuristics
      user = await findUserByPhoneInput(trimmedIdentifier);
      if (!user) {
        return res.status(404).json({
          msg: 'No account found. Please use the phone number from signup.',
        });
      }
      toSend = user.mobile; // stored E.164
    }

    devLog('📱 Sending SMS OTP to:', toSend);

    await client.verify.v2.services(verifySid).verifications.create({
      to: toSend,
      channel: 'sms',
    });

    return res.status(200).json({
      msg: 'Verification code sent to your mobile.',
      normalizedIdentifier: toSend
    });
  } catch (error) {
    console.error('❌ OTP Sending Failed:', error.message);
    
    // Handle Twilio-specific errors
    if (error.code === 60203) {
      return res.status(429).json({ msg: 'Too many requests. Please wait before trying again.' });
    }
    
    res.status(500).json({ msg: 'Failed to send verification code. Please try again.' });
  }
};

// ---------------- VERIFY OTP ----------------
export const verifyOTP = async (req, res) => {
  try {
    const { otp, identifier } = req.body;

    devLog('🔍 Verifying OTP for:', identifier);

    if (!otp) return res.status(400).json({ msg: "Verification code is required." });
    if (!identifier) return res.status(400).json({ msg: "Email or mobile is required." });
    
    // Validate OTP format (6 digits)
    const trimmedOtp = String(otp).trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      return res.status(400).json({ msg: "Invalid verification code format." });
    }

    let user;
    const trimmedIdentifier = String(identifier).trim();

    // 📧 Email flow
    if (validator.isEmail(trimmedIdentifier)) {
      const normalizedEmail = validator.normalizeEmail(trimmedIdentifier);
      
      // Use async MongoDB-based verification
      const result = await verifyEmailOTP(normalizedEmail, trimmedOtp);
      if (!result.success) {
        return res.status(400).json({ msg: result.msg });
      }
      user = await User.findOne({ email: normalizedEmail });
    } 
    // 📱 Phone flow
    else {
      const normalizedIdentifier = trimmedIdentifier; // frontend already sends E.164

      user = await User.findOne({ mobile: normalizedIdentifier });
      if (!user) {
        return res.status(404).json({
          msg: "No account found. Please ensure you're using the same mobile number from signup."
        });
      }

      devLog('✅ User found for verification:', user.email);

      try {
        const verificationCheck = await client.verify.v2
          .services(verifySid)
          .verificationChecks.create({
            to: normalizedIdentifier,
            code: trimmedOtp,
          });

        devLog("🔍 Twilio verificationCheck status:", verificationCheck.status);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({ msg: "Invalid or expired verification code." });
        }
      } catch (twilioError) {
        console.error('❌ Twilio verification error:', twilioError.message);
        
        // Handle specific Twilio errors
        if (twilioError.code === 20404) {
          return res.status(400).json({ msg: "Verification code expired. Please request a new one." });
        }
        
        return res.status(400).json({ msg: "Invalid or expired verification code." });
      }
    }

    if (!user) {
      return res.status(404).json({ msg: "Account not found." });
    }

    // ✅ Mark verified
    user.isVerified = true;
    await user.save();

    // ✅ Generate JWT
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured');
      return res.status(500).json({ msg: 'Server configuration error.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Extended to 7 days for better UX
    );

    devLog('✅ OTP verification successful for:', user.email || user.mobile);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isVerified: user.isVerified,
        image: user.image || '',
      }
    });

  } catch (err) {
    console.error("❌ OTP verification error:", err.message);
    res.status(500).json({ msg: "Server error. Please try again." });
  }
};

// ---------------- GOOGLE LOGIN ----------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate Firebase config
  if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
    console.error('❌ Firebase configuration is incomplete. Google login will not work.');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  }
}

export const googleLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ msg: "Firebase token is required." });
    }

    // Verify Firebase is initialized
    if (!admin.apps.length) {
      return res.status(500).json({ msg: "Google login is not configured." });
    }

    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    if (!decoded.email) {
      return res.status(400).json({ msg: "Email not provided by Google account." });
    }

    const normalizedEmail = validator.normalizeEmail(decoded.email);
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user from Google
      user = new User({
        fullName: sanitizeInput(decoded.name || "Google User"),
        email: normalizedEmail,
        mobile: null, // Use null instead of empty string (sparse index)
        zipCode: "",
        isVerified: true,
        role: "user",
        image: decoded.picture || "",
      });
      await user.save();
      devLog('✅ New user created via Google:', normalizedEmail);
    } else {
      // Update image if changed
      if (decoded.picture && user.image !== decoded.picture) {
        user.image = decoded.picture;
        await user.save();
      }
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured');
      return res.status(500).json({ msg: 'Server configuration error.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      msg: "Login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image: user.image,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("❌ Google login failed:", err.message);
    
    // Handle specific Firebase errors
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ msg: "Session expired. Please login again." });
    }
    if (err.code === 'auth/argument-error') {
      return res.status(401).json({ msg: "Invalid authentication token." });
    }
    
    res.status(401).json({ msg: "Google login failed. Please try again." });
  }
};
