import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import { combineReducers } from '@reduxjs/toolkit';

// Importing reducers for search, recent, and popular slices
import searchReducer from '../Reducers/SearchSlice';
import recentReducer from "../Reducers/RecentSlice";
import popularReducer from "../Reducers/PopularSlice";
import priceDropReducer from "../Reducers/PriceDroppedSlice";
import productDetailReducer from "../Reducers/ProductDetailSlice";
import similarProductsReducer from "../Reducers/SimilarProductSlice";
import signupReducer from '../Reducers/SignupSlice';
import loginReducer from '../Reducers/LoginSlice';
import otpReducer from '../Reducers/OtpSlice';
import nearestStoreReducer from "../Reducers/NearestStoreSlice";

// Persist configuration
const persistConfig = {
  key: 'buildScout', // unique key for your app
  storage,
  whitelist: ['otp'], // Only persist otp slice (user authentication data)
  // blacklist: ['search', 'login'], // Don't persist these (optional)
};

// Combine all your reducers
const rootReducer = combineReducers({
  popular: popularReducer,
  recent: recentReducer,
  priceDrop: priceDropReducer,
  productDetails: productDetailReducer, 
  similarProducts: similarProductsReducer,
  signup: signupReducer,
  login: loginReducer,
  otp: otpReducer,
  search: searchReducer,
  nearestStore: nearestStoreReducer
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persisted reducer
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/FLUSH'
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools in development
});

// Create persistor
export const persistor = persistStore(store);