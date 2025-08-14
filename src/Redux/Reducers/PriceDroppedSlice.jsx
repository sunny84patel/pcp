// src/Slice/priceDropSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Thunk to fetch price dropped products
export const fetchPriceDroppedProducts = createAsyncThunk(
    'priceDrop/fetchPriceDroppedProducts',
    async ({ storeId, limit }) => {
        const res = await axios.get(`${API_URL}/api/popular?storeId=${storeId}&limit=${limit}`);
        console.log("price dropped data",res.data.results);
        return res.data.results;
    }
);

const priceDropSlice = createSlice({
    name: 'priceDrop',
    initialState: {
        items: [],
        loading: false,
        error: null
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPriceDroppedProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPriceDroppedProducts.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchPriceDroppedProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export default priceDropSlice.reducer;
