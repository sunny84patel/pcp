import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const ProductSlider = ({ title }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);

  // Product data
  const products = [
    {
      id: 1,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
    {
      id: 2,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
    {
      id: 3,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
    {
      id: 4,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
    {
      id: 5,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
    {
      id: 6,
      name: "Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless...",
      rating: 4.5,
      originalPrice: 349,
      salePrice: 320,
      discount: "Save $29",
      image: "/placeholder-product.jpg",
    },
  ];

  // Handle responsive items per view
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1);
      } else if (width < 768) {
        setItemsPerView(2);
      } else if (width < 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
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

  //   const renderStars = (rating) => {
  //     const fullStars = Math.floor(rating);
  //     const hasHalfStar = rating % 1 !== 0;

  //     return (
  //       <div className="flex items-center space-x-1">
  //         {[...Array(fullStars)].map((_, i) => (
  //           <Star key={i} className="w-4 h-4 fill-blue-500 text-blue-500" />
  //         ))}
  //         {hasHalfStar && <Star className="w-4 h-4 fill-blue-500/50 text-blue-500" />}
  //         <span className="text-sm text-gray-600 ml-1">{rating}/5</span>
  //       </div>
  //     );
  //   };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button className="px-4 py-2 text-[16px] font-semibold text-black hover:bg-gray-50 transition-colors inline-flex cursor-pointer">
          View All
          <ArrowRight className="ml-2 h-6 w-4" />
        </button>
      </div>

      {/* Products Carousel */}
      <div className="relative">
        <div className="flex items-center">
          {/* Left Arrow */}
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`absolute left-0 z-10 w-10 h-8 rounded-full transition-all ${
              currentSlide === 0
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

          {/* Products Container */}
          <div className="overflow-hidden w-full mx-8">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${
                  currentSlide * (100 / itemsPerView)
                }%)`,
                width: `${(products.length / itemsPerView) * 100}%`,
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="px-2"
                  style={{ width: `${100 / products.length}%` }}
                >
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Product Image */}
                    <div className="relative bg-gray-200 aspect-square">
                      <button className="absolute top-3 right-3 p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
                        <Heart className="w-5 h-5 text-black" />
                      </button>

                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {/* Placeholder for product image */}
                        <div className="text-center">
                          <span className="text-xs">Product Image</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      {/* Model number with requested color */}
                      <div
                        style={{ color: "#0000008A" }}
                        className="text-xs mb-1"
                      >
                        Model #DE6702{product.model}
                      </div>
                      {/* Rating */}
                      <div className="flex items-center space-x-1 mb-2">
                        <Star className="w-4 h-4 fill-blue-500 text-blue-500" />
                        <span className="text-sm text-gray-700">
                          {product.rating}/5
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-gray-800">
                            ${product.salePrice}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${product.originalPrice}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600 underline cursor-pointer hover:text-blue-800">
                            Lowest on Lowe's
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            {product.discount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={nextSlide}
            disabled={currentSlide >= maxSlide}
            className={`absolute right-0 z-10 w-10 h-8 rounded-full transition-all ${
              currentSlide >= maxSlide
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
    </div>
  );
};

export default ProductSlider;
