// src/Redux/Reducers/searchSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

// 🔹 Simple in-memory cache object
const searchCache = {};

export const fetchSearchResults = createAsyncThunk(
  'search/fetchSearchResults',
  async ({ query, stores, page = 1, limit = 18, sortBy, sortOrder }) => {
    // Create a unique cache key based on params
    const cacheKey = JSON.stringify({ query, stores, page, limit, sortBy, sortOrder });

    // ✅ If cache exists, return it immediately
    if (searchCache[cacheKey]) {
      return searchCache[cacheKey];
    }

    // Otherwise, call API
    const response = await API.get('/search', {
      params: { query, stores, page, limit, sortBy, sortOrder },
    });

    // ✅ Save response to cache
    searchCache[cacheKey] = response.data;

    return response.data;
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState: { results: [], status: 'idle', error: null },
  reducers: {
    // Optional: clear cache (for logout, refresh, etc.)
    clearSearchCache: () => {
      for (const key in searchCache) {
        delete searchCache[key];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSearchResults.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.results = action.payload;
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { clearSearchCache } = searchSlice.actions;
export default searchSlice.reducer;
