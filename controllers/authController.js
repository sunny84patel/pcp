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
dotenv.config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);
// 🔧 Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


// 🔧 Helper function to normalize phone numbers
const normalizePhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If it starts with country code, return with +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // If it's 10 digits, assume India and add +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }

  return `+91${cleaned}`; // Default to India
};

// 🔹 SIGNUP
export const signup = async (req, res) => {
  const { fullName, email, mobile, zipCode, role } = req.body;

  if (!email || !mobile || !fullName) {
    return res.status(400).json({ msg: 'Full name, email, and mobile are required.' });
  }

  // Normalize mobile number for storage
  const normalizedMobile = normalizePhoneNumber(mobile);
  const cleanedMobile = mobile.replace(/\D/g, '');

  // Check for existing user with any mobile format
  const existing = await User.findOne({
    $or: [
      { email },
      { mobile: normalizedMobile },
      { mobile },
      { mobile: cleanedMobile },
      { mobile: { $regex: cleanedMobile, $options: 'i' } }
    ]
  });

  if (existing) return res.status(400).json({ msg: 'User already exists.' });

  const newUser = new User({
    fullName,
    email,
    mobile: normalizedMobile, // Store normalized version
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
};

// 🔹 LOGIN
export const login = async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) return res.status(400).json({ msg: 'Email or mobile required.' });

  try {
    let user;

    // 📧 Email flow
    if (validator.isEmail(identifier)) {
      user = await User.findOne({ email: identifier });
      if (!user) return res.status(404).json({ msg: 'User not found.' });

      const otp = generateOTP(); // now 6-digit
      setEmailOTP(identifier, otp);  // store in memory

      await sendEmailOTP(identifier, otp);
      return res.status(200).json({ msg: 'OTP sent to registered email.' });
    }

    // 📱 Mobile flow
    if (validator.isMobilePhone(identifier.replace(/\D/g, ''), 'any', { strictMode: false })) {
      const normalizedIdentifier = normalizePhoneNumber(identifier);

      // Find user with normalized mobile number
      user = await User.findOne({
        $or: [
          { mobile: normalizedIdentifier },
          { mobile: identifier },
          { mobile: identifier.replace(/\D/g, '') }
        ]
      });

      if (!user) return res.status(404).json({ msg: 'User not found.' });

      console.log('📱 Sending SMS OTP to:', normalizedIdentifier);

      await client.verify.v2.services(verifySid).verifications.create({
        to: normalizedIdentifier,
        channel: 'sms',
      });

      return res.status(200).json({
        msg: 'OTP sent to registered mobile number.',
        normalizedIdentifier // Send back for verification
      });
    }

    return res.status(400).json({ msg: 'Invalid email or mobile number format.' });

  } catch (error) {
    console.error('❌ OTP Sending Failed:', error);
    res.status(500).json({
      msg: 'Failed to send OTP. Please try again later.',
      error: error.message
    });
  }
};

// 🔹 VERIFY OTP
export const verifyOTP = async (req, res) => {
  try {
    const { otp, identifier } = req.body;

    console.log('🔍 Verifying OTP:', { otp, identifier });

    if (!otp) return res.status(400).json({ msg: "OTP is required." });
    if (!identifier) return res.status(400).json({ msg: "Identifier is required." });

    let user;

    // 📧 Email flow → DB OTP check
    if (validator.isEmail(identifier)) {
      const result = verifyEmailOTP(identifier, otp);
      if (!result.success) {
        return res.status(400).json({ msg: result.msg });
      }

      user = await User.findOne({ email: identifier });
    }
    // 📱 Phone flow → Twilio Verify
    else {
      const normalizedIdentifier = normalizePhoneNumber(identifier);

      console.log('📱 Verifying with Twilio:', normalizedIdentifier);

      // First, let's find the user with ALL possible mobile formats
      const cleanedIdentifier = identifier.replace(/\D/g, '');
      const possibleFormats = [
        identifier,                          // Original format
        normalizedIdentifier,                // +91xxxxxxxxxx
        cleanedIdentifier,                   // xxxxxxxxxx
        `+91${cleanedIdentifier}`,          // +91xxxxxxxxxx
        `91${cleanedIdentifier}`,           // 91xxxxxxxxxx
      ];

      console.log('🔍 Searching user with mobile formats:', possibleFormats);

      user = await User.findOne({
        mobile: { $in: possibleFormats }
      });

      if (!user) {
        // Additional search with regex for any mobile containing the digits
        user = await User.findOne({
          mobile: { $regex: cleanedIdentifier, $options: 'i' }
        });
      }

      if (!user) {
        console.error('❌ User not found with any mobile format. Searched formats:', possibleFormats);
        // Let's also check what users exist for debugging
        const allUsers = await User.find({}, { mobile: 1, email: 1, fullName: 1 });
        console.log('📋 All users in database:', allUsers);
        return res.status(404).json({
          msg: "User not found. Please ensure you're using the same mobile number used during signup.",
          searchedFormats: possibleFormats
        });
      }

      console.log('✅ User found:', { mobile: user.mobile, email: user.email });

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
      console.error('❌ User not found for identifier:', identifier);
      return res.status(404).json({ msg: "User not found." });
    }

    // ✅ Mark verified and update mobile format if needed
    user.isVerified = true;
    if (!validator.isEmail(identifier)) {
      user.mobile = normalizePhoneNumber(identifier); // Ensure consistent format
    }
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

// 🔹 Verify Firebase token → issue your own JWT
export const googleLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ msg: "Firebase token is required" });
    }

    // ✅ Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    // Check if user exists in DB
    let user = await User.findOne({ email: decoded.email });

    // If new user → create entry
    if (!user) {
      user = new User({
        fullName: decoded.name || "Google User",
        email: decoded.email,
        mobile: "",
        zipCode: "",
        isVerified: true,
        role: "user",
        image: decoded.picture || "", // ✅ Save Google profile picture
      });
      await user.save();
    } else {
      // ✅ Update user image if changed
      if (decoded.picture && user.image !== decoded.picture) {
        user.image = decoded.picture;
        await user.save();
      }
    }

    // ✅ Issue your JWT
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
        image: user.image, // ✅ Send profile image in response
      },
    });
  } catch (err) {
    console.error("❌ Google login failed:", err);
    res.status(401).json({ msg: "Invalid Google login", error: err.message });
  }
};
