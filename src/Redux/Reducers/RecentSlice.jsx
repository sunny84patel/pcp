// src/Redux/Reducers/RecentlyViewedSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

export const fetchProductsByIds = createAsyncThunk(
  'recent/fetchByIds',
  async (ids) => {
    const res = await API.get('/recent', {
      params: { ids: ids.join(',') },   // ✅ proper query params
    });
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
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
      })
      .addCase(fetchProductsByIds.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to fetch recent products';
        state.loading = false;
      });
  },
});

export default recentlyViewedSlice.reducer;
