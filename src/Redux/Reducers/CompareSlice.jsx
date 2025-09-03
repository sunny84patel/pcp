// compareSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api"; 
// const API = axios.create({ baseURL: "https://pcp-szng.vercel.app/api" });

// Thunk: Fetch comparison data from backend
export const fetchComparison = createAsyncThunk(
  "compare/fetchComparison",
  async (productIds, thunkAPI) => {
    try {
      const res = await API.post("/compare", { productIds });
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.msg || "Failed to fetch comparison"
      );
    }
  }
);

const compareSlice = createSlice({
  name: "compare",
  initialState: {
    selected: [],          // array of productIds user added
    comparedProducts: [],  // full product details returned from API
    loading: false,
    error: null,
  },
  reducers: {
    toggleCompare: (state, action) => {
      const id = action.payload;
      if (state.selected.includes(id)) {
        state.selected = state.selected.filter((pid) => pid !== id);
      } else {
        if (state.selected.length < 3) {
          state.selected.push(id);
        }
      }
    },
    clearCompare: (state) => {
      state.selected = [];
      state.comparedProducts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComparison.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComparison.fulfilled, (state, action) => {
        state.loading = false;
        state.comparedProducts = action.payload.comparedProducts;
      })
      .addCase(fetchComparison.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { toggleCompare, clearCompare } = compareSlice.actions;
export default compareSlice.reducer;
