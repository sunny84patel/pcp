import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSearchResults } from "../Redux/Reducers/SearchSlice";
import { useLocation } from "react-router-dom";
import FilterSidebar from "../Components/Filter Sidebar/FilterSidebar";
import ProductGrid from "../Components/Product Grid/ProductGrid";
import SearchBar from "../Components/Search Bar/SearchBar";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import SortBar from "../Components/Sort Bar/SortBar";
import Pagination from "../Components/Pagination/Pagination";
import { ClipLoader } from "react-spinners";

const stores = ["The Home Depot", "Lowe's"];
const categories = [
  "Tools",
  "Bathroom",
  "Furniture",
  "Dining",
  "Outdoor",
  "Ceiling",
  "Electrical",
  "Plumbing",
  "Hardware",
];
const subCategories = [
  "Sofa",
  "Door",
  "Chairs",
  "Bolts",
  "Paints",
  "LED",
  "Tool Set",
];

const useQuery = () => new URLSearchParams(useLocation().search);

const CategoryPage = () => {
  const dispatch = useDispatch();
  const queryParams = useQuery();
  const initialQuery = queryParams.get("query") || "";
  const { results, status, error } = useSelector((state) => state.search);
  console.log("Search Results:", results);

  // Selected filters
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);

  // Backend sort params
  const [sortBy, setSortBy] = useState(""); // price | reviews | popularity
  const [sortOrder, setSortOrder] = useState(""); // asc | desc

  const storeMap = {
    "The Home Depot": "homedepot",
    "Lowe's": "lowe's",
  };
  const storeQuery = selectedStore ? storeMap[selectedStore] : "";
  const productsPerPage = 18;

  // Fetch products from backend
  useEffect(() => {
    dispatch(
      fetchSearchResults({
        query: searchQuery,
        stores: storeQuery,
        page: currentPage,
        limit: productsPerPage,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      })
    );
  }, [dispatch, searchQuery, storeQuery, currentPage, sortBy, sortOrder]);

  const products = results?.results || [];
  const hasNextPage = results?.pagination?.hasNextPage || false;
  
  // Fix for total products count - use multiple fallback options
  const totalProducts = results?.totalResults || 
                       results?.total || 
                       results?.pagination?.totalResults || 
                       results?.pagination?.total ||
                       products.length || 0;

  // Calculate showing range
  const showingStart = products.length > 0 ? (currentPage - 1) * productsPerPage + 1 : 0;
  const showingEnd = (currentPage - 1) * productsPerPage + products.length;

  const handleClearAll = () => {
    setSortBy("");
    setSortOrder("");
    setSelectedStore("");
    setSelectedCategory("");
    setSelectedSubCategory("");
    setCurrentPage(1);
  };

  const productTags = [
    "Brush",
    "Bolt",
    "Tool",
    "Outdoor",
    "Ceiling",
    "Dinning",
    "Furniture",
    "Hardware",
  ];

  return (
    <>
      <Navbar />
      <SearchBar
        onSearch={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
      />

      {/* Product Tags */}
      <div className="w-full max-w-7xl mx-auto p-4 bg-white">
        <div className="flex gap-2">
          {productTags.map((tag, i) => (
            <span
              key={i}
              className="py-2 bg-white-100 border text-gray-700 rounded-full text-sm hover:bg-gray-200 cursor-pointer flex-1 text-center"
              onClick={() => {
                setSearchQuery(tag);
                setCurrentPage(1);
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-7xl mx-auto p-4 bg-white">
        <FilterSidebar
          stores={stores}
          categories={categories}
          subCategories={subCategories}
          selectedStore={selectedStore}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
          onStoreChange={(store) => {
            setSelectedStore(store);
            setCurrentPage(1);
          }}
          onCategorySelect={(cat) => {
            setSelectedCategory(cat);
            setSelectedSubCategory("");
            setSearchQuery(cat);
            setCurrentPage(1);
          }}
          onSubCategorySelect={(sub) => {
            setSelectedSubCategory(sub);
            setSelectedCategory("");
            setSearchQuery(sub);
            setCurrentPage(1);
          }}
        />

        <div className="flex-1 p-4">
          <SortBar
            onSortChange={(type, value) => {
              if (type === "price") {
                setSortBy("price");
                setSortOrder(value === "low-high" ? "asc" : "desc");
              } else if (type === "ratings") {
                setSortBy("reviews");
                setSortOrder(value === "low-high" ? "asc" : "desc");
              } else if (type === "popularity") {
                setSortBy("popularity");
                setSortOrder(value === "low-high" ? "asc" : "desc");
              }
              setCurrentPage(1);
            }}
            onClearAll={handleClearAll}
            sortValues={{ sortBy, sortOrder }}
            totalProducts={totalProducts}
            showingStart={showingStart}
            showingEnd={showingEnd}
          />

          {status === "loading" && (
            <div className="fixed inset-0 z-50 bg-white/60 flex items-center justify-center">
              <ClipLoader color="#5F43B2" size={50} />
            </div>
          )}

          {status === "failed" && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {status === "succeeded" && <ProductGrid products={products} />}

          <Pagination
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CategoryPage;