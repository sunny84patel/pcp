import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast"; // make sure you installed react-hot-toast

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.otp);
  const location = useLocation();

  if (!isAuthenticated) {
    // ✅ Show toast
    toast.error("Please login first to access this page!");

    // ✅ Redirect to login with `from` param (so you can come back later if needed)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
