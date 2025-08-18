// src/Slice/priceDropSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// Thunk to fetch price dropped products
export const fetchPriceDroppedProducts = createAsyncThunk(
  'priceDrop/fetchPriceDroppedProducts',
  async ({ storeId, limit }) => {
    const res = await API.get('/popular', {
      params: { storeId, limit },   // ✅ proper query params
    });
    console.log("price dropped data", res.data.results);
    return res.data.results;
  }
);

const priceDropSlice = createSlice({
  name: 'priceDrop',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceDroppedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPriceDroppedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchPriceDroppedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch price dropped products';
      });
  },
});

export default priceDropSlice.reducer;
