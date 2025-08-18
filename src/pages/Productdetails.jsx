import React, { useEffect, useRef, useState } from "react";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import RecentlyViewed from "../Components/RecentlyViewed/RecentlyViewed";
import SimilarProducts from "../Components/Similar Products/SimilarProducts";
import { AlarmClock, ChevronDown, Heart, Share2, Star } from "lucide-react";
import lowes from "../assets/images/lowes.png";
import homedepot from "../assets/images/homedepot.png";
import offericon from "../assets/images/offericon.png";
import location from "../assets/images/location.png";
import truck from "../assets/images/truck.png";
import informationCircle from "../assets/images/informationCircle.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductDetail } from "../Redux/Reducers/ProductDetailSlice";
import { useParams } from "react-router-dom";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ClipLoader } from "react-spinners";

const ProductDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const sortOptions = ["Lowest Price", "Highest Price"];
  const [selectedOption, setSelectedOption] = useState(sortOptions[0]);

  const { product, loading, error } = useSelector(
    (state) => state.productDetails
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchProductDetail(id));
    }
  }, [id, dispatch]);

  // Enhanced localStorage handling with better error checking and debugging
  useEffect(() => {
    if (product?.productId && id) {
      try {
        // Check if localStorage is available
        if (typeof Storage === "undefined") {
          console.warn("localStorage is not supported in this browser");
          return;
        }

        // Check if we're in a secure context (HTTPS in production)
        if (typeof window !== "undefined" && window.localStorage) {
          console.log("Saving product to localStorage:", product.productId);
          
          const viewedProducts = JSON.parse(localStorage.getItem("viewedProducts") || "[]");
          console.log("Current viewed products:", viewedProducts);
          
          const isAlreadyViewed = viewedProducts.some(
            (p) => p.productId === product.productId
          );

          if (!isAlreadyViewed) {
            const productToStore = {
              productId: product.productId,
              name: product.title,
              rating: product.rating || 0,
              images: product.images || [],
              // Store minimal data to avoid quota issues
              timestamp: Date.now()
            };
            
            const updated = [productToStore, ...viewedProducts].slice(0, 10);
            localStorage.setItem("viewedProducts", JSON.stringify(updated));
            console.log("Product saved successfully:", productToStore);
            
            // Also save to recentlyViewed for consistency with RecentlyViewed component
            localStorage.setItem("recentlyViewed", JSON.stringify(updated));
          }
        } else {
          console.warn("localStorage is not available");
        }
      } catch (err) {
        console.error("Error saving viewed products:", err);
        // Try to clear corrupted data
        try {
          localStorage.removeItem("viewedProducts");
          localStorage.removeItem("recentlyViewed");
        } catch (clearErr) {
          console.error("Could not clear localStorage:", clearErr);
        }
      }
    }
  }, [product?.productId, product?.title, product?.rating, product?.images, id]);

  const renderStars = (rating) => (
    <div className="flex items-center space-x-1">
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      <span className="text-sm text-black-500 ml-1">{rating || 0}/5</span>
    </div>
  );

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white/60 flex items-center justify-center">
        <ClipLoader color="#5F43B2" size={50} />
      </div>
    );
  }
  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;
  if (!product) return null;

  // Sort retailers
  const sortedRetailers = [...(product.retailers || [])].sort((a, b) => {
    if (selectedOption === "Lowest Price") return a.price - b.price;
    if (selectedOption === "Highest Price") return b.price - a.price;
    return 0;
  });

  return (
    <>
      <Navbar />

      {/* Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto px-4 pt-[45px] py-6">
        <div className="space-y-1">
          <div className="text-sm text-gray-500">
            <span className="text-blue-600 cursor-pointer">← Back</span>
            <span className="mx-2">|</span>
            <span className="text-blue-600 cursor-pointer hover:underline">
              Home
            </span>
            {" / "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Tools & Equipments
            </span>
            {" / "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Drills
            </span>
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
          <label className="flex font-bold items-center gap-2 cursor-pointer hover:text-black">
            Add to Compare
            <input
              type="checkbox"
              className="form-checkbox accent-purple-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Product & Offers */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        {/* Product Image */}
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
          />
        </div>

        {/* Retailers / Offers */}
        <div className="flex-[1.5] w-full space-y-4 bg-[#E3E5FC66] p-6 rounded-2xl">
          <div className="flex justify-end mb-4" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center bg-white space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors rounded border border-purple-700"
            >
              <span>{selectedOption}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                {sortOptions.map((option, idx) => (
                  <button
                    key={idx}
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
            <div
              key={idx}
              className="border rounded-lg p-4 shadow-sm bg-white space-y-2 border-purple-700"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <img
                    src={offer.store === "Lowe's" ? lowes : homedepot}
                    alt="Store"
                    className="h-5 w-auto"
                  />
                  <span className="text-xl font-bold">${offer.price}</span>
                  <span className="text-sm line-through text-gray-400">
                    ${offer.listPrice}
                  </span>
                  <span className="text-green-600 text-xs font-medium ml-2">
                    Save ${offer.savings?.toFixed(2)}
                  </span>
                </div>
                {offer.offers > 0 && (
                  <div className="flex flex-col items-end text-xs text-purple-700">
                    <span className="flex items-center gap-1">
                      {offer.offers} Offers <ChevronDown className="h-4 w-4" />
                    </span>
                    <img
                      src={offericon}
                      alt="Offer icon"
                      className="mt-1 h-4"
                    />
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
                    <img src={location} alt="Location" className="w-4 h-4" />
                    Nearby store:{" "}
                    <span className="text-blue-600 underline">
                      {offer.storeLocation}
                    </span>{" "}
                    ({offer.distance})
                    <span className="ml-2 text-green-700 flex items-center">
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />{" "}
                      {offer.stockStatus}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 mt-2 mb-0">
                    <img src={truck} alt="truck" className="w-4 h-4" />
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
          ))}
        </div>
      </div>

      {/* Dynamic Product Details */}
      <div className="max-w-7xl mx-auto px-4 mt-10 bg-white p-6">
        <h3 className="text-2xl font-bold mb-4">Product Details</h3>
        <p className="text-gray-600 text-[16px] mb-4">
          Compare prices for{" "}
          <span className="font-semibold">{product.title}</span> across multiple
          stores. Find the best deals, check availability, and view
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
              {Object.entries(product.specifications).map(
                ([key, value], idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 text-sm border-b last:border-none"
                  >
                    <div className="px-4 py-3 font-medium text-gray-700 bg-gray-100 border-r border-gray-200">
                      {key}
                    </div>
                    <div className="col-span-2 px-4 py-3 text-gray-800">
                      {value}
                    </div>
                  </div>
                )
              )}
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

      <SimilarProducts />

      <div className="w-full max-w-7xl mx-auto p-4 mt-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Related Searches
        </h2>
        <div className="flex flex-wrap gap-4">
          {[
            "Tools",
            "Bathroom",
            "Furniture",
            "Dining",
            "Outdoor",
            "Ceiling",
            "Electrical",
            "Plumbing",
            "Hardware",
          ].map((term, idx) => (
            <button
              key={idx}
              className="px-4 py-2 border border-black rounded-full text-sm text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <RecentlyViewed />
      </div>
      <Footer />
    </>
  );
};

export default ProductDetailsPage;