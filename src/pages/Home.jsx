import { useDispatch, useSelector } from "react-redux";
import Banner from "../Components/Banner/banner";
import Footer from "../Components/Footer/Footer";
import Navbar from "../Components/Navbar/navbar";
import PopularProducts from "../Components/PopularProducts/PopularProducts";
import PriceDropped from "../Components/PriceDropped/PriceDropped";
import PromotionCategories from "../Components/Promotion Categories/PromotionCategories";
import RecentlyViewed from "../Components/RecentlyViewed/RecentlyViewed";
import { fetchSearchResults } from "../Redux/Reducers/SearchSlice";
import SearchBar from "../Components/Search Bar/SearchBar";
import { useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import { fetchNearestStore } from "../Redux/Reducers/NearestStoreSlice"; // ✅ import slice

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // ✅ Get nearest store from Redux

  useEffect(() => {
    // ✅ Run only once on page load
    dispatch(fetchNearestStore());
  }, [dispatch]);

  const tags = Array(7).fill("Water Pressure Machine");
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

  const handleSearch = (query) => {
    if (!query.trim()) return;
    console.log("🔍 Search query:", query);

    dispatch(fetchSearchResults({ query, stores: "" }));
    navigate(`/filter?query=${encodeURIComponent(query)}`);
  };

  const handleTagOrCategoryClick = (query) => {
    if (!query.trim()) return;
    console.log("🏷️ Tag/Category clicked:", query);

    navigate(`/filter?query=${encodeURIComponent(query)}`);
  };

  return (
    <>
      {/* Navbar now receives postalCode from Redux store */}
      <Navbar />

      <SearchBar onSearch={handleSearch} />
      <Banner
        tags={tags}
        categories={categories}
        onTagOrCategoryClick={handleTagOrCategoryClick}
      />
      <PriceDropped />
      <PopularProducts />
      <RecentlyViewed />
      <PromotionCategories />
      <Footer />
    </>
  );
};

export default Home;
