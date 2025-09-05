import express from 'express';
import { signup, login, verifyOTP, googleLogin  } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);         // only saves user info
router.post('/login', login);           // send OTP
router.post('/verify-otp', verifyOTP);  // verify OTP and issue JWT
router.post('/google-login', googleLogin); // Google OAuth login

export default router;
