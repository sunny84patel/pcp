import React, { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSimilarProducts } from "../../Redux/Reducers/SimilarProductSlice";
import { ArrowRight } from "lucide-react";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import lowes from "../../assets/images/lowes.png";
import homedepot from "../../assets/images/homedepot.png";
import { Link, useParams } from "react-router-dom";

const SimilarProducts = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const { items: products, loading, error } = useSelector(
    (state) => state.similarProducts
  );
  console.log("Similar Products:", products);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4.5);
  const fetchedRef = useRef(null);

  useEffect(() => {
    if (id && fetchedRef.current !== id) {
      dispatch(fetchSimilarProducts(id));
      fetchedRef.current = id;
    }
  }, [id, dispatch]);

  // Enhanced mapping with correct storeId handling from your API structure
  const groupedProducts = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (!map[p.productId]) {
        map[p.productId] = {
          productId: p.productId,
          title: p.name || p.title || 'Product Name',
          rating: p.rating || 0,
          thumbnail: p.stores?.[0]?.images?.[0] || p.image || null,
          stores: {},
          brand: p.brand || '',
          category: p.category || '',
          minPrice: p.minPrice || 0,
          totalReviews: p.totalReviews || 0,
        };
      }

      // Handle the stores array from your API response
      p.stores?.forEach((storeData) => {
        const storeKey = storeData.storeId?.toLowerCase().trim();
        if (storeKey) {
          map[p.productId].stores[storeKey] = {
            storeId: storeData.storeId,
            price: storeData.price,
            listPrice: storeData.listPrice || storeData.price,
            storeUrl: storeData.url,
            image: storeData.images?.[0] || null,
            currency: storeData.currency || 'USD',
            inventoryQuantity: storeData.inventoryQuantity || 0,
            rating: storeData.rating || 0,
            totalReviews: storeData.totalReviews || 0,
          };
        }
      });
    });
    return Object.values(map);
  }, [products]);

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

  const maxSlide = Math.max(0, groupedProducts.length / itemsPerView);
  const nextSlide = () =>
    setCurrentSlide((prev) => Math.min(prev + 1, maxSlide));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 fill-yellow-400 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.122-6.545L0.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${i})`}
              d="M10 15l-5.878 3.09 1.122-6.545L0.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z"
            />
          </svg>
        );
      } else {
        stars.push(
          <svg
            key={i}
            className="w-4 h-4 fill-gray-300 text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.122-6.545L0.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z" />
          </svg>
        );
      }
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600 ml-1">
          {rating > 0 ? `(${rating.toFixed(1)})` : '(0.0)'}
        </span>
      </div>
    );
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price) return 'N/A';
    return currency === 'USD' ? `$${price}` : `${price} ${currency}`;
  };

  // const getBestPrice = (stores) => {
  //   const prices = Object.values(stores).map(store => parseFloat(store.price)).filter(price => !isNaN(price));
  //   return prices.length > 0 ? Math.min(...prices) : null;
  // };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 pt-16 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Similar Products</h2>
        <button className="px-4 py-2 text-[16px] font-semibold text-black hover:bg-gray-50 transition-colors inline-flex cursor-pointer">
          View All
          <ArrowRight className="ml-2 h-6 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <p className="text-center text-red-500">Error: {error}</p>
      ) : groupedProducts.length === 0 ? (
        <p className="text-center text-gray-500">No similar products found.</p>
      ) : (
        <div className="relative">
          <div className="flex items-center">
            {/* Left Arrow */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`absolute left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentSlide === 0
                  ? "text-gray-400 cursor-not-allowed bg-gray-100"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
              style={{ border: "2px solid #5F43B2" }}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
            </button>

            {/* Carousel */}
            <div className="overflow-hidden w-full mx-16">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * (100 / itemsPerView)
                    }%)`,
                  width: `${(groupedProducts.length / itemsPerView) * 100}%`,
                }}
              >
                {groupedProducts.map((product) => {
                  // Check for stores using exact storeId values from API
                  const hasLowes = !!product.stores["lowe's"];
                  const hasHomeDepot = !!product.stores["homedepot"];
                  const bestPrice = getBestPrice(product.stores);

                  return (
                    <div
                      key={product.productId}
                      className="px-2"
                      style={{ width: `${100 / groupedProducts.length}%` }}
                    >
                      <Link
                        to={`/product/${product.productId}`}
                        className="block"
                      >
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl h-full">
                          {/* Product Image */}
                          <div className="relative aspect-square bg-gray-50">
                            <img
                              src={
                                product.thumbnail ||
                                "/placeholder-product.jpg"
                              }
                              alt={product.title}
                              className="object-contain w-full h-full p-2"
                              onError={(e) => {
                                e.target.src = "/placeholder-product.jpg";
                              }}
                            />
                            {/* {bestPrice && (
                              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
                                Best: {formatPrice(bestPrice)}
                              </div>
                            )}
                            {product.brand && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs">
                                {product.brand}
                              </div>
                            )} */}
                          </div>

                          <div className="p-4">
                            {/* Product Title */}
                            <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2 h-10">
                              {product.title}
                            </h3>

                            {/* Rating */}
                            <div className="mb-3">
                              {renderStars(product.rating || 0)}
                              {product.totalReviews > 0 && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({product.totalReviews} reviews)
                                </span>
                              )}
                            </div>

                            {/* Store Information */}
                            <div className="space-y-3">
                              {hasLowes && (
                                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={lowes}
                                      alt="Lowe's"
                                      className="h-6 w-auto"
                                    />
                                    <div>
                                      <div className="text-lg font-bold text-gray-800">
                                        {formatPrice(product.stores["lowe's"].price, product.stores["lowe's"].currency)}
                                      </div>
                                      {product.stores["lowe's"].listPrice &&
                                        product.stores["lowe's"].listPrice !== product.stores["lowe's"].price && (
                                          <div className="text-xs text-gray-500 line-through">
                                            {formatPrice(product.stores["lowe's"].listPrice, product.stores["lowe's"].currency)}
                                          </div>
                                        )}
                                      {product.stores["lowe's"].inventoryQuantity > 0 && (
                                        <div className="text-xs text-green-600">
                                          {product.stores["lowe's"].inventoryQuantity} in stock
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* <a
                                    href={product.stores["lowe's"].storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Store
                                  </a> */}
                                </div>
                              )}

                              {hasHomeDepot && (
                                <div className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={homedepot}
                                      alt="Home Depot"
                                      className="h-6 w-auto"
                                    />
                                    <div>
                                      <div className="text-lg font-bold text-gray-800">
                                        {formatPrice(product.stores["homedepot"].price, product.stores["homedepot"].currency)}
                                      </div>
                                      {product.stores["homedepot"].listPrice &&
                                        product.stores["homedepot"].listPrice !== product.stores["homedepot"].price && (
                                          <div className="text-xs text-gray-500 line-through">
                                            {formatPrice(product.stores["homedepot"].listPrice, product.stores["homedepot"].currency)}
                                          </div>
                                        )}
                                      {product.stores["homedepot"].inventoryQuantity > 0 && (
                                        <div className="text-xs text-green-600">
                                          {product.stores["homedepot"].inventoryQuantity} in stock
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {/* <a
                                    href={product.stores["homedepot"].storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View Store
                                  </a> */}
                                </div>
                              )}

                              {/* Available in both stores indicator */}
                              {hasLowes && hasHomeDepot && (
                                <div className="text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Available in both stores
                                  </span>
                                </div>
                              )}

                              {/* No stores available */}
                              {!hasLowes && !hasHomeDepot && (
                                <div className="text-center text-gray-500 text-sm">
                                  Store information not available
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
              className={`absolute right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentSlide >= maxSlide
                  ? "text-gray-400 cursor-not-allowed bg-gray-100"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
              style={{ border: "2px solid #5F43B2" }}
            >
              <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimilarProducts;