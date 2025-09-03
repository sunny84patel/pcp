// src/pages/CompareProducts.jsx
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchComparison, toggleCompare } from "../Redux/Reducers/CompareSlice";
import { fetchNearestStore } from "../Redux/Reducers/NearestStoreSlice";
import { fetchNearestLowesStore } from "../Redux/Reducers/lowesstore";
import Navbar from "../Components/Navbar/navbar";
import SearchBar from "../Components/Search Bar/SearchBar";
import Footer from "../Components/Footer/Footer";
import homedepot from "../assets/images/homedepot.png";
import lowes from "../assets/images/lowes.png";
import offericon from "../assets/images/offericon.png";
import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import informationCircle from "../assets/images/informationCircle.png";
import location from "../assets/images/location.png";
import { ChevronDown, Heart, Star, Loader2 } from "lucide-react";

const CompareProducts = () => {
  const dispatch = useDispatch();
  const searchInputRef = useRef(null);

  // ✅ Grab selected IDs and product details from Redux
  const { selected, comparedProducts, loading, error } = useSelector(
    (state) => state.compare
  );

  // ✅ Get store data from both store slices
  const { store: homeDepotStore, loading: homeDepotLoading, error: homeDepotError } = useSelector(
    (state) => state.nearestStore
  );
  const { store: lowesStore, loading: lowesLoading, error: lowesError } = useSelector(
    (state) => state.nearestLowesStore
  );

  console.log("Selected IDs:", selected);
  console.log("Compared Products:", comparedProducts);
  console.log("Home Depot Store:", homeDepotStore);
  console.log("Lowe's Store:", lowesStore);

  // Fetch details whenever selected IDs change
  useEffect(() => {
    if (selected.length > 0) {
      dispatch(fetchComparison(selected));
    }
  }, [selected, dispatch]);

  // ✅ Fetch both store data when component mounts or when we have products to compare
  useEffect(() => {
    if (comparedProducts.length > 0) {
      // Check if any product has Home Depot stores
      const hasHomeDepot = comparedProducts.some(product =>
        product.stores?.some(store =>
          store.storeId === "homedepot" ||
          store.storeName?.toLowerCase().includes("home depot")
        )
      );

      // Check if any product has Lowe's stores  
      const hasLowes = comparedProducts.some(product =>
        product.stores?.some(store =>
          store.storeId === "lowes" ||
          store.storeName?.toLowerCase().includes("lowe")
        )
      );

      // Fetch store data based on what stores are present
      if (hasHomeDepot && !homeDepotStore && !homeDepotLoading) {
        dispatch(fetchNearestStore());
      }

      if (hasLowes && !lowesStore && !lowesLoading) {
        dispatch(fetchNearestLowesStore());
      }
    }
  }, [comparedProducts, homeDepotStore, lowesStore, homeDepotLoading, lowesLoading, dispatch]);

  // inside CompareProducts component (before return)
  const getDeliveryDate = () => {
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 2); // ✅ add 2 days

    // Format: "Friday, 27 June"
    const options = { weekday: "long", day: "numeric", month: "long" };
    return deliveryDate.toLocaleDateString("en-US", options);
  };

  // ✅ Helper function to get store information
  const getStoreInfo = (store) => {
    const isLowes = store.storeId === "lowes" || store.storeName?.toLowerCase().includes("lowe");
    const isHomeDepot = store.storeId === "homedepot" || store.storeName?.toLowerCase().includes("home depot");

    if (isLowes && lowesStore) {
      return {
        address: `${lowesStore.street_address}, ${lowesStore.city}, ${lowesStore.zip_state} ${lowesStore.zipcode}`,
        storeId: lowesStore.store_no,
        distance: lowesStore.distance || lowesStore.calculatedDistance?.toFixed(1) || '0.1',
        storeName: lowesStore.store_name || store.storeName,
        loading: lowesLoading,
        error: lowesError
      };
    } else if (isHomeDepot && homeDepotStore) {
      return {
        address: homeDepotStore.address || 'Address not available',
        storeId: homeDepotStore.store_id || store.storeId,
        distance: homeDepotStore.distance || '0.1',
        storeName: homeDepotStore.name || store.storeName,
        loading: homeDepotLoading,
        error: homeDepotError
      };
    }

    // Fallback to original store data
    return {
      address: store.address || 'Address not available',
      storeId: store.storeId,
      distance: '0.1',
      storeName: store.storeName,
      loading: isLowes ? lowesLoading : homeDepotLoading,
      error: isLowes ? lowesError : homeDepotError
    };
  };

  const renderStars = (rating) => (
    <div className="flex items-center space-x-1">
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
    </div>
  );

  // Clear all products from comparison
  const handleClearAll = () => {
    selected.forEach(id => dispatch(toggleCompare(id)));
  };

  // --- Handle states ---
  if (loading) {
    return (
      <>
        <Navbar />
        <SearchBar ref={searchInputRef} onSearch={(q) => console.log("Search:", q)} />
        <div className="w-full max-w-7xl mx-auto p-20 flex flex-col items-center justify-center text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-[#5F43B2]" />
          <p className="mt-4 text-sm font-medium">Loading comparison...</p>
        </div>
        <Footer />
      </>
    );
  }


  if (error) {
    return (
      <>
        <Navbar />
        <SearchBar ref={searchInputRef} onSearch={(q) => console.log("Search:", q)} />
        <div className="w-full max-w-7xl mx-auto p-10 text-center text-red-500">
          {error}
        </div>
        <Footer />
      </>
    );
  }

  if (selected.length === 0) {
    return (
      <>
        <Navbar />
        <SearchBar ref={searchInputRef} onSearch={(q) => console.log("Search:", q)} />
        <div className="w-full max-w-7xl mx-auto p-10 text-center text-gray-500">
          No products selected for comparison.
        </div>
        <Footer />
      </>
    );
  }

  // --- UI ---
  return (
    <>
      <Navbar />
      <SearchBar ref={searchInputRef} onSearch={(q) => console.log("Search:", q)} />
      <div className="w-full max-w-7xl mx-auto p-4 bg-white">
        <div
          className="flex justify-between items-end pb-3 mb-8"
          style={{ borderBottom: "1px solid #ABA9A980" }}
        >
          {/* Left Section */}
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-bold text-black">Compare Products</h2>
            <span className="text-sm text-gray-500">
              {comparedProducts.length} products added out to maximum 3
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6 text-sm font-semibold">
            <button
              onClick={handleClearAll}
              className="text-black hover:underline"
            >
              Clear All
            </button>
            <button
              className="flex items-center gap-1 text-black hover:underline"
              onClick={() => {
                searchInputRef.current?.focus();   // ✅ focus input
                searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); // optional auto-scroll
              }}
            >
              Add Products <span className="text-lg leading-none"></span>
            </button>
          </div>
        </div>

        {/* Product Header Comparison Section */}
        <div className={`flex gap-6 mb-5 ${comparedProducts.length === 1 ? 'grid-cols-[250px_1fr]' : comparedProducts.length === 2 ? 'grid-cols-[250px_1fr_1fr]' : 'grid-cols-[250px_1fr_1fr_1fr]'} grid`}>
          {/* Filter Sidebar */}
          <div className="bg-[#523D96] text-white rounded-lg p-4 flex flex-col justify-between h-64">
            <h4 className="font-semibold text-sm">
              Compare Selected Products
              <br />
              {comparedProducts[0]?.category || "Power Tools"}
            </h4>
            <label className="flex items-center text-white text-sm space-x-2 cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox rounded-sm accent-white"
              />
              <span>Show differences only</span>
            </label>
          </div>

          {/* Product Compare Cards */}
          {comparedProducts.map((product) => (
            <div
              key={product.productId}
              className="flex-1 bg-white border border-gray-300 rounded-lg shadow-sm"
            >
              <div className="relative p-3">
                {/* Favorite icon */}
                <button className="p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
                  <Heart className="w-5 h-5 text-black" />
                </button>

                {/* Remove icon */}
                <button
                  onClick={() => dispatch(toggleCompare(product.productId))}
                  className="absolute top-2 right-2 text-gray-600 hover:text-red-500"
                >
                  ✕
                </button>

                {/* Image */}
                <div className="flex justify-center">
                  <img
                    src={product.images?.[0] || homedepot}
                    alt={product.name}
                    className="h-28 object-contain"
                  />
                </div>

                {/* Title */}
                <p className="text-sm text-gray-800 mt-16 font-medium px-1">
                  {product.name}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Product Cards */}
        <div
          className="w-full border rounded-xl overflow-hidden bg-white"
          style={{ borderColor: "#5F43B2" }}
        >
          {/* Row: Available On */}
          <div className={`${comparedProducts.length === 1 ? 'grid-cols-[250px_1fr]' : comparedProducts.length === 2 ? 'grid-cols-[250px_1fr_1fr]' : 'grid-cols-[250px_1fr_1fr_1fr]'} grid divide-x divide-[#ABA9A9]`}>
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Available On
            </div>
            {comparedProducts.map((product) => (
              <div key={product.productId} className="p-4 space-y-3">
                {product.stores?.map((store, i) => {
                  const storeInfo = getStoreInfo(store);

                  return (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-md bg-[#E3E5FC66] p-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <img
                            src={store.storeId === "lowes" || store.storeName?.toLowerCase().includes("lowe") ? lowes : homedepot}
                            alt="Store"
                            className="h-16 w-auto"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xl font-bold">
                                ${store.price}
                              </span>
                              {store.listPrice > store.price && (
                                <span className="text-sm line-through text-[#757575]">
                                  ${store.listPrice}
                                </span>
                              )}
                            </div>
                            {store.listPrice > store.price && (
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-green-600 text-xs font-medium">
                                  Save {store.currency}{(store.listPrice - store.price).toFixed(2)}
                                </span>
                                <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded">
                                  {store.price === Math.min(...product.stores.map(s => s.price)) ? 'Lowest Price' : 'Great Price'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {product.offer && (
                          <div
                            className="flex flex-col items-end text-xs"
                            style={{ color: "rgba(95, 67, 178, 1)" }}
                          >
                            <span className="flex items-center gap-1">
                              1 Offer
                              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                            </span>
                            <img
                              src={offericon}
                              alt="Offer icon"
                              className="mt-1 h-4"
                            />
                          </div>
                        )}
                      </div>

                      {/* ✅ Updated store location section with dynamic data */}
                      <div className="text-sm text-black-700 mt-2">
                        <img
                          src={location}
                          alt="Location"
                          className="w-4 h-4 inline-block mr-2"
                        />
                        Nearby store:{" "}
                        {storeInfo.loading ? (
                          <span className="text-gray-500">Loading store info...</span>
                        ) : storeInfo.error ? (
                          <span className="text-red-500">Error loading store</span>
                        ) : (
                          <span className="text-blue-600">
                            {storeInfo.storeName} #{storeInfo.storeId}
                          </span>
                        )}
                        {" "}({storeInfo.distance} mi)
                        {/* Show address if available */}
                        {!storeInfo.loading && !storeInfo.error && storeInfo.address && (
                          <div className="text-xs text-gray-500 ml-6 mt-1">
                            {storeInfo.address}
                          </div>
                        )}
                      </div>

                      <div className="text-sm mt-1 flex items-center gap-1">
                        {store.stock > 0 ? (
                          <>
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              style={{ color: '#0B4C0A' }}
                            />
                            <span className="text-green-600 font-semibold">
                              {store.stock} in stock
                            </span>
                            <span>for Pickup</span>
                          </>
                        ) : (
                          <span className="text-gray-500">Out of Stock Now</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Row: Delivery */}
          <div
            className={`${comparedProducts.length === 1
              ? "grid-cols-[250px_1fr]"
              : comparedProducts.length === 2
                ? "grid-cols-[250px_1fr_1fr]"
                : "grid-cols-[250px_1fr_1fr_1fr]"
              } grid divide-x border-t border-[#ABA9A9] divide-[#ABA9A9]`}
          >
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Delivery
            </div>
            {comparedProducts.map((product) => (
              <div
                key={product.productId}
                className="px-4 py-3 text-sm text-black-700 flex items-center"
              >
                <div className="flex items-center space-x-1">
                  <span>Delivery in 2-3 Days, {getDeliveryDate()}</span>
                  <img
                    src={informationCircle}
                    alt="Info"
                    className="w-3 h-3 object-contain"
                  />
                </div>
              </div>
            ))}
          </div>


          {/* Row: Reviews & Rating */}
          <div className={`${comparedProducts.length === 1 ? 'grid-cols-[250px_1fr]' : comparedProducts.length === 2 ? 'grid-cols-[250px_1fr_1fr]' : 'grid-cols-[250px_1fr_1fr_1fr]'} grid divide-x border-t border-[#ABA9A9] divide-[#ABA9A9]`}>
            <div className="px-4 py-3 font-semibold text-sm text-black-700">
              Reviews & Rating
            </div>
            {comparedProducts.map((product) => (
              <div key={product.productId} className="px-4 py-3 text-sm space-y-2">
                {product.stores?.map((store, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <img
                      src={store.storeId === "lowes" || store.storeName?.toLowerCase().includes("lowe") ? lowes : homedepot}
                      alt={store.storeName}
                      className="h-16 w-auto"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-black">{store.rating || 4}/5</span>
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm hover:opacity-80"
                      >
                        {store.totalReviews || 0} Reviews
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-7 space-y-7 text-sm">
          {[
            {
              title: "Highlights",
              rows: ["Model", "Brand", "Category"],
            },
          ].map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h4 className="text-base font-semibold mb-2">{section.title}</h4>
              <table className="min-w-full border rounded-xl">
                <tbody>
                  {section.rows.map((rowLabel, rowIndex) => (
                    <tr key={rowIndex}>
                      <td
                        className="border px-4 py-2 font-medium text-gray-800 w-1/5"
                        style={{ backgroundColor: "#E3E5FC66" }}
                      >
                        {rowLabel}
                      </td>
                      {comparedProducts.map((product, i) => (
                        <td key={i} className="border px-4 py-2 text-gray-700">
                          {rowLabel === "Model" && product.modelNo}
                          {rowLabel === "Brand" && product.brand}
                          {rowLabel === "Category" && product.category}
                          {rowLabel === "Model Number" && product.modelNo}
                          {rowLabel === "Weight" && (product.weight || "N/A")}
                          {rowLabel === "Dimensions" && (product.dimensions || "N/A")}
                          {rowLabel === "Battery Type" && (product.batteryType || "Lithium-Ion")}
                          {rowLabel === "Power Source" && (product.powerSource || "Battery")}
                          {rowLabel === "Key Features" && (
                            <ul className="list-disc list-inside">
                              {product.features?.slice(0, 3).map((feature, idx) => (
                                <li key={idx} className="text-xs">{feature}</li>
                              ))}
                            </ul>
                          )}
                          {rowLabel === "Included Items" && (product.includedItems || "Standard package")}
                          {rowLabel === "Warranty" && (product.warranty || "1 Year Limited")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Product Buying Section - Similar to uploaded image */}
        {/* Product Buying Section - Similar to uploaded image */}
        <div className="mt-8 space-y-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Buy These Products</h3>

          <div className={`gap-6 ${comparedProducts.length === 1 ? 'grid-cols-1' : comparedProducts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} grid`}>
            {comparedProducts.map((product) => (
              <div
                key={product.productId}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
              >
                {/* ✅ Product Image instead of Store Logo */}
                <div className="flex justify-center mb-4">
                  <img
                    src={product.images?.[0] || homedepot}
                    alt={product.name}
                    className="h-28 object-contain"
                  />
                </div>

                {/* Product Name */}
                <h4 className="text-sm font-medium text-gray-800 mb-3 line-clamp-3 text-center">
                  {product.name}
                </h4>

                {/* Rating */}
                <div className="flex justify-center mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-gray-600">
                      {product.stores?.[0]?.rating || 4.5}/5
                    </span>
                  </div>
                </div>

                {/* Price Information */}
                <div className="space-y-2 mb-4">
                  {product.stores?.map((store, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <img
                        src={store.storeId === "lowes" || store.storeName?.toLowerCase().includes("lowe") ? lowes : homedepot}
                        alt={store.storeName}
                        className="h-5 w-auto"
                      />
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">
                          ${store.price}
                        </div>
                        {store.listPrice > store.price && (
                          <>
                            <div className="text-sm line-through text-gray-400">
                              ${store.currency}{store.listPrice}
                            </div>
                            <div className="text-xs text-green-600 font-medium">
                              Save {store.currency}{(store.listPrice - store.price).toFixed(2)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Buy Now Button */}
                <button
                  onClick={() => window.open(product.stores?.[0]?.url, '_blank')}
                  className="w-full bg-[#5F43B2] text-white py-2 rounded-full font-semibold hover:bg-[#4b3499] transition-colors cursor-pointer"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
};

export default CompareProducts;