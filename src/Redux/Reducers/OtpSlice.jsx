import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API from '../../api';

// Helper function to normalize phone numbers (same as backend)
const normalizePhoneNumber = (phone) => {
  if (!phone) return phone;
  
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

// Async thunk for OTP verification
export const verifyOTP = createAsyncThunk(
  'otp/verify',
  async ({ otp, identifier }, thunkAPI) => {
    try {
      console.log('🔐 Frontend sending OTP verification:', { otp, identifier });
      
      // Normalize identifier if it's a phone number
      let normalizedIdentifier = identifier;
      
      // Check if it's not an email (simple email check)
      if (!identifier.includes('@')) {
        normalizedIdentifier = normalizePhoneNumber(identifier);
        console.log('📱 Normalized identifier:', normalizedIdentifier);
      }
      
      // ✅ send both otp & normalized identifier to backend
      const res = await API.post('/verify-otp', { 
        otp, 
        identifier: normalizedIdentifier 
      });
      
      console.log('✅ Backend response:', res.data);
      return res.data; // Expecting { token, user }
      
    } catch (err) {
      console.error('❌ OTP verification error:', err.response?.data || err.message);
      return thunkAPI.rejectWithValue(
        err.response?.data?.msg || 'OTP verification failed'
      );
    }
  }
);

const initialState = {
  token: null,
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  isAuthenticated: false,
};

const otpSlice = createSlice({
  name: 'otp',
  initialState,
  reducers: {
    resetOTPState: () => initialState, // ✅ Full state reset
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      // Also clear localStorage
      localStorage.removeItem('token');
    },
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
    },
    clearError: (state) => {
      state.error = null;
      state.status = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        console.log('✅ Redux: OTP Verification Success:', action.payload);
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        console.log('❌ Redux: OTP Verification Failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  }
});

export const { resetOTPState, logout, setUser, clearError } = otpSlice.actions;
export default otpSlice.reducer;