import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import API from "../../api";
// Thunks
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetchWishlist",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/");
      return res.data.products;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const addToWishlist = createAsyncThunk(
  "wishlist/addToWishlist",
  async (productId, { rejectWithValue }) => {
    try {
      const res = await API.post("/add", { productId });
      return res.data.wishlist.products;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  "wishlist/removeFromWishlist",
  async (productId, { rejectWithValue }) => {
    try {
      const res = await API.delete(`/remove/${productId}`);
      return res.data.wishlist.products;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    products: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // === fetch ===
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload || [];
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // === add ===
      .addCase(addToWishlist.fulfilled, (state, action) => {
        // If API returns a single product, push it
        if (Array.isArray(action.payload)) {
          state.products = action.payload;
        } else {
          state.products.push(action.payload);
        }
      })

      // === remove ===
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        const removedId = action.meta.arg; // productId we passed
        state.products = state.products.filter(
          (p) => p.productId !== removedId
        );
      });
  },
});


export default wishlistSlice.reducer;
