import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { resetOTPState } from "./Redux/Reducers/OtpSlice";
import { Toaster } from "react-hot-toast"; // ✅ add toast provider

import ProductDetailsPage from "./pages/Productdetails";
import Home from "./pages/Home";
import AuthForm from "./pages/AuthForm";
import OtpVerification from "./pages/OtpVerification";
import EnterDetailsForm from "./pages/EnterDetailsForm";
import FilterCategoryPage from "./pages/Filtercategory";
import CompareProducts from "./pages/CompareProduct";
import ProfileOverviewPage from "./pages/UserProfile";
import WishlistPage from "./pages/Wishlist";
import PrivateRoute from "./Components/Protected Route/PrivateRoute"; // ✅ import

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const user = sessionStorage.getItem("user");

    if (!token || !user) {
      dispatch(resetOTPState());
    }
  }, [dispatch]);

  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} /> {/* ✅ Toast UI */}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthForm />} />
        <Route path="/login/otp" element={<OtpVerification />} />
        <Route path="/signup" element={<EnterDetailsForm />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/filter" element={<FilterCategoryPage />} />

        {/* ✅ Protected Routes */}
        <Route
          path="/compare"
          element={
            <PrivateRoute>
              <CompareProducts />
            </PrivateRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <PrivateRoute>
              <WishlistPage />
            </PrivateRoute>
          }
        />

        <Route path="/profile" element={<ProfileOverviewPage />} />
      </Routes>
    </Router>
  );
}

export default App;
