// loginSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API = axios.create({ baseURL: "https://pcp-szng.vercel.app/api" });

export const sendOTP = createAsyncThunk(
  "login/sendOTP",
  async ({ identifier }, thunkAPI) => {
    try {
      const res = await API.post("/login", { identifier });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.msg || "Failed to send OTP"
      );
    }
  }
);

// ✅ Load initial state from localStorage
const getInitialState = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  
  return {
    identifier: null,
    message: null,
    status: "idle",
    error: null,
    isLoggedIn: !!token, // ✅ Check if token exists
    user: user ? JSON.parse(user) : null, // ✅ Parse stored user data
    token: token || null,
  };
};

const initialState = getInitialState();

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    setIdentifier: (state, action) => {
      state.identifier = action.payload;
    },
    resetLoginState: (state) => {
      state.status = "idle";
      state.message = null;
      state.error = null;
    },
    // ✅ NEW: Set user data after successful OTP verification
    setUserData: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = action.payload.isLoggedIn;
      
      // ✅ Persist to localStorage
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("token", action.payload.token);
    },
    // ✅ Updated logout reducer
    logout: (state) => {
      state.identifier = null;
      state.message = null;
      state.status = "idle";
      state.error = null;
      state.isLoggedIn = false;
      state.user = null;
      state.token = null;
      
      // ✅ Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOTP.pending, (state) => {
        state.status = "loading";
      })
      .addCase(sendOTP.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.message = action.payload.msg;
        // ✅ Don't set isLoggedIn here - only after OTP verification
        // state.isLoggedIn = true;
        // state.user = action.payload.user;
        // state.token = action.payload.token;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { setIdentifier, resetLoginState, logout, setUserData } = loginSlice.actions;
export default loginSlice.reducer;