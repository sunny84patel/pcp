import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Async thunk for OTP verification
export const verifyOTP = createAsyncThunk(
  'otp/verify',
  async ({ otp }, thunkAPI) => {
    try {
      const res = await API.post('/verify-otp', { otp });
      return res.data; // Expecting { token, user }
    } catch (err) {
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
    },
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        console.log('✅ OTP Verification Success:', action.payload);
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        console.log('❌ OTP Verification Failed:', action.payload);
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
