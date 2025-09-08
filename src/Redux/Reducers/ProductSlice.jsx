// src/slices/productSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API from '../../api';
// const API_URL = import.meta.env.VITE_API_URL || 'https://pcp-szng.vercel.app';
// Fetch popular products
export const fetchPopularProducts = createAsyncThunk(
  'products/fetchPopularProducts',
  async ({ storeId = 'homedepot', limit = 10 }, thunkAPI) => {
    try {
      const res = await axios.get(`${API}/popular?storeId=${storeId}&limit=${limit}`);
      console.log('Popular products response:', res.data);
      return res.data.results;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

// Fetch products by IDs
export const fetchProductsByIds = createAsyncThunk(
  'products/fetchProductsByIds',
  async (ids, thunkAPI) => {
    try {
      const res = await axios.get(`${API}/api/recent?ids=${ids.join(',')}`);
      console.log('recently products response:', res.data);
      return res.data.results;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.error || err.message);
    }
  }
);

const productSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearProducts: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPopularProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPopularProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPopularProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductsByIds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByIds.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProductsByIds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearProducts } = productSlice.actions;
export default productSlice.reducer;
