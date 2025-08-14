import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPopularProducts } from "../../Redux/Reducers/PopularSlice";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
} from "lucide-react";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import homedepot from "../../assets/images/homedepot.png";
import lowes from "../../assets/images/lowes.png";
import { Link } from "react-router-dom";
const PopularProducts = () => {
  const dispatch = useDispatch();
  const {
    items: products,
    loading,
    error,
  } = useSelector((state) => state.popular);
  console.log("Popular Products:", products);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4.5);

  // Fetch products from API
  useEffect(() => {
    dispatch(fetchPopularProducts({ storeId: "homedepot", limit: 12 }));
  }, [dispatch]);

  // Responsive items per view
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

  const maxSlide = Math.max(0, products.length - itemsPerView);

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, maxSlide));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Popular Products</h2>
        <button className="px-4 py-2 text-[16px] font-semibold text-black hover:bg-gray-50 transition-colors inline-flex cursor-pointer">
          View All
          <ArrowRight className="ml-2 h-6 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading products...</p>
      ) : error ? (
        <p className="text-center text-red-500">Error: {error}</p>
      ) : (
        <div className="relative">
          <div className="flex items-center">
            {/* Left Arrow */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`absolute left-12 z-10 w-10 h-8 rounded-full transition-all ${currentSlide === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
              // style={{ transform: 'translateX(-50%)' }}
              style={{
                border: "2px solid #5F43B2",
              }}
            >
              {/* <ChevronLeft className="w-5 h-5" /> */}
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            {/* Product Container */}
            <div className="overflow-hidden w-full mx-8">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * (100 / itemsPerView)
                    }%)`,
                  width: `${(products.length / itemsPerView) * 100}%`,
                }}
              >
                {products.map((product) => (
                  <div
                    key={product.productId}
                    className="px-2"
                    style={{ width: `${100 / products.length}%` }}
                  >
                    <Link
                      to={`/product/${product.productId}`}
                      className="px-2"
                      style={{ width: `${100 / products.length}%` }}
                    >
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        {/* Image */}
                        <div className="relative aspect-square">
                          <button className="absolute top-3 right-3 p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
                            <Heart className="w-5 h-5 text-black" />
                          </button>

                          <img
                            src={
                              product.images?.[0] || "/placeholder-product.jpg"
                            }
                            alt={product.name}
                            className="object-contain w-full h-full"
                          />
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          {/* Model number with requested color */}
                          <div
                            style={{ color: "#0000008A" }}
                            className="text-xs mb-1"
                          >
                            {product.modelNo}
                          </div>
                          {renderStars(product.rating || 0)}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              {/* Left side - Store logo */}
                              <div className="flex items-center space-x-2">
                                <div className="space-y-2">
                                  {product.storeId === "lowe's" ? (
                                    <img
                                      src={lowes}
                                      alt=""
                                      className="h-5 w-auto"
                                    />
                                  ) : (
                                    <img
                                      src={homedepot}
                                      alt=""
                                      className="h-5 w-auto"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Right side - Enhanced price tag */}
                              <div className="flex items-center justify-end">
                                <div className="px-3 py-2">
                                  <div className="flex items-center space-x-2">
                                    {/* Store icon (small version) */}
                                    

                                    {/* Price */}
                                    <span className="text-lg font-bold text-gray-900">
                                      ${product.price}
                                    </span>
                                  </div>

                                  {/* Optional: Discount info */}
                                  {product.listPrice && product.listPrice > product.price && (
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-xs text-gray-500 line-through">
                                        ${product.listPrice}
                                      </span>
                                      <span className="text-xs text-green-600 font-medium ml-2">
                                        Save ${Number(product.listPrice - product.price).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={nextSlide}
              disabled={currentSlide >= maxSlide}
              className={`absolute right-10 z-10 w-10 h-8 rounded-full transition-all ${currentSlide >= maxSlide
                  ? "text-gray-400 cursor-not-allowed"
                  : "bg-white shadow-lg hover:shadow-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                }`}
              // style={{ transform: 'translateX(50%)' }}
              style={{
                border: "2px solid #5F43B2",
              }}
            >
              {/* <ChevronRight className="w-5 h-5" /> */}
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopularProducts;
