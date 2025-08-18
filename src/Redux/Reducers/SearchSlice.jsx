// src/Redux/Reducers/searchSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

export const fetchSearchResults = createAsyncThunk(
  'search/fetchSearchResults',
  async ({ query, stores, page = 1, limit = 18, sortBy, sortOrder }) => {
    const response = await API.get('/search', {
      params: { query, stores, page, limit, sortBy, sortOrder },  // ✅ query params
    });
    return response.data;
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState: { results: [], status: 'idle', error: null },
  reducers: {},
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

export default searchSlice.reducer;
