// src/Redux/Reducers/similarProductsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Async thunk to fetch similar products
export const fetchSimilarProducts = createAsyncThunk(
  'similarProducts/fetchSimilarProducts',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${productId}/similar`);
      return response.data;
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch');
    }
  }
);

const similarProductsSlice = createSlice({
  name: 'similarProducts',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSimilarProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimilarProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSimilarProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default similarProductsSlice.reducer;
