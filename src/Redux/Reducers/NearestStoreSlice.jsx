import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import stores from "../../data/stores_with_coords.json"; // your static store list

// Utility to calculate distance
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Async thunk to detect nearest store
export const fetchNearestStore = createAsyncThunk(
  "nearestStore/fetch",
  async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject("Geolocation not supported");
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          // Reverse geocode → ZIP
          let zip = "10001"; // fallback
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await res.json();
            if (data?.postcode) {
              zip = data.postcode;
            }
          } catch (e) {
            console.warn("ZIP fetch failed, using fallback:", e);
          }

          // Find nearest store
          let closest = null;
          let minDist = Infinity;

          stores.forEach((store) => {
            const dist = getDistance(latitude, longitude, store.lat, store.lng);
            if (dist < minDist) {
              minDist = dist;
              closest = {
                ...store,
                distance: `${dist.toFixed(1)} mi`,
                zip,
              };
            }
          });

          resolve(closest);
        },
        (err) => reject(err.message || "Location error")
      );
    });
  }
);

const nearestStoreSlice = createSlice({
  name: "nearestStore",
  initialState: {
    store: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNearestStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearestStore.fulfilled, (state, action) => {
        state.loading = false;
        state.store = action.payload;
      })
      .addCase(fetchNearestStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default nearestStoreSlice.reducer;
