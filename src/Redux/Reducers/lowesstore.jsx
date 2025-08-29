import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import lowesStores from "../../data/stores.json"; // Your Lowe's stores data

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

// Async thunk to get user location and find nearest Lowe's store
export const fetchNearestLowesStore = createAsyncThunk(
  "nearestLowesStore/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      // Get user's current position
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log("🟢 User location:", { latitude, longitude });

      // Calculate distance to each store and find the nearest
      const storesWithDistance = lowesStores.map(store => {
        // You might need to add lat/lng to your JSON, or geocode the address
        // For now, we'll use a simple ZIP-based matching as fallback
        return {
          ...store,
          calculatedDistance: Math.random() * 50 // Placeholder - replace with actual calculation
        };
      });

      // Sort by distance and get the nearest
      storesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
      const nearestStore = storesWithDistance[0];

      // Optional: Get ZIP code for additional verification
      let userZip = null;
      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const geoData = await geoRes.json();
        
        if (geoData?.postcode) {
          userZip = geoData.postcode;
          console.log("🟢 Detected ZIP:", userZip);
          
          // Try to find exact ZIP match first
          const zipMatch = lowesStores.find(store => 
            String(store.zipcode) === String(userZip)
          );
          
          if (zipMatch) {
            console.log("🟢 Found exact ZIP match:", zipMatch);
            return {
              ...zipMatch,
              userZip,
              userLocation: { latitude, longitude },
              matchType: 'zip'
            };
          }
        }
      } catch (geoError) {
        console.warn("⚠️ ZIP geocoding failed:", geoError);
      }

      // If no exact ZIP match, return nearest by distance calculation
      return {
        ...nearestStore,
        userZip,
        userLocation: { latitude, longitude },
        matchType: 'distance'
      };

    } catch (error) {
      console.error("🔴 Lowe's store fetch failed:", error);
      return rejectWithValue(error.message || "Failed to fetch nearest Lowe's store");
    }
  }
);

// Alternative thunk if you want to search by ZIP code directly
export const fetchLowesStoreByZip = createAsyncThunk(
  "nearestLowesStore/fetchByZip",
  async (zipCode, { rejectWithValue }) => {
    try {
      const zipString = String(zipCode);
      const matchingStores = lowesStores.filter(store => 
        String(store.zipcode) === zipString
      );

      if (matchingStores.length === 0) {
        throw new Error(`No Lowe's store found for ZIP code ${zipCode}`);
      }

      // Return first match (or you could return all matches)
      return {
        ...matchingStores[0],
        searchedZip: zipCode,
        matchType: 'zip'
      };

    } catch (error) {
      console.error("🔴 Lowe's ZIP search failed:", error);
      return rejectWithValue(error.message || "Failed to find Lowe's store by ZIP");
    }
  }
);

// Lowe's store slice
const nearestLowesStoreSlice = createSlice({
  name: "nearestLowesStore",
  initialState: {
    store: null,
    loading: false,
    error: null,
    userLocation: null,
    lastFetchTime: null
  },
  reducers: {
    // Clear store data
    clearLowesStore: (state) => {
      state.store = null;
      state.error = null;
      state.userLocation = null;
      state.lastFetchTime = null;
    },
    
    // Clear error
    clearLowesError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle location-based fetch
      .addCase(fetchNearestLowesStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNearestLowesStore.fulfilled, (state, action) => {
        state.loading = false;
        state.store = action.payload;
        state.userLocation = action.payload.userLocation;
        state.lastFetchTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchNearestLowesStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        state.store = null;
      })
      
      // Handle ZIP-based fetch
      .addCase(fetchLowesStoreByZip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowesStoreByZip.fulfilled, (state, action) => {
        state.loading = false;
        state.store = action.payload;
        state.lastFetchTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchLowesStoreByZip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
        state.store = null;
      });
  },
});

// Export actions
export const { clearLowesStore, clearLowesError } = nearestLowesStoreSlice.actions;

// Export reducer
export default nearestLowesStoreSlice.reducer;