import React from "react";
import { Sofa, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import compare from "../../assets/images/compare.png";
import compare1 from "../../assets/images/compare1.png";
import compare2 from "../../assets/images/compare2.png";
import star from "../../assets/images/star.png";

const PromotionCategories = () => {
  const navigate = useNavigate();

  // Popular categories data
  const popularCategories = [
    { name: "Furniture", icon: Sofa },
    { name: "Tools", icon: Sofa },
    { name: "Bathroom", icon: Sofa },
    { name: "Brush", icon: Sofa },
    { name: "Hardware", icon: Sofa },
    { name: "Outdoor", icon: Sofa },
    { name: "Dinning", icon: Sofa },
    { name: "Sofa", icon: Sofa },
  ];

  const handleCategoryClick = (category) => {
    // Navigate to search page with category as query param
    navigate(`/filter?query=${encodeURIComponent(category)}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white space-y-8">
      {/* Promotion Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compare Products Section */}
        <div
          className="rounded-lg p-6 flex flex-col min-h-48 relative overflow-hidden"
          style={{ backgroundColor: "#443778" }}
        >
          {/* Background Illustration */}
          <img
            src={star}
            alt="star Illustration"
            className="absolute bottom-0 right-0 md:w-40 lg:w-58"
          />
          <img
            src={compare}
            alt="Compare Illustration"
            className="absolute bottom-0 right-0 md:w-40 lg:w-58"
          />

          {/* Text Content */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Compare and Buy at the Best Prices!
            </h3>
          </div>

          {/* Call to Action Button */}
          <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-all inline-flex items-center w-fit cursor-pointer">
            Compare Products
            <ArrowRight className="ml-2 h-6 w-4" />
          </button>
        </div>

        {/* Promotion Banners */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg overflow-hidden h-34">
            <img
              src={compare1}
              alt="Promotion Banner 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="rounded-lg overflow-hidden h-34">
            <img
              src={compare2}
              alt="Promotion Banner 2"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Popular Categories Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Popular Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {popularCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div
                key={index}
                onClick={() => handleCategoryClick(category.name)}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {category.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PromotionCategories;
