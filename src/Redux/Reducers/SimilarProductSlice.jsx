// src/Redux/Reducers/similarProductsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// Async thunk to fetch similar products
export const fetchSimilarProducts = createAsyncThunk(
  'similarProducts/fetchSimilarProducts',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await API.get(`/products/${productId}/similar`); // ✅ use API instance
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
