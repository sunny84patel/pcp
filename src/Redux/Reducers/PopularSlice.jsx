import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'https://pcp-szng.vercel.app';
export const fetchPopularProducts = createAsyncThunk(
  'popular/fetch',
  async ({ storeId, limit }) => {
    const res = await axios.get(`${API_URL}/api/popular?storeId=${storeId}&limit=${limit}`);
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
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchPopularProducts.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch popular products';
        state.loading = false;
      });
  }
});

export default popularProductsSlice.reducer;

