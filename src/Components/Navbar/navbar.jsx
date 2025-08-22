import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  ChevronDown,
  Flame,
  GitCompare,
  Bell,
  Heart,
  User,
  AlarmClockCheck,
  Menu,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout as loginLogout } from "../../Redux/Reducers/LoginSlice";
import { logout as otpLogout, resetOTPState } from "../../Redux/Reducers/OtpSlice";
import location2 from "../../assets/images/location2.png";
import italic from "../../assets/images/ITALIC.png";

/* ---------- helpers for avatar initials & color ---------- */
const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const avatarColor = (name = "") => {
  const colors = [
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#EC4899",
    "#8B5CF6",
    "#F97316",
    "#14B8A6",
    "#EF4444",
    "#22C55E",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Function to get a higher resolution Google profile image
const getHighResImage = (imageUrl) => {
  if (!imageUrl) return null;
  // Replace s96-c with s200-c for higher resolution
  return imageUrl.replace(/=s\d+-c$/, '=s200-c');
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ✅ Read from OTP slice where the actual user data is stored
  const { user, isAuthenticated } = useSelector((state) => state.otp);
  const isLoggedIn = isAuthenticated;

  console.log("User from OTP slice:", user);
  console.log("Is Authenticated:", isAuthenticated);

  /* close both dropdowns on outside click */
  useEffect(() => {
    const handleClickOutside = (evt) => {
      if (dropdownRef.current && !dropdownRef.current.contains(evt.target)) {
        setIsDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(evt.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset image states when user changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [user?.image]);

  const handleCategorySelect = (category) => {
    navigate(`/filter?query=${encodeURIComponent(category)}`);
    setIsDropdownOpen(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    console.log('Profile image loaded successfully');
  };

  const handleImageError = (e) => {
    console.error('Profile image failed to load:', e.target.src);
    setImageError(true);
    setImageLoading(false);
  };

  const handleLogout = async () => {
    try {
      console.log('Logout initiated...');
      
      // Clear localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("authToken"); // In case you use this key too
      
      // Reset Redux states
      dispatch(loginLogout());
      dispatch(otpLogout());
      dispatch(resetOTPState());
      
      // Close dropdown
      setIsProfileOpen(false);
      
      // Reset component states
      setImageError(false);
      setImageLoading(true);
      
      console.log('Logout completed, navigating to login...');
      
      // Navigate to login page
      navigate("/login", { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if there's an error
      navigate("/login", { replace: true });
    }
  };

  const categories = [
    "Tools",
    "Bathroom",
    "Furniture",
    "Dining",
    "Outdoor",
    "Ceiling",
    "Electrical",
    "Plumbing",
    "Hardware",
  ];

  // Profile Avatar Component
  const ProfileAvatar = ({ size = "w-10 h-10", textSize = "font-semibold", showBorder = true }) => {
    const highResImage = getHighResImage(user?.image);
    const borderClass = showBorder ? "border-2 border-white" : "";
    
    if (user?.image && !imageError) {
      return (
        <div className={`${size} rounded-full overflow-hidden ${borderClass} flex items-center justify-center relative bg-gray-200`}>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          )}
          <img
            src={highResImage || user.image}
            alt={user?.name || "Profile"}
            className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
      );
    }

    // Fallback to initials
    return (
      <div
        className={`${size} rounded-full ${borderClass} flex items-center justify-center text-white ${textSize} select-none`}
        style={{
          backgroundColor: avatarColor(user?.name || "User"),
        }}
      >
        {getInitials(user?.name || user?.fullName)}
      </div>
    );
  };

  return (
    <nav
      className="shadow-sm border-b border-gray-200 sticky top-0 z-50"
      style={{ backgroundColor: "#443778" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src={italic}
              alt="Logo"
              className="w-32 h-8 object-contain cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>

          {/* Location */}
          <div className="hidden md:flex items-center space-x-2 text-white">
            <img src={location2} alt="Location Icon" className="w-4 h-4" />
            <span className="text-sm font-medium">14304</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center gap-6 text-white">
            {/* All Categories Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-white hover:bg-opacity-20 cursor-pointer"
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
              >
                <span>All Categories</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {categories.map((category, index) => (
                      <button
                        key={index}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
                        onClick={() => handleCategorySelect(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-white hover:bg-opacity-20 text-white cursor-pointer">
              <Flame className="h-4 w-4" />
              <span>Hot Deals</span>
            </button>

            <button
              onClick={() => navigate("/compare")}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-white hover:bg-opacity-20 text-white cursor-pointer"
            >
              <GitCompare className="h-4 w-4" />
              <span>Compare Product</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-white hover:bg-opacity-20 text-white cursor-pointer">
              <AlarmClockCheck className="h-4 w-4" />
              <span>Price Alert</span>
            </button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center relative">
              <button
                onClick={() => navigate("/wishlist")}
                className="flex items-center justify-center w-10 h-10 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors duration-200 cursor-pointer"
                title="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="hidden md:flex items-center relative">
              <button
                className="flex items-center justify-center w-10 h-10 text-white hover:bg-white hover:bg-opacity-20 rounded-full relative cursor-pointer transition-colors duration-200"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#443778]"></span>
              </button>
            </div>

            {/* Login / Profile */}
            {isLoggedIn && user ? (
              <div className="relative" ref={profileRef}>
                {/* Avatar button */}
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="select-none cursor-pointer hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  title={`Profile: ${user?.name || user?.fullName || 'User'}`}
                >
                  <ProfileAvatar />
                </button>

                {/* Profile dropdown */}
                {isProfileOpen && (
                  <div
                    className="absolute right-0 mt-3 w-72 rounded-2xl bg-white shadow-xl border border-gray-200 z-[60]"
                    role="menu"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xl font-extrabold text-gray-900 block truncate">
                          {user?.name || user?.fullName || "User"}
                        </span>
                        <span className="text-sm text-gray-600 block truncate">
                          {user?.email}
                        </span>
                      </div>
                      <div className="ml-3">
                        <ProfileAvatar size="h-12 w-12" textSize="text-sm font-semibold" />
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="px-2 pb-3">
                      {/* Wishlist Button */}
                      {/* <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/wishlist");
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-medium text-gray-900 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                        role="menuitem"
                      >
                        Wishlist
                      </button> */}

                      {/* Profile Button */}
                      {/* <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/profile");
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-medium text-gray-900 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                        role="menuitem"
                      >
                        My Profile
                      </button> */}

                      {/* Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-semibold text-red-600 hover:bg-red-50 cursor-pointer transition-colors duration-200"
                        role="menuitem"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-black px-6 py-2 rounded-full flex items-center space-x-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-100 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Login/Sign Up</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 text-white hover:bg-white hover:bg-opacity-20 rounded-md transition-colors duration-200 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="Toggle mobile menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 bg-white">
            <div className="flex flex-col space-y-2">
              {/* Mobile Location */}
              <div className="flex items-center space-x-2 text-gray-700 px-4 py-2">
                <img src={location2} alt="Location" className="w-4 h-4" />
                <span className="text-sm font-medium">14304</span>
              </div>

              <div className="flex flex-col">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer"
                >
                  <span>All Categories</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                <button className="flex items-center text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <Flame className="h-4 w-4 mr-3" />
                  <span>Hot Deals</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/compare");
                  }}
                  className="flex items-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer"
                >
                  <GitCompare className="h-4 w-4 mr-3" />
                  <span>Compare Product</span>
                </button>

                <button className="flex items-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <Bell className="h-4 w-4 mr-3" />
                  <span>Price Alert</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/wishlist");
                  }}
                  className="flex items-center text-gray-700 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer"
                >
                  <Heart className="h-4 w-4 mr-3" />
                  <span>Wishlist</span>
                </button>

                {/* Mobile Profile/Login */}
                {isLoggedIn && user ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer"
                  >
                    <User className="h-4 w-4 mr-3" />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/login");
                    }}
                    className="flex items-center text-gray-700 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer"
                  >
                    <User className="h-4 w-4 mr-3" />
                    <span>Login/Sign Up</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;