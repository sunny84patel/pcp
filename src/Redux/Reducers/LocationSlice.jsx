// src/Redux/Reducers/locationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Thunk to fetch ZIP code from coordinates
export const fetchZipFromCoords = createAsyncThunk(
  "location/fetchZipFromCoords",
  async ({ latitude, longitude }, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch location data");
      }

      const data = await response.json();

      return {
        latitude,
        longitude,
        zipcode: data.address?.postcode || null,
        city: data.address?.city || data.address?.town || data.address?.village || null,
        state: data.address?.state || null,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const locationSlice = createSlice({
  name: "location",
  initialState: {
    latitude: null,
    longitude: null,
    zipcode: null,
    city: null,
    state: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchZipFromCoords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZipFromCoords.fulfilled, (state, action) => {
        state.loading = false;
        state.latitude = action.payload.latitude;
        state.longitude = action.payload.longitude;
        state.zipcode = action.payload.zipcode;
        state.city = action.payload.city;
        state.state = action.payload.state;
      })
      .addCase(fetchZipFromCoords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch location";
      });
  },
});

export default locationSlice.reducer;
