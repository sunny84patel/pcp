import User from '../models/User.js';
import OTP from '../models/OTP.js';
import twilio from "twilio";
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmailOTP } from '../utils/emailSender.js';
import { setEmailOTP, verifyEmailOTP } from '../utils/emailotp.js';
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import { parsePhoneNumberFromString } from "libphonenumber-js";

dotenv.config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

// 🔧 Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🔧 Normalize phone numbers (E.164)
const normalizePhoneNumber = (phone, countryCode) => {
  try {
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
 * 4. Fallback: contains cleaned digits.
 *
 * Note: cleaned is digits-only, so regex is safe.
 */
const findUserByPhoneInput = async (input) => {
  if (!input) return null;
  const trimmed = String(input).trim();
  const cleaned = trimmed.replace(/\D/g, '');
  if (!cleaned) return null;

  // 1) If it's already E.164-like (starts with +), try exact match first
  if (trimmed.startsWith('+')) {
    const exact = await User.findOne({ mobile: trimmed });
    if (exact) return exact;
  }

  // 2) Suffix match: stored E.164 ends with cleaned digits (best for local input)
  const suffixMatch = await User.findOne({
    mobile: { $regex: `${cleaned}$`, $options: 'i' }
  });
  if (suffixMatch) return suffixMatch;

  // 3) Exact match on cleaned (in case DB stored without +)
  const exactClean = await User.findOne({ mobile: cleaned });
  if (exactClean) return exactClean;

  // 4) Fallback: contains cleaned anywhere
  const containsMatch = await User.findOne({
    mobile: { $regex: cleaned, $options: 'i' }
  });
  return containsMatch;
};

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
  try {
    const { fullName, email, mobile, zipCode, role, countryCode } = req.body;

    if (!email || !mobile || !fullName || !countryCode) {
      return res.status(400).json({ msg: 'Full name, email, mobile, and country code are required.' });
    }

    const normalizedMobile = normalizePhoneNumber(mobile, countryCode);
    if (!normalizedMobile) {
      return res.status(400).json({ msg: 'Invalid phone number format. Please include a valid country code.' });
    }

    // Check for existing user
    const existing = await User.findOne({
      $or: [
        { email },
        { mobile: normalizedMobile }
      ]
    });

    if (existing) return res.status(400).json({ msg: 'User already exists.' });

    const newUser = new User({
      fullName,
      email,
      mobile: normalizedMobile,
      zipCode,
      isVerified: false,
      role: role || 'user',
    });

    await newUser.save();

    console.log('✅ New user created with mobile:', normalizedMobile);

    res.status(201).json({
      msg: `Account created as '${newUser.role}'. Please login to continue.`,
      user: newUser
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ msg: 'Server error during signup.', error: err.message });
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res) => {
  try {
    const { identifier, countryCode } = req.body;

    if (!identifier) return res.status(400).json({ msg: 'Email or mobile required.' });

    // Email flow unchanged
    if (validator.isEmail(identifier)) {
      const user = await User.findOne({ email: identifier });
      if (!user) return res.status(404).json({ msg: 'User not found.' });

      const otp = generateOTP();
      setEmailOTP(identifier, otp);
      await sendEmailOTP(identifier, otp);
      return res.status(200).json({ msg: 'OTP sent to registered email.' });
    }

    // Mobile flow: countryCode optional now.
    let user;
    let toSend; // E.164 number to send OTP to (Twilio expects E.164)

    if (countryCode) {
      // If frontend provided countryCode, normalize strictly
      const normalizedIdentifier = normalizePhoneNumber(identifier, countryCode);
      if (!normalizedIdentifier) {
        return res.status(400).json({ msg: 'Invalid phone number. Use international format with country code.' });
      }

      user = await User.findOne({ mobile: normalizedIdentifier });
      if (!user) return res.status(404).json({ msg: 'User not found.' });

      toSend = normalizedIdentifier;
    } else {
      // countryCode not provided — try to find user by local number heuristics
      user = await findUserByPhoneInput(identifier);
      if (!user) {
        // helpful debug: return searched digits so frontend can show hint
        const cleaned = String(identifier).replace(/\D/g, '');
        return res.status(404).json({
          msg: 'User not found. Please provide the phone number used during signup (country code optional).',
          searchedDigits: cleaned
        });
      }
      toSend = user.mobile; // stored E.164
    }

    console.log('📱 Sending SMS OTP to:', toSend);

    await client.verify.v2.services(verifySid).verifications.create({
      to: toSend,
      channel: 'sms',
    });

    return res.status(200).json({
      msg: 'OTP sent to registered mobile number.',
      normalizedIdentifier: toSend
    });
  } catch (error) {
    console.error('❌ OTP Sending Failed:', error);
    res.status(500).json({
      msg: 'Failed to send OTP. Please try again later.',
      error: error.message
    });
  }
};

// ---------------- VERIFY OTP ----------------
export const verifyOTP = async (req, res) => {
  try {
    const { otp, identifier } = req.body;

    console.log('🔍 Verifying OTP:', { otp, identifier });

    if (!otp) return res.status(400).json({ msg: "OTP is required." });
    if (!identifier) return res.status(400).json({ msg: "Identifier is required." });

    let user;

    // 📧 Email flow
    if (validator.isEmail(identifier)) {
      const result = verifyEmailOTP(identifier, otp);
      if (!result.success) {
        return res.status(400).json({ msg: result.msg });
      }
      user = await User.findOne({ email: identifier });
    } 
    // 📱 Phone flow
    else {
      const normalizedIdentifier = identifier; // frontend already sends E.164

      user = await User.findOne({ mobile: normalizedIdentifier });
      if (!user) {
        console.error('❌ User not found for mobile:', normalizedIdentifier);
        return res.status(404).json({
          msg: "User not found. Please ensure you're using the same mobile number used during signup."
        });
      }

      console.log('✅ User found for verification:', { mobile: user.mobile, email: user.email });

      try {
        const verificationCheck = await client.verify.v2
          .services(verifySid)
          .verificationChecks.create({
            to: normalizedIdentifier,
            code: otp,
          });

        console.log("🔍 Twilio verificationCheck:", verificationCheck);

        if (verificationCheck.status !== "approved") {
          return res.status(400).json({
            msg: "Invalid or expired OTP.",
            twilioStatus: verificationCheck.status
          });
        }
      } catch (twilioError) {
        console.error('❌ Twilio verification error:', twilioError);
        return res.status(400).json({
          msg: "Invalid or expired OTP.",
          error: twilioError.message
        });
      }
    }

    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    // ✅ Mark verified
    user.isVerified = true;
    await user.save();

    // ✅ Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log('✅ OTP verification successful for:', user.email || user.mobile);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (err) {
    console.error("❌ OTP verification error:", err);
    res.status(500).json({
      msg: "Server error verifying OTP.",
      error: err.message
    });
  }
};

// ---------------- GOOGLE LOGIN ----------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const googleLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ msg: "Firebase token is required" });
    }

    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    let user = await User.findOne({ email: decoded.email });

    if (!user) {
      user = new User({
        fullName: decoded.name || "Google User",
        email: decoded.email,
        mobile: "",
        zipCode: "",
        isVerified: true,
        role: "user",
        image: decoded.picture || "",
      });
      await user.save();
    } else {
      if (decoded.picture && user.image !== decoded.picture) {
        user.image = decoded.picture;
        await user.save();
      }
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      msg: "Google login successful",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (err) {
    console.error("❌ Google login failed:", err);
    res.status(401).json({ msg: "Invalid Google login", error: err.message });
  }
};
