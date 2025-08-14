import { useDispatch } from "react-redux";
import Banner from "../Components/Banner/banner";
import Footer from "../Components/Footer/Footer";
// import Header from "./Components/Header/header";
import Navbar from "../Components/Navbar/navbar";
import PopularProducts from "../Components/PopularProducts/PopularProducts";
import PriceDropped from "../Components/PriceDropped/PriceDropped";
import PromotionCategories from "../Components/Promotion Categories/PromotionCategories";
import RecentlyViewed from "../Components/RecentlyViewed/RecentlyViewed";
import { fetchSearchResults } from "../Redux/Reducers/SearchSlice";
import SearchBar from "../Components/Search Bar/SearchBar";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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

    // Optional: dispatch search here
    dispatch(fetchSearchResults({ query, stores: "" }));

    // Navigate with search query
    navigate(`/filter?query=${encodeURIComponent(query)}`);
  };

  // New function to handle tag/category clicks
  const handleTagOrCategoryClick = (query) => {
    if (!query.trim()) return;
    navigate(`/filter?query=${encodeURIComponent(query)}`);
  };

  return (
    <>
      {/* <Header /> */}
      <Navbar />
      <SearchBar onSearch={handleSearch} />
      <Banner tags={tags} categories={categories} onTagOrCategoryClick={handleTagOrCategoryClick}/>
      <PriceDropped />
      <PopularProducts />
      <RecentlyViewed />
      <PromotionCategories />
      <Footer />
    </>
  );
};

export default Home;
