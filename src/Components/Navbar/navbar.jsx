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
import { logout as otpLogout } from "../../Redux/Reducers/OtpSlice";
import { resetOTPState } from "../../Redux/Reducers/OtpSlice";
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
    "#F59E0B", "#10B981", "#3B82F6", "#EC4899",
    "#8B5CF6", "#F97316", "#14B8A6", "#EF4444", "#22C55E",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
  const handleCategorySelect = (category) => {
    navigate(`/filter?query=${encodeURIComponent(category)}`);
  };
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Update both redux states
    dispatch(loginLogout());
    dispatch(otpLogout());

    setIsProfileOpen(false);
    resetOTPState(); // Reset OTP state
    navigate("/login");
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

  return (
    <nav
      className="shadow-sm border-b border-gray-200 sticky top-0 z-50"
      style={{ backgroundColor: "#443778" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img src={italic} alt="Logo" className="w-32 h-8 object-contain" />
          </div>

          {/* Location */}
          <div className="hidden md:flex items-center space-x-2 text-white">
            <img src={location2} alt="Location Icon" />
            <span className="text-sm font-medium">14304</span>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center gap-6 text-white">
            {/* All Categories Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                <span>All Categories</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
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
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleCategorySelect(category);
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>


            <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-white cursor-pointer">
              <Flame className="h-4 w-4" />
              <span>Hot Deals</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-white cursor-pointer">
              <GitCompare className="h-4 w-4" />
              <span>Compare Product</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 text-white cursor-pointer">
              <AlarmClockCheck className="h-4 w-4" />
              <span>Price Alert</span>
            </button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center relative">
              <button className="flex items-center justify-center w-10 h-10 text-white transition-colors duration-200 cursor-pointer">
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="hidden md:flex items-center relative">
              <button className="flex items-center justify-center w-10 h-10 text-white relative cursor-pointer">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-white rounded-full border-2 border-[#443778]"></span>
              </button>
            </div>

            {/* Login / Profile */}
            {isLoggedIn ? (
              <div className="relative" ref={profileRef}>
                {/* Avatar button (image or initials) */}
                <button
                  onClick={() => setIsProfileOpen((s) => !s)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-white flex items-center justify-center select-none"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                >
                  {user?.image || user?.profileImage ? (
                    <img
                      src={user.image || user.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="w-full h-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: avatarColor(user?.name || user?.fullName || "User") }}
                      aria-hidden="true"
                    >
                      {getInitials(user?.name || user?.fullName)}
                    </span>
                  )}
                </button>

                {/* Profile dropdown */}
                {isProfileOpen && (
                  <div
                    className="absolute right-0 mt-3 w-72 rounded-2xl bg-white shadow-xl border border-gray-200 z-[60]"
                    role="menu"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3">
                      <span className="text-xl font-extrabold text-gray-900">
                        {user?.name || user?.fullName || "User"}
                      </span>
                      <div className="h-9 w-9 rounded-full ring-2 ring-white shadow-sm overflow-hidden flex items-center justify-center">
                        {user?.image || user?.profileImage ? (
                          <img
                            src={user.image || user.profileImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            className="h-full w-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{ backgroundColor: avatarColor(user?.name || user?.fullName || "User") }}
                          >
                            {getInitials(user?.name || user?.fullName)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="px-2 pb-3">
                      {/* <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/wishlist");
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-medium text-gray-900 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Wishlist
                      </button> */}

                      {/* <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          navigate("/coupons");
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-medium text-gray-900 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Coupons &amp; Offers
                      </button> */}

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-lg text-lg font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
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
                className="bg-white text-black px-6 py-2 rounded-full flex items-center space-x-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Login/Sign Up</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 bg-white">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2 text-gray-700 px-4 py-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm font-medium">14304</span>
              </div>

              <div className="flex flex-col">
                <button className="flex items-center justify-between text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <span>All Categories</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                <button className="flex items-center text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <Flame className="h-4 w-4 mr-3" />
                  <span>Hot Deals</span>
                </button>

                <button className="flex items-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <GitCompare className="h-4 w-4 mr-3" />
                  <span>Compare Product</span>
                </button>

                <button className="flex items-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <Bell className="h-4 w-4 mr-3" />
                  <span>Price Alert</span>
                </button>

                <button className="flex items-center text-gray-700 hover:bg-gray-100 px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer">
                  <Heart className="h-4 w-4 mr-3" />
                  <span>Wishlist</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;