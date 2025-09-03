import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// Helper function to normalize phone numbers (same as backend)
const normalizePhoneNumber = (phone) => {
  if (!phone) return phone;

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (phone.startsWith('+')) {
    return phone;
  }

  return `+91${cleaned}`;
};

// Async thunk for OTP verification
export const verifyOTP = createAsyncThunk(
  'otp/verify',
  async ({ otp, identifier }, thunkAPI) => {
    try {
      console.log('🔐 Frontend sending OTP verification:', { otp, identifier });

      let normalizedIdentifier = identifier;
      if (!identifier.includes('@')) {
        normalizedIdentifier = normalizePhoneNumber(identifier);
        console.log('📱 Normalized identifier:', normalizedIdentifier);
      }

      const res = await API.post('/verify-otp', {
        otp,
        identifier: normalizedIdentifier,
      });

      console.log('✅ Backend response:', res.data);
      return res.data; // Expecting { token, user }
    } catch (err) {
      console.error(
        '❌ OTP verification error:',
        err.response?.data || err.message
      );
      return thunkAPI.rejectWithValue(
        err.response?.data?.msg || 'OTP verification failed'
      );
    }
  }
);

// ✅ Initialize state from sessionStorage
const storedUser = sessionStorage.getItem('user');
const storedToken = sessionStorage.getItem('token');

const initialState = {
  token: storedToken || null,
  user: storedUser ? JSON.parse(storedUser) : null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  isAuthenticated: !!storedUser && !!storedToken,
};

const otpSlice = createSlice({
  name: 'otp',
  initialState,
  reducers: {
    resetOTPState: () => {
      sessionStorage.clear();
      return {
        token: null,
        user: null,
        status: 'idle',
        error: null,
        isAuthenticated: false,
      };
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      sessionStorage.clear();
    },
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;

      // ✅ Save to sessionStorage so it survives refresh
      sessionStorage.setItem('user', JSON.stringify(action.payload.user));
      sessionStorage.setItem('token', action.payload.token);
    },
    clearError: (state) => {
      state.error = null;
      state.status = 'idle';
    },
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

        // ✅ Persist session
        sessionStorage.setItem('token', action.payload.token);
        sessionStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        console.log('❌ Redux: OTP Verification Failed:', action.payload);
        state.status = 'failed';
        state.error = action.payload;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;

        sessionStorage.clear();
      });
  },
});

export const { resetOTPState, logout, setUser, clearError } = otpSlice.actions;
export default otpSlice.reducer;
