import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifyOTP } from "../Redux/Reducers/OtpSlice";
import { useNavigate } from "react-router-dom";

// ✅ Toast Component
const Toast = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${
        type === "success"
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
          : "bg-gradient-to-r from-red-500 to-red-600 text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// ✅ Loader Component
const Loader = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
    <span>Verifying OTP...</span>
  </div>
);

const SuccessLoader = () => (
  <div className="flex items-center justify-center">
    <svg
      className="w-5 h-5 text-green-500 mr-2"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
    <span className="text-green-600">Redirecting to home...</span>
  </div>
);

const OtpVerification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const identifier = useSelector((state) => state.login?.identifier || localStorage.getItem('tempIdentifier')); // fallback
  const inputsRef = useRef([...Array(6)].map(() => React.createRef()));
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);

  const { status, error } = useSelector((state) => state.otp);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Helper function to normalize phone numbers
  const normalizePhoneNumber = (phone) => {
    if (!phone) return phone;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with country code, return with +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    
    // If it's 10 digits, assume India and add +91
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    
    // If it already has +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    return `+91${cleaned}`;
  };

  // ✅ Handle input change
  const handleInputChange = (e, index) => {
    const value = e.target.value;
    if (/^[0-9]?$/.test(value)) {
      const newDigits = [...otpDigits];
      newDigits[index] = value;
      setOtpDigits(newDigits);

      if (value && index < 5) {
        inputsRef.current[index + 1].current.focus();
      }

      if (
        value === "" &&
        index > 0 &&
        e.nativeEvent.inputType === "deleteContentBackward"
      ) {
        inputsRef.current[index - 1].current.focus();
      }
    }
  };

  // ✅ Submit OTP
  const handleSubmit = async () => {
    const combinedOTP = otpDigits.join("");
    if (combinedOTP.length !== 6) return;

    if (!identifier) {
      showToast("Session expired. Please login again.", "error");
      navigate('/login');
      return;
    }

    console.log("🔐 Submitting OTP:", { combinedOTP, identifier });

    setIsLoading(true);
    setLoadingStartTime(Date.now());

    try {
      // Normalize identifier if it's a phone number
      let normalizedIdentifier = identifier;
      if (!identifier.includes('@')) {
        normalizedIdentifier = normalizePhoneNumber(identifier);
        console.log("📱 Using normalized identifier:", normalizedIdentifier);
      }

      const resultAction = await dispatch(
        verifyOTP({ otp: combinedOTP, identifier: normalizedIdentifier })
      );

      if (verifyOTP.fulfilled.match(resultAction)) {
        console.log("✅ OTP verification successful");
        localStorage.setItem("token", resultAction.payload.token);
        localStorage.removeItem('tempIdentifier'); // Clean up

        // Update login state if available
        if (window.loginSliceActions) {
          dispatch({
            type: "login/setUserData",
            payload: {
              user: resultAction.payload.user,
              token: resultAction.payload.token,
              isLoggedIn: true,
            },
          });
        }
      } else {
        console.warn("❌ OTP verification failed:", resultAction.payload);
      }
    } catch (error) {
      console.error("❗ Error during OTP verification:", error);
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      otpDigits.join("").length === 6 &&
      !isLoading &&
      !isRedirecting
    ) {
      handleSubmit();
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
  };
  
  const hideToast = () => {
    setToast({ show: false, message: "", type: "" });
  };

  const handleSuccessfulRedirect = () => {
    showToast("OTP verified successfully!", "success");
    setTimeout(() => {
      setIsRedirecting(true);
      setTimeout(() => {
        hideToast();
        showToast("Redirecting to home...", "success");
      }, 500);
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    }, 1000);
  };

  const handleStatusChange = (currentStatus) => {
    if (currentStatus === "succeeded" || currentStatus === "failed") {
      const elapsed = Date.now() - loadingStartTime;
      const minLoadingTime = 1500;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setIsLoading(false);
        if (currentStatus === "succeeded") {
          handleSuccessfulRedirect();
        } else if (currentStatus === "failed") {
          showToast(error || "Invalid OTP. Please try again.", "error");
          setOtpDigits(["", "", "", "", "", ""]);
          if (inputsRef.current[0].current) {
            inputsRef.current[0].current.focus();
          }
        }
      }, remainingTime);
    }
  };

  useEffect(() => {
    if (isLoading && (status === "succeeded" || status === "failed")) {
      handleStatusChange(status);
    }
  }, [status, isLoading, error]);

  useEffect(() => {
    if (inputsRef.current[0].current) {
      inputsRef.current[0].current.focus();
    }

    // Check if identifier exists, if not redirect to login
    if (!identifier) {
      console.warn("⚠️ No identifier found, redirecting to login");
      navigate('/login');
    }
  }, [identifier, navigate]);

  // Show loading if no identifier
  if (!identifier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E3E5FC66]">
        <div className="bg-white rounded-2xl px-8 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#E3E5FC66]">
        <div
          className={`bg-white rounded-2xl px-8 pb-8 pt-4 w-full max-w-md text-center space-y-6 transition-all duration-300 ${
            isRedirecting ? "scale-95 opacity-80" : "scale-100 opacity-100"
          }`}
          style={{ boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.12)" }}
        >
          <div
            onClick={() => navigate(-1)}
            className="top-6 left-6 text-sm text-black cursor-pointer flex items-center gap-1 mb-1 font-semibold"
          >
            <span className="text-xl">←</span> Back
          </div>

          <h2 className="font-semibold text-gray-900 text-2xl">Verify OTP</h2>
          <p className="text-sm text-gray-500 mt-1">
            6 digit OTP has been sent to{" "}
            <span className="font-medium text-gray-700">
              {identifier.includes('@') ? identifier : normalizePhoneNumber(identifier)}
            </span>
          </p>

          {/* ✅ OTP Inputs (6 digits) */}
          <div className="flex justify-center gap-4">
            {inputsRef.current.map((ref, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                ref={ref}
                value={otpDigits[index]}
                onChange={(e) => handleInputChange(e, index)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || isRedirecting}
                style={{ width: "44px", height: "48px" }}
                className={`text-xl text-center border rounded-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                  isRedirecting
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 focus:ring-purple-500"
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              isLoading || isRedirecting || otpDigits.join("").length !== 6
            }
            className={`w-full py-2 text-white rounded-full transition-all duration-200 ${
              isRedirecting
                ? "bg-green-500 hover:bg-green-600"
                : "bg-[#5F43B2] hover:bg-[#4F3392]"
            } disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <Loader />
            ) : isRedirecting ? (
              <SuccessLoader />
            ) : (
              "Continue"
            )}
          </button>

          <p className="text-sm text-gray-500">
            Didn't receive the OTP?{" "}
            <button
              onClick={() => {
                // Add resend OTP logic here
                showToast("Resend OTP functionality coming soon!", "error");
              }}
              className="text-purple-600 underline hover:text-purple-800 transition-colors"
              style={{ color: "rgba(82, 61, 150, 1)" }}
              disabled={isLoading || isRedirecting}
            >
              Resend OTP
            </button>
          </p>

          <div className="flex items-center justify-center space-x-2">
            <hr className="w-full border-gray-300" />
            <span className="text-gray-400 text-sm">or</span>
            <hr className="w-full border-gray-300" />
          </div>

          {/* Social login buttons */}
          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Continue with Apple
            </button>
          </div>
        </div>
      </div>
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default OtpVerification;