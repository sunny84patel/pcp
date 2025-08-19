import React, { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import lowes from "../../assets/images/lowes.png";
import homedepot from "../../assets/images/homedepot.png";
import { useNavigate } from "react-router-dom";

const FilterSidebar = ({
  stores,
  categories,
  subCategories,
  selectedStore,
  selectedCategory,
  selectedSubCategory,
  onStoreChange,
  onCategorySelect,
  onSubCategorySelect,
}) => {
  const [showCategories, setShowCategories] = useState(true);
  const [showSubCategories, setShowSubCategories] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="w-[250px] p-4 bg-white text-sm">
      {/* Breadcrumb */}
      <div className="pt-4 pb-2">
        <div className="flex items-center text-sm text-gray-700 space-x-2 mb-3">
          <ArrowLeft className="w-4 h-4 cursor-pointer text-black" />
          <span
            onClick={() => navigate(-1)} // navigate back
            className="text-black font-medium cursor-pointer"
          >
            Back
          </span>
          <span className="text-gray-400">|</span>
          <span onClick={() => navigate("/")} className="text-xs text-gray-500 cursor-pointer">
            Home
          </span>
          <span className="text-gray-400 cursor-pointer">/</span>
          <span className="text-xs text-gray-500 cursor-pointer">Tools & Equipments</span>
        </div>
        <h2 className="text-lg font-bold">Filters</h2>
      </div>

      {/* Store Filter */}
      <div
        className="p-2 rounded"
        style={{
          border: "#E3E5FC 1px solid",
          borderRadius: "4px",
          backgroundColor: "#E3E5FC66",
        }}
      >
        <h3 className="font-bold mb-3">Store</h3>
        {stores.map((store, idx) => {
          const isSelected = selectedStore === store;
          return (
            <label
              key={idx}
              className={`flex items-center mb-2 gap-2 cursor-pointer p-2 rounded ${
                isSelected ? "bg-white border border-[#5F43B2]" : "bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onStoreChange(isSelected ? "" : store)}
              />
              {store?.toLowerCase().replace(/[’']/g, "'") === "lowe's" && (
                <img src={lowes} alt="Lowe's" className="h-5 w-auto" />
              )}
              {store?.toLowerCase() === "the home depot" && (
                <img src={homedepot} alt="Home Depot" className="h-5 w-auto" />
              )}
              <span className="font-medium text-sm">{store}</span>
            </label>
          );
        })}
      </div>

      {/* Categories */}
      <div
        className="mt-6 border rounded p-3 bg-white"
        style={{
          border: "#E3E5FC 1px solid",
          borderRadius: "4px",
        }}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowCategories(!showCategories)}
        >
          <h3 className="font-semibold">Categories</h3>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              showCategories ? "rotate-180" : ""
            }`}
          />
        </div>

        {showCategories && (
          <div className="mt-3 bg-white">
            {categories.map((cat, idx) => (
              <label
                key={idx}
                className="flex items-center mb-2 gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCategory === cat}
                  onChange={() =>
                    onCategorySelect(selectedCategory === cat ? "" : cat)
                  }
                />
                {cat}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Categories */}
      <div
        className="mt-4 border rounded p-3 bg-white"
        style={{
          border: "#E3E5FC 1px solid",
          borderRadius: "4px",
        }}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowSubCategories(!showSubCategories)}
        >
          <h3 className="font-semibold">Sub-Categories</h3>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              showSubCategories ? "rotate-180" : ""
            }`}
          />
        </div>

        {showSubCategories && (
          <div className="mt-3 bg-white">
            {subCategories.map((sub, idx) => (
              <label
                key={idx}
                className="flex items-center mb-2 gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedSubCategory === sub}
                  onChange={() =>
                    onSubCategorySelect(selectedSubCategory === sub ? "" : sub)
                  }
                />
                {sub}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterSidebar;
