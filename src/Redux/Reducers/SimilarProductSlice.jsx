// src/Redux/Reducers/similarProductsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// 🔹 In-memory cache for similar products
const similarProductsCache = {};

export const fetchSimilarProducts = createAsyncThunk(
  'similarProducts/fetchSimilarProducts',
  async (productId, { rejectWithValue }) => {
    try {
      // ✅ Check if we already cached for this productId
      if (similarProductsCache[productId]) {
        return similarProductsCache[productId];
      }

      const response = await API.get(`/products/${productId}/similar`);

      // ✅ Save in cache
      similarProductsCache[productId] = response.data;

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
  reducers: {
    // ✅ Optional: clear cache
    clearSimilarProductsCache: () => {
      for (const key in similarProductsCache) {
        delete similarProductsCache[key];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSimilarProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimilarProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results;
      })
      .addCase(fetchSimilarProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSimilarProductsCache } = similarProductsSlice.actions;
export default similarProductsSlice.reducer;
