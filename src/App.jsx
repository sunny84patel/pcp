import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProductDetailsPage from "./pages/Productdetails";
import Home from "./pages/Home";
import AuthForm from "./pages/AuthForm";
import OtpVerification from "./pages/OtpVerification";
import EnterDetailsForm from "./pages/EnterDetailsForm";
import FilterCategoryPage from "./pages/Filtercategory";
import CompareProducts from "./pages/CompareProduct";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthForm />} />
        <Route path="/login/otp" element={<OtpVerification />} />
        <Route path="/signup" element={<EnterDetailsForm />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/filter" element={<FilterCategoryPage />} />
        <Route path="/compare" element={<CompareProducts  />} />
      </Routes>
    </Router>
  );
}

export default App;
