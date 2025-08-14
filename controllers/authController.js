import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmailOTP } from '../utils/emailSender.js';
import { sendMobileOTP } from '../utils/smsSender.js';
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// 🔹 SIGNUP (Default role: user, only backend can assign admin role)
export const signup = async (req, res) => {
    const { fullName, email, mobile, zipCode, role } = req.body;

    if (!email || !mobile || !fullName) {
        return res.status(400).json({ msg: 'Full name, email, and mobile are required.' });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) return res.status(400).json({ msg: 'User already exists.' });

    const newUser = new User({
        fullName,
        email,
        mobile,
        zipCode,
        isVerified: false,
        role: role || 'user', // ✅ set to 'user' if not provided
    });

    await newUser.save();

    res.status(201).json({ msg: `Account created as '${newUser.role}'. Please login to continue.`, user: newUser });
};


// 🔹 LOGIN
export const login = async (req, res) => {
    const { identifier } = req.body;

    if (!identifier) return res.status(400).json({ msg: 'Email or mobile required.' });

    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.findOneAndUpdate(
        { identifier },
        { otp, expiresAt },
        { upsert: true, new: true }
    );

    // ✅ Send OTP via email or SMS
    try {
        if (validator.isEmail(identifier)) {
            await sendEmailOTP(identifier, otp);
            res.status(200).json({ msg: 'OTP sent to registered email.' });
        } else if (validator.isMobilePhone(identifier, 'any', { strictMode: false })) {
            let formattedMobile = identifier;
            if (!identifier.startsWith('+')) {
                // assuming India as default
                formattedMobile = '+91' + identifier;
            }
            await sendMobileOTP(formattedMobile, otp);
            res.status(200).json({ msg: 'OTP sent to registered mobile number.' });
        } else {
            res.status(400).json({ msg: 'Invalid email or mobile number format.' });
        }
    } catch (error) {
        console.error('OTP Sending Failed:', error.message);
        res.status(500).json({ msg: 'Failed to send OTP. Please try again later.' });
    }
};

// 🔹 VERIFY OTP
export const verifyOTP = async (req, res) => {
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ msg: 'OTP is required.' });

    // Find OTP record by otp
    const record = await OTP.findOne({ otp });

    if (!record || record.expiresAt < new Date()) {
        return res.status(400).json({ msg: 'Invalid or expired OTP.' });
    }

    const identifier = record.identifier;

    const user = await User.findOne({ $or: [{ email: identifier }, { mobile: identifier }] });
    if (!user) return res.status(404).json({ msg: 'User not found.' });

    user.isVerified = true;
    await user.save();

    // Optionally delete used OTP
    await OTP.deleteOne({ _id: record._id });

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.status(200).json({ token, user });
};
