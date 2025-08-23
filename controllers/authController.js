import User from '../models/User.js';
import OTP from '../models/OTP.js';
import twilio from "twilio";
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmailOTP } from '../utils/emailSender.js';
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

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

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await OTP.findOneAndUpdate(
        { identifier },
        { otp, expiresAt },
        { upsert: true, new: true }
      );

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
      const record = await OTP.findOne({ identifier });
      if (!record) {
        return res.status(400).json({ msg: "No OTP found. Please request again." });
      }
      
      if (record.expiresAt < new Date()) {
        await OTP.deleteOne({ identifier }); // Clean up expired OTP
        return res.status(400).json({ msg: "OTP expired. Please request a new one." });
      }
      
      if (record.otp !== otp) {
        return res.status(400).json({ msg: "Invalid OTP." });
      }

      user = await User.findOne({ email: identifier });
      
      // Clean up successful OTP
      await OTP.deleteOne({ identifier });
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