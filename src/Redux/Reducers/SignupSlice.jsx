import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API from '../../api';
// const API = axios.create({ baseURL: 'https://pcp-szng.vercel.app/api' });

export const signup = createAsyncThunk('signup/user', async (userData, thunkAPI) => {
  try {
    const res = await API.post('/signup', userData);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.msg || 'Signup failed');
  }
});

const signupSlice = createSlice({
  name: 'signup',
  initialState: {
    user: null,
    message: null,
    status: 'idle',
    error: null,
  },
  reducers: {
    resetSignupState: (state) => {
      state.status = 'idle';
      state.error = null;
      state.message = null;
      state.user = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.message = action.payload.msg;
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { resetSignupState } = signupSlice.actions;
export default signupSlice.reducer;
 