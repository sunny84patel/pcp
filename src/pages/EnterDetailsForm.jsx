import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import { useDispatch, useSelector } from "react-redux";
import { signup, resetSignupState } from "../Redux/Reducers/SignupSlice";
import { useNavigate } from "react-router-dom";

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
        type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {type === "success" ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Loader Component
const Loader = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
      <span>Creating Account...</span>
    </div>
  );
};

const EnterDetailsForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, message } = useSelector((state) => state.signup);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    zipCode: "",
    countryCode: "IN", // Default to India
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingStartTime(Date.now());
    dispatch(signup(formData));
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: "", type: "" });
  };

  const handleStatusChange = (currentStatus) => {
    if (currentStatus === "succeeded" || currentStatus === "failed") {
      const elapsed = Date.now() - loadingStartTime;
      const minLoadingTime = 2500; // 2.5 seconds minimum loading time

      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setIsLoading(false);

        if (currentStatus === "succeeded") {
          showToast(message || "Account created successfully!", "success");
          setTimeout(() => {
            dispatch(resetSignupState());
            navigate("/login");
          }, 1500);
        } else if (currentStatus === "failed") {
          showToast(
            error || "Failed to create account. Please try again.",
            "error"
          );
        }
      }, remainingTime);
    }
  };

  useEffect(() => {
    if (isLoading && (status === "succeeded" || status === "failed")) {
      handleStatusChange(status);
    }
  }, [status, isLoading, dispatch, navigate, message, error, loadingStartTime]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6ff]">
        <div
          className="relative bg-white rounded-2xl p-8 w-full max-w-md text-center space-y-6"
          style={{
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.12)",
          }}
        >
          {/* Back */}
          <div
            onClick={() => navigate(-1)} // navigate back
            className="absolute top-6 left-6 text-sm text-black cursor-pointer flex items-center gap-1 font-semibold"
          >
            <span className="text-xl">←</span> Back
          </div>

          {/* Heading */}
          <h2
            className="font-semibold text-gray-900"
            style={{ fontSize: "28px", marginBottom: "8px" }}
          >
            Enter Details
          </h2>
          <p className="text-sm text-gray-500">
            Please fill in your details to help us serve you better.
          </p>

          {/* Input Fields */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
              style={{ height: "48px", fontSize: "16px", color: "black" }}
            />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full border rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
              style={{ height: "48px", fontSize: "16px", color: "black" }}
            />

            {/* Country Code + Mobile */}
            <div className="flex gap-2">
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                disabled={isLoading}
                className="w-1/3 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                style={{ height: "48px", fontSize: "16px", color: "black" }}
                required
              >
                <option value="IN">🇮🇳 India +91</option>
                <option value="US">🇺🇸 US +1</option>
                <option value="CA">🇨🇦 Canada +1</option>
                <option value="GB">🇬🇧 UK +44</option>
                <option value="AU">🇦🇺 Australia +61</option>
              </select>

              <input
                type="tel"
                name="mobile"
                placeholder="Mobile Number"
                value={formData.mobile}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-2/3 border rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                style={{ height: "48px", fontSize: "16px", color: "black" }}
              />
            </div>

            <input
              type="text"
              name="zipCode"
              placeholder="Zip Code"
              value={formData.zipCode}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full border rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
              style={{ height: "48px", fontSize: "16px", color: "black" }}
            />

            <button
              type="submit"
              className="w-full py-3 text-white rounded-full hover:bg-purple-700 transition mt-4 bg-[#5F43B2] disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? <Loader /> : "Create my account"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default EnterDetailsForm;
