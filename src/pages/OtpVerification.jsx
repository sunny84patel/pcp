import React, { useEffect, useRef, useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import { faApple, faFacebook } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useDispatch, useSelector } from "react-redux";
import { verifyOTP } from "../Redux/Reducers/OtpSlice";
import { useNavigate } from "react-router-dom";

// Enhanced Toast Component with better animations
const Toast = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
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
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
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

// Enhanced Loader Component
const Loader = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
      <span>Verifying OTP...</span>
    </div>
  );
};

// Success Loader for redirect
const SuccessLoader = () => {
  return (
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
};

const OtpVerification = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const identifier = useSelector((state) => state.login.identifier);
  const inputsRef = useRef([...Array(4)].map(() => React.createRef()));
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);

  const { status, error } = useSelector((state) => state.otp);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  const handleInputChange = (e, index) => {
    const value = e.target.value;

    if (/^[0-9]?$/.test(value)) {
      const newDigits = [...otpDigits];
      newDigits[index] = value;
      setOtpDigits(newDigits);

      if (value && index < 3) {
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

  const handleSubmit = async () => {
    const combinedOTP = otpDigits.join("");
    if (combinedOTP.length !== 4) return;

    console.log("🔐 Submitting OTP:", combinedOTP);

    setIsLoading(true);
    setLoadingStartTime(Date.now());

    try {
      const resultAction = await dispatch(verifyOTP({ otp: combinedOTP }));

      if (verifyOTP.fulfilled.match(resultAction)) {
        console.log("✅ OTP verification successful");
        console.log("🧑 User data:", resultAction.payload.user);
        console.log("🔑 Token:", resultAction.payload.token);

        // ✅ Store token in localStorage for persistence
        localStorage.setItem("token", resultAction.payload.token);

        // ✅ Update login slice with user data
        dispatch({
          type: "login/setUserData",
          payload: {
            user: resultAction.payload.user,
            token: resultAction.payload.token,
            isLoggedIn: true,
          },
        });
      } else {
        console.warn("❌ OTP verification failed:", resultAction.payload);
      }
    } catch (error) {
      console.error("❗ Error during OTP verification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      otpDigits.join("").length === 4 &&
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
    // Show success toast
    showToast("OTP verified successfully!", "success");

    // Start redirect process after a brief delay
    setTimeout(() => {
      setIsRedirecting(true);

      // Show redirecting toast
      setTimeout(() => {
        hideToast();
        showToast("Redirecting to home...", "success");
      }, 500);

      // Navigate to home page after showing redirect message
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    }, 1000);
  };

  const handleStatusChange = (currentStatus) => {
    if (currentStatus === "succeeded" || currentStatus === "failed") {
      const elapsed = Date.now() - loadingStartTime;
      const minLoadingTime = 1500; // Reduced to 1.5 seconds for better UX

      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      setTimeout(() => {
        setIsLoading(false);

        if (currentStatus === "succeeded") {
          handleSuccessfulRedirect();
        } else if (currentStatus === "failed") {
          showToast(error || "Invalid OTP. Please try again.", "error");
          // Reset OTP inputs on failure
          setOtpDigits(["", "", "", ""]);
          inputsRef.current[0].current.focus();
        }
      }, remainingTime);
    }
  };

  useEffect(() => {
    if (isLoading && (status === "succeeded" || status === "failed")) {
      handleStatusChange(status);
    }
  }, [status, isLoading, dispatch, navigate, error, loadingStartTime]);

  // Auto-focus first input on component mount
  useEffect(() => {
    if (inputsRef.current[0].current) {
      inputsRef.current[0].current.focus();
    }
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-[#E3E5FC66]">
        <div
          className={`bg-white rounded-2xl px-8 pb-8 pt-4 w-full max-w-md text-center space-y-6 transition-all duration-300 ${
            isRedirecting ? "scale-95 opacity-80" : "scale-100 opacity-100"
          }`}
          style={{
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div
            onClick={() => navigate(-1)} // navigate back
            className="top-6 left-6 text-sm text-black cursor-pointer flex items-center gap-1 mb-1 font-semibold"
          >
            <span className="text-xl">←</span> Back
          </div>

          <h2
            className="font-semibold text-gray-900"
            style={{ fontSize: "28px", marginBottom: "8px" }}
          >
            Verify OTP
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            4 digit OTP has been sent to{" "}
            <span className="font-medium text-gray-700">{identifier}</span>
          </p>

          {/* ✅ OTP Inputs */}
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
              isLoading || isRedirecting || otpDigits.join("").length !== 4
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
            <a
              href="#"
              className="text-purple-600 underline hover:text-purple-800 transition-colors"
              style={{ color: "rgba(82, 61, 150, 1)" }}
            >
              Resend OTP
            </a>
          </p>

          <div className="flex items-center justify-center space-x-2">
            <hr className="w-full border-gray-300" />
            <span className="text-gray-400 text-sm">or</span>
            <hr className="w-full border-gray-300" />
          </div>

          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <FontAwesomeIcon
                icon={faFacebook}
                className="text-[#1877F2] w-5 h-5"
              />
              Continue with Facebook
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-full px-4 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ height: "48px", border: "1px solid #757575" }}
              disabled={isLoading || isRedirecting}
            >
              <FontAwesomeIcon icon={faApple} className="w-5 h-5" />
              Continue with Apple
            </button>
          </div>
        </div>
      </div>
      <Footer />
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default OtpVerification;
