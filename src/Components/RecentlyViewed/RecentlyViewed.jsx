import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";
import { fetchProductsByIds } from "../../Redux/Reducers/RecentSlice";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import lowes from "../../assets/images/lowes.png";
import homedepot from "../../assets/images/homedepot.png";
import { Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";

const RecentlyViewed = () => {
  const dispatch = useDispatch();
  const {
    items: products,
    loading,
    error,
  } = useSelector((state) => state.recent);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4.5);
  const [localProducts, setLocalProducts] = useState([]);

  // Enhanced localStorage reading with better error handling
  const storedViewed = useMemo(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Try both keys for backward compatibility
        const recentlyViewed = JSON.parse(
          localStorage.getItem("recentlyViewed") || "[]"
        );
        const viewedProducts = JSON.parse(
          localStorage.getItem("viewedProducts") || "[]"
        );

        // Use whichever has more data or the more recent one
        const combined = [...recentlyViewed, ...viewedProducts];
        const uniqueProducts = combined.reduce((acc, product) => {
          if (
            product &&
            product.productId &&
            !acc.find((p) => p.productId === product.productId)
          ) {
            acc.push(product);
          }
          return acc;
        }, []);

        console.log("Loaded from localStorage:", uniqueProducts);
        setLocalProducts(uniqueProducts);

        return uniqueProducts.map((p) => p.productId).filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  }, []);

  // Fetch products from API if we have IDs
  useEffect(() => {
    if (storedViewed.length > 0) {
      dispatch(fetchProductsByIds(storedViewed));
    }
  }, [dispatch, storedViewed]);

  // Handle responsive items per view
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setItemsPerView(1);
      else if (width < 768) setItemsPerView(2);
      else if (width < 1024) setItemsPerView(3);
      else setItemsPerView(4.5);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use localStorage data if API data is not available
  const displayProducts = useMemo(() => {
    if (products && products.length > 0) {
      // Group products by productId (API data)
      const map = {};
      products.forEach((p) => {
        if (!map[p.productId]) {
          map[p.productId] = {
            productId: p.productId,
            name: p.name,
            rating: p.rating,
            images: p.images,
            stores: {},
          };
        }
        map[p.productId].stores[p.storeId.toLowerCase()] = {
          price: p.price,
          listPrice: p.listPrice,
          storeUrl: p.storeUrl,
        };
      });
      return Object.values(map);
    } else if (localProducts.length > 0) {
      // Fallback to localStorage data
      return localProducts.map((product) => ({
        productId: product.productId,
        name: product.name,
        rating: product.rating,
        images: product.images || [],
        stores: {}, // No store data available from localStorage
      }));
    }
    return [];
  }, [products, localProducts]);

  console.log("Display products:", displayProducts);

  const maxSlide = Math.max(0, displayProducts.length / itemsPerView);

  const nextSlide = () =>
    setCurrentSlide((prev) => Math.min(prev + 1, maxSlide + 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const renderStars = (rating) => (
    <div className="flex items-center space-x-1">
      <svg
        className="w-4 h-4 fill-yellow-400 text-yellow-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path d="M10 15l-5.878 3.09 1.122-6.545L0.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z" />
      </svg>
      <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
    </div>
  );

  // Debug information
  useEffect(() => {
    console.log("RecentlyViewed Debug:", {
      storedViewedCount: storedViewed.length,
      localProductsCount: localProducts.length,
      productsCount: products?.length || 0,
      displayProductsCount: displayProducts.length,
      loading,
      error,
    });
  }, [storedViewed, localProducts, products, displayProducts, loading, error]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Recently Viewed</h2>
        <button className="px-4 py-2 text-[16px] font-semibold text-black hover:bg-gray-50 transition-colors inline-flex cursor-pointer">
          View All
          <ArrowRight className="ml-2 h-6 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">
          <ClipLoader color="#5F43B2" size={50} />
        </p>
      ) : error ? (
        <p className="text-center text-red-500">Error: {error}</p>
      ) : displayProducts.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>No recently viewed products</p>
          {/* Debug info in development
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs mt-2">
              <p>localStorage items: {storedViewed.length}</p>
              <p>Local products: {localProducts.length}</p>
              <p>API products: {products?.length || 0}</p>
            </div>
          )} */}
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center">
            {/* Left Arrow */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`absolute left-12 z-10 w-10 h-8 rounded-full transition-all ${
                currentSlide === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
              }`}
              style={{
                border: "2px solid #5F43B2",
              }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            {/* Carousel */}
            <div className="overflow-hidden w-full mx-8">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${
                    currentSlide * (100 / itemsPerView)
                  }%)`,
                  width: `${(displayProducts.length / itemsPerView) * 100}%`,
                }}
              >
                {displayProducts.map((product) => {
                  const hasLowes = !!product.stores?.["lowe's"];
                  const hasHomeDepot = !!product.stores?.["homedepot"];
                  const hasStoreData = hasLowes || hasHomeDepot;

                  return (
                    <div
                      key={product.productId}
                      className="px-2"
                      style={{ width: `${100 / displayProducts.length}%` }}
                    >
                      <Link
                        to={`/product/${product.productId}`}
                        className="block"
                      >
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                          <div className="relative aspect-square">
                            <img
                              src={
                                product.images?.[0] ||
                                "/placeholder-product.jpg"
                              }
                              alt={product.name}
                              className="object-contain w-full h-full"
                            />
                          </div>

                          <div className="p-4">
                            <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">
                              {product.name}
                            </h3>
                            {renderStars(product.rating || 0)}

                            <div className="mt-2">
                              {hasStoreData ? (
                                <div className="flex items-start justify-between">
                                  {/* Left: Store Logos */}
                                  <div className="space-y-2">
                                    {hasLowes && (
                                      <img
                                        src={lowes}
                                        alt="Lowes"
                                        className="h-5 w-auto"
                                      />
                                    )}
                                    {hasHomeDepot && (
                                      <img
                                        src={homedepot}
                                        alt="Home Depot"
                                        className="h-5 w-auto"
                                      />
                                    )}
                                  </div>

                                  {/* Right: Prices */}
                                  <div className="text-right space-y-2">
                                    {hasLowes && (
                                      <div>
                                        <div className="text-lg font-bold text-gray-800">
                                          ${product.stores["lowe's"].price}
                                        </div>
                                        {product.stores["lowe's"].listPrice &&
                                          product.stores["lowe's"].listPrice >
                                            product.stores["lowe's"].price && (
                                            <div className="text-xs text-green-600 font-medium">
                                              Save $
                                              {(
                                                product.stores["lowe's"]
                                                  .listPrice -
                                                product.stores["lowe's"].price
                                              ).toFixed(2)}
                                            </div>
                                          )}
                                      </div>
                                    )}

                                    {hasHomeDepot && (
                                      <div>
                                        <div className="text-lg font-bold text-gray-800">
                                          ${product.stores["homedepot"].price}
                                        </div>
                                        {product.stores["homedepot"]
                                          .listPrice &&
                                          product.stores["homedepot"]
                                            .listPrice >
                                            product.stores["homedepot"]
                                              .price && (
                                            <div className="text-xs text-green-600 font-medium">
                                              Save $
                                              {(
                                                product.stores["homedepot"]
                                                  .listPrice -
                                                product.stores["homedepot"]
                                                  .price
                                              ).toFixed(2)}
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-gray-500 text-sm">
                                  View product details
                                </div>
                              )}

                              {/* Available in both stores */}
                              {hasLowes && hasHomeDepot && (
                                <div className="text-xs text-green-600 font-semibold mt-2">
                                  Available in both stores
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={nextSlide}
              disabled={currentSlide >= maxSlide}
              className={`absolute right-10 z-10 w-10 h-8 rounded-full transition-all ${
                currentSlide >= maxSlide
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
              }`}
              style={{
                border: "2px solid #5F43B2",
              }}
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;
