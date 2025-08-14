import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const fetchProductsByIds = createAsyncThunk(
  'recent/fetchByIds',
  async (ids) => {
    const res = await axios.get(`${API_URL}/api/recent?ids=${ids.join(',')}`);
    return res.data.results;
  }
);

const recentlyViewedSlice = createSlice({
  name: 'recent',
  initialState: { items: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsByIds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByIds.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchProductsByIds.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch recent products';
        state.loading = false;
      });
  }
});

export default recentlyViewedSlice.reducer;
