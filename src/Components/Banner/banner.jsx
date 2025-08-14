import React, { useState } from "react";
// Importing assets for the banner
import banner4 from "../../assets/images/banner4.png";
import banner2 from "../../assets/images/banner2.png";
import banner3 from "../../assets/images/banner3.png";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Bath,
  Sofa,
  Utensils,
  TreePine,
  Lightbulb,
  Sparkles,
  Droplets,
  Hammer,
} from "lucide-react";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Banner = ({onTagOrCategoryClick}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentCategorySlide, setCategorySlide] = useState(0);

  // Banner slides data
  const bannerSlides = [
    { id: 1, image: banner4 },
    { id: 2, image: banner2 },
    { id: 3, image: banner3 },
  ];

  // Product tags data - you can easily modify these later
  const productTags = [
    "Tools",
    "Bathroom",
    "Furniture",
    "Dining",
    "Outdoor",
    "Hardware",
  ];

  // Product categories data
  const categories = [
    { name: "Tools", icon: Wrench },
    { name: "Bathroom", icon: Bath },
    { name: "Furniture", icon: Sofa },
    { name: "Dining", icon: Utensils },
    { name: "Outdoor", icon: TreePine },
    { name: "Ceiling", icon: Lightbulb },
    { name: "Electrical", icon: Sparkles },
    { name: "Plumbing", icon: Droplets },
    { name: "Hardware", icon: Hammer },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length
    );
  };

  const nextCategory = () => {
    setCategorySlide((prev) =>
      Math.min(prev + 1, Math.max(0, categories.length - 8))
    );
  };

  const prevCategory = () => {
    setCategorySlide((prev) => Math.max(prev - 1, 0));
  };

    // Handle tag click
  const handleTagClick = (tag) => {
    if (onTagOrCategoryClick) {
      onTagOrCategoryClick(tag);
    }
  };

  // Handle category click
  const handleCategoryClick = (categoryName) => {
    if (onTagOrCategoryClick) {
      onTagOrCategoryClick(categoryName);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      {/* Product Tags */}
      <div className="mb-6">
        <div className="flex gap-2">
          {productTags.map((tag, i) => (
            <span
              key={i}
              className=" py-2 bg-white-100 border text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer flex-1 text-center"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Banner Carousel */}
      <div className="relative mb-8">
        <div className="relative h-64 bg-gray-200 rounded-lg overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {bannerSlides.map((slide) => (
              <div key={slide.id} className="w-full flex-shrink-0 h-full">
                <img
                  src={slide.image}
                  alt={`Banner ${slide.id}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            ))}
          </div>

          {/* Banner Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-8 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all cursor-pointer"
          >
            {/* <ChevronLeft className="w-6 h-6 text-gray-600" /> */}
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-8 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all cursor-pointer"
          >
            {/* <ChevronRight className="w-6 h-6 text-gray-600" /> */}
            <FontAwesomeIcon icon={faArrowRight} />
          </button>

          {/* Banner Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Categories Carousel */}
      <div className="relative">
        <div className="flex items-center">
          {/* Left Arrow */}
          <button
            onClick={prevCategory}
            disabled={currentCategorySlide === 0}
            className={`w-10 h-8 rounded-full mr-4 transition-all ${
              currentCategorySlide === 0
                ? "text-gray-400 cursor-not-allowed bg-white"
                : "hover:bg-gray-300 text-gray-600 cursor-pointer"
            }`}
            style={{
              border: "2px solid #5F43B2",
            }}
          >
            {/* <ChevronLeft className="w-5 h-5" /> */}
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>

          {/* Categories Container */}
          <div className="flex-1 overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${currentCategorySlide * 12.5}%)`,
              }}
            >
              {categories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={index}
                    className="flex-shrink-0 w-1/8 px-2"
                    style={{ minWidth: "12.5%" }}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <div className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-300 transition-colors"
                        style={{ backgroundColor: "#E3E5FC" }}
                      >
                        <IconComponent className="w-6 h-6 text-gray-600" />
                      </div>
                      <span className="text-[16px] text-center text-gray-700 leading-tight">
                        {category.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={nextCategory}
            disabled={
              currentCategorySlide >= Math.max(0, categories.length - 8)
            }
            className={`w-10 h-8 rounded-full ml-4 transition-all ${
              currentCategorySlide >= Math.max(0, categories.length - 8)
                ? "text-gray-400 cursor-not-allowed bg-white"
                : "hover:bg-gray-300 text-gray-600 cursor-pointer"
            }`}
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

export default Banner;
