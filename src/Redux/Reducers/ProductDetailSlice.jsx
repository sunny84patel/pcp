// src/Slice/productDetailSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// 🔹 Simple in-memory cache object
const productCache = {};

// Thunk to fetch product details by ID
export const fetchProductDetail = createAsyncThunk(
  'productDetail/fetchProductDetail',
  async (id, { rejectWithValue }) => {
    try {
      // ✅ Check cache first
      if (productCache[id]) {
        return productCache[id];
      }

      // If not cached, fetch from API
      const res = await API.get(`/products/${id}`);
      console.log("Fetched product detail:", res.data);

      // ✅ Save response in cache
      productCache[id] = res.data;

      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Something went wrong");
    }
  }
);

const productDetailSlice = createSlice({
  name: 'productDetail',
  initialState: {
    product: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearProductDetail: (state) => {
      state.product = null;
      state.loading = false;
      state.error = null;
    },
    // ✅ Optional: clear full cache
    clearProductCache: () => {
      for (const key in productCache) {
        delete productCache[key];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.product = action.payload;
      })
      .addCase(fetchProductDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProductDetail, clearProductCache } = productDetailSlice.actions;
export default productDetailSlice.reducer;
