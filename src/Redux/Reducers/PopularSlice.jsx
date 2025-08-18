// src/Redux/Reducers/PopularSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

export const fetchPopularProducts = createAsyncThunk(
  'popular/fetch',
  async ({ storeId, limit }) => {
    const res = await API.get('/popular', {
      params: { storeId, limit },   // ✅ query params
    });
    return res.data.results;
  }
);

const popularProductsSlice = createSlice({
  name: 'popular',
  initialState: { items: [], loading: false, error: null },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPopularProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularProducts.fulfilled, (state, action) => {
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.loading = false;
      })
      .addCase(fetchPopularProducts.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to fetch popular products';
        state.loading = false;
      });
  },
});

export default popularProductsSlice.reducer;
