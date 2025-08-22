import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faFacebook } from "@fortawesome/free-brands-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import {
  sendOTP,
  setIdentifier,
  resetLoginState,
} from "../Redux/Reducers/LoginSlice";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Link } from "react-router-dom";
import { setUser } from "../Redux/Reducers/OtpSlice";

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
      <span>Sending OTP...</span>
    </div>
  );
};

const AuthForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const { status, error, message } = useSelector((state) => state.login);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input) return;
    setIsLoading(true);
    setLoadingStartTime(Date.now());
    dispatch(setIdentifier(input));
    dispatch(sendOTP({ identifier: input }));
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: "", type: "" });
  };
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Get Firebase ID token
      const token = await user.getIdToken();

      // Format user data for Redux
      const userData = {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        image: user.photoURL,
      };

      // Save in localStorage
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", token);

      // Save in Redux using setUser
      dispatch(
        setUser({
          user: userData,
          token: token,
        })
      );

      console.log("✅ Google Login Success:", userData);

      navigate("/");
    } catch (error) {
      console.error("❌ Google Login Failed:", error);
      showToast("Login failed. Please try again.", "error");
    }
  };

  const handleStatusChange = (currentStatus) => {
    if (currentStatus === "succeeded" || currentStatus === "failed") {
      const elapsed = Date.now() - loadingStartTime;
      const minLoadingTime = 2500; // 2.5 seconds minimum loading time

      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setIsLoading(false);

        if (currentStatus === "succeeded") {
          showToast(message || "OTP sent successfully!", "success");
          setTimeout(() => {
            dispatch(resetLoginState());
            navigate("/login/otp");
          }, 1500);
        } else if (currentStatus === "failed") {
          showToast(error || "Failed to send OTP. Please try again.", "error");
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
      <div className="min-h-screen flex items-center justify-center bg-[#E3E5FC66]">
        <div
          className="bg-white rounded-2xl p-8 w-full max-w-md text-center space-y-6"
          style={{
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.12)",
          }}
        >
          <h2
            className="font-semibold text-gray-900"
            style={{ fontSize: "28px", marginBottom: "8px" }}
          >
            Login
          </h2>
          <p className="text-sm text-gray-500">
            Please fill in the details below.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit}>
            {/* Input */}
            <input
              type="text"
              placeholder="Enter mobile number or email"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              required
              style={{ height: "48px" }}
              className="w-full px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-[rgba(109,109,109,1)]"
            />

            {/* Continue Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 text-white rounded-full transition bg-[#5F43B2] hover:bg-purple-700 mt-4 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader /> : "Continue"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center justify-center space-x-2">
            <hr className="w-full border-gray-300" />
            <span className="text-gray-400 text-sm">or</span>
            <hr className="w-full border-gray-300" />
          </div>

          {/* Social Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition cursor-pointer"
              style={{ height: "48px", border: "1px solid #757575" }}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition cursor-pointer"
              style={{ height: "48px", border: "1px solid #757575" }}
            >
              <FontAwesomeIcon
                icon={faFacebook}
                className="text-[#1877F2] w-5 h-5"
              />
              Continue with Facebook
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition cursor-pointer"
              style={{ height: "48px", border: "1px solid #757575" }}
            >
              <FontAwesomeIcon icon={faApple} className="w-5 h-5" />
              Continue with Apple
            </button>
          </div>

          {/* Terms & Help */}
          <p className="text-xs mt-2" style={{ color: "#757575" }}>
            By continuing, you agree to our{" "}
            <a href="#" className="text-blue-600 underline">
              Conditions of use
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 underline">
              Privacy Policy
            </a>
          </p>

          <div className="text-sm text-center space-y-2">
            <p className="text-blue-600 underline cursor-pointer">
              Have trouble logging in? Get Help
            </p>
            <p className="text-gray-600">
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="text-blue-600 underline hover:text-blue-800 transition"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
      {/* Toast Notification */}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default AuthForm;
