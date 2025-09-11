import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  Suspense,
  memo,
} from "react";
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
import { fetchNearestLowesStore } from "../Redux/Reducers/lowesstore";
import { fetchNearestStore } from "../Redux/Reducers/NearestStoreSlice";
import { addToWishlist, removeFromWishlist } from "../Redux/Reducers/WishlistSlice";
import { toast } from "react-hot-toast";
import { toggleCompare } from "../Redux/Reducers/CompareSlice";
import { fetchSimilarProducts } from "../Redux/Reducers/SimilarProductSlice";
// Lazy loaded sections with better loading states
const RecentlyViewed = React.lazy(() =>
  import("../Components/RecentlyViewed/RecentlyViewed")
);
const SimilarProducts = React.lazy(() =>
  import("../Components/Similar Products/SimilarProducts")
);
const Footer = React.lazy(() => import("../Components/Footer/Footer"));

// Memoized subcomponents
const ProductImage = memo(({ product, handleWishlistToggle, isInWishlist }) => (
  <div className="flex-1 bg-white rounded-lg shadow p-6 w-full relative">
    <div className="absolute top-4 right-4 flex space-x-3 z-10">
      <button className="p-2 rounded-xl hover:shadow-md cursor-pointer">
        <Share2 className="w-5 h-5 text-black" />
      </button>
      <button
        onClick={(e) => handleWishlistToggle(e, product.productId)}
        className={`p-2 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${isInWishlist(product.productId)
          ? "bg-red-100 hover:bg-red-200"
          : "bg-[#E3E5FC] hover:bg-[#D1D5F7]"
          }`}
      >
        {isInWishlist(product.productId) ? (
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        ) : (
          <Heart className="w-5 h-5 text-black" />
        )}
      </button>
    </div>
    <img
      src={product.images?.[0] || "/placeholder.jpg"}
      alt={product.title}
      className="object-contain w-full h-auto"
      loading="lazy"
      decoding="async"
    />
  </div>
));


const RetailerCard = memo(({ offer, renderStars }) => {
  const dispatch = useDispatch();

  // Get both store data from Redux
  const {
    store: homeDepotStore,
    loading: homeDepotLoading,
    error: homeDepotError,
  } = useSelector((state) => state.nearestStore);

  const {
    store: lowesStore,
    loading: lowesLoading,
    error: lowesError,
  } = useSelector((state) => state.nearestLowesStore);

  // Debug logs
  console.log("RetailerCard mounted for:", offer.store);
  console.log("Home Depot store from Redux:", homeDepotStore);
  console.log("Nearest Lowe's store from Redux:", lowesStore);

  // Dispatch appropriate thunk based on store type
  useEffect(() => {
    if (offer.store === "Lowe's") {
      dispatch(fetchNearestLowesStore());
    } else if (offer.store === "Home Depot") {
      dispatch(fetchNearestStore());
    }
  }, [dispatch, offer.store]);

  // Normalize data for rendering
  const getCurrentStoreData = () => {
    if (offer.store === "Lowe's") {
      return {
        storeData: lowesStore,
        loading: lowesLoading,
        error: lowesError,
        displayStore: lowesStore
          ? {
            address: `${lowesStore.street_address}, ${lowesStore.city}, ${lowesStore.zip_state} ${lowesStore.zipcode}`,
            store_id: lowesStore.store_no,
            distance: lowesStore.calculatedDistance
              ? lowesStore.calculatedDistance.toFixed(1)
              : null,
            name: lowesStore.store_name,
          }
          : null,
      };
    } else {
      return {
        storeData: homeDepotStore,
        loading: homeDepotLoading,
        error: homeDepotError,
        displayStore: homeDepotStore
          ? {
            ...homeDepotStore,
            distance: homeDepotStore.calculatedDistance
              ? homeDepotStore.calculatedDistance.toFixed(1)
              : homeDepotStore.distance,
          }
          : null,
      };
    }
  };

  const { loading, error, displayStore } = getCurrentStoreData();

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white space-y-2 border-purple-700">
      <div className="flex justify-between items-start">
        {/* LEFT: Store + Title */}
        <div className="flex items-start space-x-2 flex-1">
          <img
            src={offer.store === "Lowe's" ? lowes : homedepot}
            alt={offer.store}
            className="h-5 w-auto mt-1"
            loading="lazy"
            decoding="async"
          />
          <span className="font-semibold text-gray-800">
            {offer.productTitle}
          </span>
        </div>

        {/* RIGHT: Price + Savings + Offers */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold">${offer.price}</span>

            {offer.listPrice && offer.listPrice > offer.price && (
              <>
                <span className="text-sm line-through text-gray-400">
                  ${offer.listPrice}
                </span>
                <span className="text-green-600 text-xs font-medium">
                  Save ${(offer.listPrice - offer.price).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {offer.offers > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-purple-700">
              {offer.offers} Offers <ChevronDown className="h-4 w-4" />
              <img
                src={offericon}
                alt="Offer icon"
                className="h-4"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>
      </div>

      {/* Reviews + Store Info */}
      <div className="text-sm text-gray-700 space-y-1">
        <span className="flex items-center">
          {renderStars(offer.reviewScore)}
          <span className="ml-4 text-[14px] font-normal text-gray-500">
            {offer.reviewCount || 0} Reviews
          </span>
        </span>

        <div className="pt-4 pb-4">
          {/* Store-specific data display */}
          {loading ? (
            <p className="text-gray-400 text-sm">
              Detecting nearest {offer.store} store...
            </p>
          ) : error ? (
            <p className="text-red-500 text-sm">
              Error finding {offer.store} store: {error}
            </p>
          ) : displayStore ? (
            <div className="mb-0 flex flex-col gap-1">
              <p className="flex items-center gap-2">
                <img
                  src={location}
                  alt="Location"
                  className="w-4 h-4"
                  loading="lazy"
                  decoding="async"
                />
                Nearby {offer.store} store:{" "}
                <span className="text-blue-600 underline">
                  {displayStore.address}
                </span>
                <span className="ml-2 text-gray-500">
                  ({displayStore.distance ? `${displayStore.distance} miles` : "N/A"})
                </span>
                <span className="ml-2 text-green-700 flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                  {offer.stockStatus}
                </span>
              </p>

              <p className="text-gray-600 text-xs ml-6">
                Store ID:{" "}
                <span className="font-semibold">{displayStore.store_id}</span>
                {offer.store === "Lowe's" && displayStore.name && (
                  <span className="ml-2">({displayStore.name})</span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              No {offer.store} store found in your area
            </p>
          )}

          {/* Delivery */}
          <p className="flex items-center gap-2 mt-2 mb-0">
            <img
              src={truck}
              alt="truck"
              className="w-4 h-4"
              loading="lazy"
              decoding="async"
            />
            {offer.delivery}
            <button className="w-5 h-5 rounded-full bg-[#E3E5FC] text-gray-700 text-xs flex items-center justify-center hover:bg-gray-300">
              <img
                src={informationCircle}
                alt="Info"
                className="w-3 h-3 object-contain"
              />
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
  );
});
const ProductDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.otp);
  const [localWishlist, setLocalWishlist] = useState([]);
  const isInWishlist = (productId) => localWishlist.includes(productId);


  const sortOptions = useMemo(() => ["Lowest Price", "Highest Price"], []);
  const [selectedOption, setSelectedOption] = useState(sortOptions[0]);
  const navigate = useNavigate();
  const { product, loading, error } = useSelector(
    (state) => state.productDetails
  );

  const handleWishlistToggle = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please login first to use wishlist!");
      return;
    }

    if (isInWishlist(productId)) {
      setLocalWishlist((prev) => prev.filter((id) => id !== productId));
      dispatch(removeFromWishlist(productId));
    } else {
      setLocalWishlist((prev) => [...prev, productId]);
      dispatch(addToWishlist(productId));
    }
  };
  const { selected } = useSelector((state) => state.compare);

  const handleCompareToggle = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please login first to use compare!");
      return;
    }

    dispatch(toggleCompare(productId));
  };

  const fetchedRef = useRef(null);
  // Debounced localStorage save to reduce blocking operations
  const saveToLocalStorage = useCallback((productData) => {
    // Use requestIdleCallback for non-critical localStorage operations
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        try {
          const viewed = JSON.parse(
            localStorage.getItem("viewedProducts") || "[]"
          );
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
          const viewed = JSON.parse(
            localStorage.getItem("viewedProducts") || "[]"
          );
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

  useEffect(() => {
    if (id && fetchedRef.current !== id) {
      // Parallel API calls - both will start at the same time
      dispatch(fetchProductDetail(id));
      dispatch(fetchSimilarProducts(id)); // Add this line to fetch similar products in parallel
      fetchedRef.current = id;
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
          {product.model && (
            <p className="text-sm text-gray-600">Model {product.model}</p>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-700 whitespace-nowrap mt-4 md:mt-0">
          <button className="flex items-center gap-1 hover:text-black font-bold cursor-pointer">
            <AlarmClock /> Set Price Alert
          </button>
          <label
            className="flex font-bold items-center gap-2 cursor-pointer hover:text-black"
            onClick={(e) => handleCompareToggle(e, product.productId)}
          >
            <input
              type="checkbox"
              checked={selected.includes(product.productId)}
              readOnly
              className="form-checkbox accent-purple-600 cursor-pointer"
            />
            Add to Compare
          </label>

        </div>
      </div>

      {/* Product & Offers */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        <ProductImage
          product={product}
          handleWishlistToggle={handleWishlistToggle}
          isInWishlist={isInWishlist}
        />

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
                className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                  }`}
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
            <RetailerCard
              key={`${offer.store}-${idx}`}
              offer={offer}
              renderStars={renderStars}
            />
          ))}
        </div>
      </div>

      {/* Product Details */}
      <ProductDetails product={product} />

      {/* Lazy load sections with optimized fallbacks */}
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
        <RelatedSearches />
        <RecentlyViewed />
        <Footer />
      </Suspense>
    </>
  );
};

// Extracted and memoized ProductDetails component
const ProductDetails = memo(({ product }) => (
  <div className="max-w-7xl mx-auto px-4 mt-10 bg-white p-6">
    <h3 className="text-2xl font-bold mb-4">Product Details</h3>
    <p className="text-gray-600 text-[16px] mb-4">
      Compare prices for <span className="font-semibold">{product.title}</span>{" "}
      across multiple stores. Find the best deals, check availability, and view
      specifications before you buy.
    </p>

    {product.model && (
      <p className="text-gray-700 mb-4">
        <span className="font-medium">Model:</span> {product.model}
      </p>
    )}

    {product.specifications &&
      Object.keys(product.specifications).length > 0 && (
        <div className="overflow-hidden border rounded-lg divide-y divide-gray-200 mb-4">
          {Object.entries(product.specifications).map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-3 text-sm border-b last:border-none"
            >
              <div className="px-4 py-3 font-medium text-gray-700 bg-gray-100 border-r border-gray-200">
                {key}
              </div>
              <div className="col-span-2 px-4 py-3 text-gray-800">{value}</div>
            </div>
          ))}
        </div>
      )}

    <ul className="list-disc list-inside text-gray-700">
      <li>
        Compare prices from {product.retailers?.length || 0} stores in real
        time.
      </li>
      <li>Check stock availability and nearby store locations.</li>
      <li>View ratings and reviews to make informed decisions.</li>
      <li>Click "Buy Now" to purchase directly from the retailer.</li>
    </ul>
  </div>
));

// Extracted and memoized RelatedSearches component
const RelatedSearches = memo(() => {
  const navigate = useNavigate();
  const searchTerms = useMemo(
    () => [
      "Tools",
      "Bathroom",
      "Furniture",
      "Dining",
      "Outdoor",
      "Ceiling",
      "Electrical",
      "Plumbing",
      "Hardware",
    ],
    []
  );
  const handleCategoryClick = (category) => {
    // Navigate to search page with category as query param
    navigate(`/filter?query=${encodeURIComponent(category)}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Related Searches
      </h2>
      <div className="flex flex-wrap gap-4">
        {searchTerms.map((term) => (
          <button
            key={term}
            onClick={() => handleCategoryClick(term)}
            className="px-4 py-2 border border-black rounded-full text-sm text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
});

// Add display names for better debugging
ProductImage.displayName = "ProductImage";
RetailerCard.displayName = "RetailerCard";
ProductDetails.displayName = "ProductDetails";
RelatedSearches.displayName = "RelatedSearches";

export default ProductDetailsPage;
