import React, { useEffect, useRef, useState, useMemo, useCallback, Suspense, memo } from "react";
import Navbar from "../Components/Navbar/navbar";
import { AlarmClock, ChevronDown, Heart, Share2, Star } from "lucide-react";
import lowes from "../assets/images/lowes.png";
import homedepot from "../assets/images/homedepot.png";
import offericon from "../assets/images/offericon.png";
import location from "../assets/images/location.png";
import truck from "../assets/images/truck.png";
import informationCircle from "../assets/images/informationCircle.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductDetail } from "../Redux/Reducers/ProductDetailSlice";
import { useNavigate, useParams } from "react-router-dom";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ClipLoader } from "react-spinners";

// Lazy loaded sections with better loading states
const RecentlyViewed = React.lazy(() => import("../Components/RecentlyViewed/RecentlyViewed"));
const SimilarProducts = React.lazy(() => import("../Components/Similar Products/SimilarProducts"));
const Footer = React.lazy(() => import("../Components/Footer/Footer"));
// const ProductDetails = React.lazy(() => import("./ProductDetail")); // Assuming extracted to separate file for code splitting
// const RelatedSearches = React.lazy(() => import("./RelatedSearches")); // Assuming extracted to separate file for code splitting

// Memoized subcomponents
const ProductImage = memo(({ product }) => (
  <div className="flex-1 bg-white rounded-lg shadow p-6 w-full relative">
    <div className="absolute top-4 right-4 flex space-x-3 z-10">
      <button className="p-2 rounded-xl hover:shadow-md cursor-pointer">
        <Share2 className="w-5 h-5 text-black" />
      </button>
      <button className="p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
        <Heart className="w-5 h-5 text-black" />
      </button>
    </div>
    <img
      src={product.images?.[0] || "/placeholder.jpg"}
      alt={product.title}
      className="object-contain w-full h-auto"
      decoding="async" // Keep async decoding but load eagerly for main image
    />
  </div>
));

const RetailerCard = memo(({ offer, renderStars }) => (
  <div className="border rounded-lg p-4 shadow-sm bg-white space-y-2 border-purple-700">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <img
          src={offer.store === "Lowe's" ? lowes : homedepot}
          alt={offer.store}
          className="h-5 w-auto"
          loading="lazy"
          decoding="async"
        />
        <span className="font-semibold text-gray-800">{offer.productTitle}</span>
        <span className="text-xl font-bold">${offer.price}</span>
        {offer.listPrice && (
          <span className="text-sm line-through text-gray-400">${offer.listPrice}</span>
        )}
        {offer.savings > 0 && (
          <span className="text-green-600 text-xs font-medium ml-2">
            Save ${offer.savings}
          </span>
        )}
      </div>
      {offer.offers > 0 && (
        <div className="flex flex-col items-end text-xs text-purple-700">
          <span className="flex items-center gap-1">
            {offer.offers} Offers <ChevronDown className="h-4 w-4" />
          </span>
          <img src={offericon} alt="Offer icon" className="mt-1 h-4" loading="lazy" decoding="async" />
        </div>
      )}
    </div>

    <div className="text-sm text-gray-700 space-y-1">
      <span className="flex items-center">
        {renderStars(offer.reviewScore)}
        <span className="ml-4 text-[14px] font-normal text-gray-500">
          {offer.reviewCount || 0} Reviews
        </span>
      </span>

      <div className="pt-4 pb-4">
        <p className="mb-0 flex items-center gap-2">
          <img src={location} alt="Location" className="w-4 h-4" loading="lazy" decoding="async" />
          Nearby store:{" "}
          <span className="text-blue-600 underline">{offer.storeLocation}</span>{" "}
          ({offer.distance})
          <span className="ml-2 text-green-700 flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
            {offer.stockStatus}
          </span>
        </p>
        <p className="flex items-center gap-2 mt-2 mb-0">
          <img src={truck} alt="truck" className="w-4 h-4" loading="lazy" decoding="async" />
          {offer.delivery}
          <button className="w-5 h-5 rounded-full bg-[#E3E5FC] text-gray-700 text-xs flex items-center justify-center hover:bg-gray-300">
            <img src={informationCircle} alt="Info" className="w-3 h-3 object-contain" />
          </button>
        </p>
      </div>
    </div>

    <button
      onClick={() => window.open(offer.url, "_blank")}
      className="w-full bg-purple-700 text-white py-2 rounded-full font-semibold hover:bg-purple-800 transition-colors cursor-pointer"
    >
      Buy Now
    </button>
  </div>
));

const ProductDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const sortOptions = useMemo(() => ["Lowest Price", "Highest Price"], []);
  const [selectedOption, setSelectedOption] = useState(sortOptions[0]);
  const navigate = useNavigate();
  const { product, loading, error } = useSelector(
    (state) => state.productDetails
  );

  // Debounced localStorage save to reduce blocking operations
  const saveToLocalStorage = useCallback((productData) => {
    // Use requestIdleCallback for non-critical localStorage operations
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        try {
          const viewed = JSON.parse(localStorage.getItem("viewedProducts") || "[]");
          if (!viewed.some((p) => p.productId === productData.productId)) {
            const productToStore = {
              productId: productData.productId,
              name: productData.title,
              rating: productData.rating || 0,
              images: productData.images?.slice(0, 1) || [],
              timestamp: Date.now(),
            };
            const updated = [productToStore, ...viewed].slice(0, 10);
            localStorage.setItem("viewedProducts", JSON.stringify(updated));
            localStorage.setItem("recentlyViewed", JSON.stringify(updated));
          }
        } catch (err) {
          console.error("localStorage error:", err);
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        try {
          const viewed = JSON.parse(localStorage.getItem("viewedProducts") || "[]");
          if (!viewed.some((p) => p.productId === productData.productId)) {
            const productToStore = {
              productId: productData.productId,
              name: productData.title,
              rating: productData.rating || 0,
              images: productData.images?.slice(0, 1) || [],
              timestamp: Date.now(),
            };
            const updated = [productToStore, ...viewed].slice(0, 10);
            localStorage.setItem("viewedProducts", JSON.stringify(updated));
            localStorage.setItem("recentlyViewed", JSON.stringify(updated));
          }
        } catch (err) {
          console.error("localStorage error:", err);
        }
      }, 0);
    }
  }, []);

  // Fetch product with error boundary
  useEffect(() => {
    if (id) {
      dispatch(fetchProductDetail(id));
    }
  }, [id, dispatch]);

  // Save to localStorage (non-blocking)
  useEffect(() => {
    if (product?.productId) {
      saveToLocalStorage(product);
    }
  }, [product?.productId, saveToLocalStorage]);

  // Optimized sorting with early return
  const sortedRetailers = useMemo(() => {
    if (!product?.retailers?.length) return [];
    
    if (selectedOption === "Lowest Price") {
      return [...product.retailers].sort((a, b) => a.price - b.price);
    }
    if (selectedOption === "Highest Price") {
      return [...product.retailers].sort((a, b) => b.price - a.price);
    }
    return product.retailers;
  }, [product?.retailers, selectedOption]);

  // Memoize star render with better performance
  const renderStars = useCallback(
    (rating) => (
      <div className="flex items-center space-x-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm text-black-500 ml-1">{rating || 0}/5</span>
      </div>
    ),
    []
  );

  // Optimized dropdown handler
  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen, handleClickOutside]);

  // Early returns for better performance
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white/60 flex items-center justify-center">
        <ClipLoader color="#5F43B2" size={50} />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 py-10">{error}</p>;
  }

  if (!product) {
    return <div className="text-center py-10">Product not found</div>;
  }

  return (
    <>
      <Navbar />

      {/* Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto px-4 pt-[45px] py-6">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">
            <div className="flex items-center">
              {/* Back Button */}
              <span
                className="flex items-center cursor-pointer text-[16px] font-semibold text-[#070707]"
                onClick={() => navigate(-1)} // navigate back
              >
                ← Back
              </span>

              {/* Divider */}
              <span className="mx-2 text-gray-400">|</span>

              {/* Breadcrumb Links */}
              <span
                className="cursor-pointer hover:underline font-normal"
                onClick={() => navigate("/")}
              >
                Home
              </span>
              <span className="mx-2 text-gray-400">/</span>

              <span
                className="cursor-pointer hover:underline font-normal"
                // onClick={() => navigate("/tools-equipment")}
              >
                Tools & Equipments
              </span>
              <span className="mx-2 text-gray-400">/</span>

              <span
                className="cursor-pointer hover:underline font-normal text-[#070707]"
                // onClick={() => navigate("/drills")}
              >
                Drills
              </span>
            </div>
          </div>
          <h1 className="font-bold text-gray-800 leading-snug text-2xl md:text-3xl">
            {product.title}
          </h1>
          {product.model && <p className="text-sm text-gray-600">Model {product.model}</p>}
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-700 whitespace-nowrap mt-4 md:mt-0">
          <button className="flex items-center gap-1 hover:text-black font-bold cursor-pointer">
            <AlarmClock /> Set Price Alert
          </button>
          <label className="flex font-bold items-center gap-2 cursor-pointer hover:text-black">
            Add to Compare
            <input 
              type="checkbox" 
              className="form-checkbox accent-purple-600 cursor-pointer"
              aria-label="Add to comparison list"
            />
          </label>
        </div>
      </div>

      {/* Product & Offers */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        <ProductImage product={product} />

        {/* Retailers */}
        <div className="flex-[1.5] w-full space-y-4 bg-[#E3E5FC66] p-6 rounded-2xl">
          <div className="flex justify-end mb-4" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center bg-white space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors rounded border border-purple-700"
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>{selectedOption}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setSelectedOption(option);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {sortedRetailers.map((offer, idx) => (
            <RetailerCard key={`${offer.store}-${idx}`} offer={offer} renderStars={renderStars} />
          ))}
        </div>
      </div>

      {/* Lazy load sections with optimized fallbacks and separate Suspense for progressive loading */}
      {/* <Suspense 
        fallback={
          <div className="max-w-7xl mx-auto px-4">
            <div className="animate-pulse space-y-6 py-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        }
      >
        <ProductDetails product={product} />
      </Suspense> */}

      <Suspense 
        fallback={
          <div className="max-w-7xl mx-auto px-4">
            <div className="animate-pulse space-y-6 py-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <SimilarProducts />
      </Suspense>

      {/* <Suspense 
        fallback={
          <div className="w-full max-w-7xl mx-auto p-4 mt-10">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="flex flex-wrap gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <RelatedSearches />
      </Suspense> */}

      <Suspense 
        fallback={
          <div className="max-w-7xl mx-auto px-4">
            <div className="animate-pulse space-y-6 py-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <RecentlyViewed />
      </Suspense>

      <Suspense fallback={<div className="h-32 bg-gray-200 animate-pulse"></div>}>
        <Footer />
      </Suspense>
    </>
  );
};

// Add display names for better debugging
ProductImage.displayName = 'ProductImage';
RetailerCard.displayName = 'RetailerCard';

export default ProductDetailsPage;
