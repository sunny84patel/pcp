import React from "react";

const SortBar = ({
  onSortChange,
  onClearAll,
  sortValues,
  totalProducts = 0,
  showingStart = 1,
  showingEnd = 20,
}) => {
  return (
    <div
      className="flex flex-col pb-2 mb-4"
      style={{ borderBottom: "1px solid #ABA9A980" }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-gray-800">
            Tools & Equipments
          </h2>
          <span className="text-sm text-gray-500">
            Showing {showingStart}-{showingEnd} products out of {totalProducts}{" "}
            products
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 mt-3">
          <span className="font-semibold mr-2">Sort By</span>
          <select
            className="border rounded-md px-3 py-1 cursor-pointer"
            value={sortValues.sortBy === "price" ? (sortValues.sortOrder === "asc" ? "low-high" : "high-low") : ""}
            onChange={(e) => onSortChange("price", e.target.value)}
            style={{ border: "1px solid #5F43B2" }}
          >
            <option value="">Price Range</option>
            <option value="low-high">Low to High</option>
            <option value="high-low">High to Low</option>
          </select>
          <select
            className="border rounded-md px-3 py-1 cursor-pointer"
            value={sortValues.sortBy === "reviews" ? (sortValues.sortOrder === "asc" ? "low-high" : "high-low") : ""}
            onChange={(e) => onSortChange("ratings", e.target.value)}
            style={{ border: "1px solid #5F43B2" }}
          >
            <option value="">Ratings</option>
            <option value="high-low">High to Low</option>
            <option value="low-high">Low to High</option>
          </select>
          <select
            className="border rounded-md px-3 py-1 cursor-pointer"
            value={sortValues.sortBy === "popularity" ? (sortValues.sortOrder === "asc" ? "low-high" : "high-low") : ""}
            onChange={(e) => onSortChange("popularity", e.target.value)}
            style={{ border: "1px solid #5F43B2" }}
          >
            <option value="">Popularity</option>
            <option value="high-low">High to Low</option>
            <option value="low-high">Low to High</option>
          </select>
        </div>
        <button
          className="text-black font-semibold hover:underline cursor-pointer"
          onClick={onClearAll}
        >
          Clear All
        </button>
      </div>
    </div>
  );
};
export default SortBar;
