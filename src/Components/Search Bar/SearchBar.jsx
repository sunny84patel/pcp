import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import axios from "axios";
import debounce from "lodash.debounce"; // npm install lodash.debounce
import { useNavigate } from "react-router-dom"; // Add this import

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [viewedProducts, setViewedProducts] = useState([]);
  const [trending] = useState([
    "Brush",
    "Tool",
    "Bolt",
    "Outdoor",
    "Dinning",
    "Ceiling",
    "Furniture",
  ]);

  const suggestionBoxRef = useRef();
  const navigate = useNavigate(); // Add this hook

  // Load from localStorage on mount and debug
  useEffect(() => {
    const storedRecent = JSON.parse(localStorage.getItem("recentSearches")) || [];
    const storedViewed = JSON.parse(localStorage.getItem("viewedProducts")) || [];
    
    console.log("Loaded viewed products:", storedViewed); // Debug log
    
    setRecentSearches(storedRecent);
    setViewedProducts(storedViewed);
  }, []);

  // Refresh viewed products when suggestions show (to get latest data)
  useEffect(() => {
    if (showSuggestions) {
      const storedViewed = JSON.parse(localStorage.getItem("viewedProducts")) || [];
      setViewedProducts(storedViewed);
    }
  }, [showSuggestions]);

  // Debounced live suggestion fetch
  const fetchSuggestions = debounce(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowSuggestions(true); // still show dropdown even if input is cleared
      return;
    }

    try {
      const res = await axios.get(`https://pcp-szng.vercel.app/api/suggestions?q=${encodeURIComponent(searchTerm)}`);
      setSuggestions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
      setSuggestions([]); // fallback if API fails
    } finally {
      setShowSuggestions(true); // ✅ Always show dropdown
    }
  }, 300);

  // Check if user is actively typing (has query)
  const isTyping = query.trim().length > 0;

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  const handleSearch = (searchTerm) => {
    setQuery(searchTerm);
    onSearch(searchTerm);
    setShowSuggestions(false);

    // Save to recent searches
    let updated = [searchTerm, ...recentSearches.filter(item => item !== searchTerm)];
    if (updated.length > 5) updated = updated.slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

const handleProductClick = (product) => {
  console.log("Product clicked:", product);
  const productId = product.productId || product.id || product._id;

  if (productId) {
    navigate(`/product/${productId}`);
  } else {
    console.error("Product ID is missing:", product);
  }

  setShowSuggestions(false);
};

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  // Hide suggestions when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white">
      <form onSubmit={handleSubmit}>
        <div className="flex justify-center mt-6 relative" ref={suggestionBoxRef}>
          <div className="relative w-full max-w-2xl">
            <input
              type="text"
              placeholder="Search your products"
              className="w-full pr-12 text-sm focus:outline-none"
              style={{
                padding: "16px 20px",
                backgroundColor: "#E3E5FC66",
                border: "1.2px solid #5F43B2",
                borderRadius: "40px",
              }}
              onChange={handleChange}
              value={query}
              onFocus={() => setShowSuggestions(true)}
            />
            <button
              type="submit"
              className="absolute right-5 top-1/2 transform -translate-y-1/2 p-1 rounded transition hover:bg-gray-200"
            >
              <Search className="w-5 h-5 text-gray-500" />
            </button>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 mt-2 rounded-lg shadow-md overflow-hidden text-sm">
                {isTyping ? (
                  // Show only API suggestions when typing
                  suggestions.length > 0 && (
                    <ul>
                      {suggestions.map((s, i) => (
                        <li
                          key={i}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                          onClick={() => handleSearch(s)}
                        >
                          <Search className="w-4 h-4 text-gray-400 mr-3" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  // Show all sections when not typing
                  (recentSearches.length > 0 || viewedProducts.length > 0 || trending.length > 0) && (
                    <>
                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <div className="font-medium mb-1 text-gray-800">Recent Searches</div>
                          <div className="flex flex-wrap gap-2">
                            {recentSearches.map((item, idx) => (
                              <button
                                key={idx}
                                className="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 text-gray-700"
                                onClick={() => handleSearch(item)}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Previously Viewed */}
                      {viewedProducts.length > 0 && (
                        <div className="px-4 py-2 border-b border-gray-100">
                          <div className="font-medium mb-2 text-gray-800">Previously Viewed</div>
                          <div className="flex overflow-x-auto gap-3 pb-2">
                            {viewedProducts.map((product, idx) => (
                              <div 
                                key={idx} 
                                className="flex-shrink-0 w-20 text-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                onClick={() => handleProductClick(product)}
                              >
                                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg overflow-hidden">
                                  <img 
                                    src={product.image} 
                                    alt={product.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.target.src = "/placeholder.jpg";
                                    }}
                                  />
                                </div>
                                <div className="text-xs mt-1 text-gray-700 leading-tight" style={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {product.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trending Now */}
                      <div className="px-4 py-2">
                        <div className="font-medium mb-1 text-gray-800">Trending Now</div>
                        <div className="flex flex-wrap gap-2">
                          {trending.map((item, idx) => (
                            <button
                              key={idx}
                              className="bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 text-gray-700"
                              onClick={() => handleSearch(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
 