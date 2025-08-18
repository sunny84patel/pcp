import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import axios from "axios";
import debounce from "lodash.debounce"; // npm install lodash.debounce
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  // Helper function to safely get from localStorage (matching your system)
  const getFromStorage = (key, defaultValue = []) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error parsing ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // Helper function to safely set to localStorage
  const setToStorage = (key, value) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  // Load from localStorage on mount (compatible with your existing system)
  useEffect(() => {
    const storedRecent = getFromStorage("recentSearches", []);
    
    // Try both localStorage keys to match your existing system
    const recentlyViewed = getFromStorage("recentlyViewed", []);
    const viewedProducts = getFromStorage("viewedProducts", []);
    
    // Combine and deduplicate based on productId
    const combined = [...recentlyViewed, ...viewedProducts];
    const uniqueProducts = combined.reduce((acc, product) => {
      if (product && product.productId && !acc.find(p => p.productId === product.productId)) {
        acc.push(product);
      }
      return acc;
    }, []);
    
    console.log("SearchBar - Loaded recent searches:", storedRecent);
    console.log("SearchBar - Loaded viewed products:", uniqueProducts);
    
    setRecentSearches(storedRecent);
    setViewedProducts(uniqueProducts);
  }, []);

  // Refresh viewed products when suggestions show (to get latest data)
  useEffect(() => {
    if (showSuggestions) {
      const recentlyViewed = getFromStorage("recentlyViewed", []);
      const viewedProducts = getFromStorage("viewedProducts", []);
      
      const combined = [...recentlyViewed, ...viewedProducts];
      const uniqueProducts = combined.reduce((acc, product) => {
        if (product && product.productId && !acc.find(p => p.productId === product.productId)) {
          acc.push(product);
        }
        return acc;
      }, []);
      
      setViewedProducts(uniqueProducts);
    }
  }, [showSuggestions]);

  // Debounced live suggestion fetch
  const fetchSuggestions = debounce(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowSuggestions(true);
      return;
    }

    try {
      const res = await axios.get(`https://pcp-szng.vercel.app/api/suggestions?q=${encodeURIComponent(searchTerm)}`);
      setSuggestions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
      setSuggestions([]);
    } finally {
      setShowSuggestions(true);
    }
  }, 300);

  // Check if user is actively typing
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
    if (updated.length > 10) updated = updated.slice(0, 10);
    setRecentSearches(updated);
    setToStorage("recentSearches", updated);
  };

  const handleProductClick = (product) => {
    console.log("SearchBar - Product clicked:", product);
    
    const productId = product.productId || product.id || product._id || product.product_id;

    if (productId) {
      navigate(`/product/${productId}`);
    } else {
      console.error("SearchBar - Product ID is missing:", product);
      // Fallback: search for the product name
      if (product.name || product.title) {
        handleSearch(product.name || product.title);
      }
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

  // Helper function to get proper image URL (matching your system)
  const getImageUrl = (product) => {
    // Handle different possible image field structures
    let imageUrl = null;
    
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      imageUrl = product.images[0];
    } else if (product.image) {
      imageUrl = Array.isArray(product.image) ? product.image[0] : product.image;
    } else if (product.thumbnail) {
      imageUrl = product.thumbnail;
    } else if (product.photo) {
      imageUrl = product.photo;
    } else if (product.imageUrl) {
      imageUrl = product.imageUrl;
    }
    
    // Fallback to placeholder if no image found
    if (!imageUrl) {
      return "/placeholder.jpg";
    }
    
    // Handle relative URLs
    if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("/") || imageUrl.startsWith("./")) {
        return imageUrl;
      }
      if (!imageUrl.startsWith("http")) {
        return `https://${imageUrl}`;
      }
    }
    
    return imageUrl || "/placeholder.jpg";
  };

  // Helper function to truncate product names
  const truncateName = (name, maxLength = 35) => {
    if (!name) return "Unknown Product";
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  // Helper function to get product name (matching your data structure)
  const getProductName = (product) => {
    return product.name || product.title || "Unknown Product";
  };

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
              <div className="absolute z-50 w-full bg-white border border-gray-200 mt-2 rounded-lg shadow-lg overflow-hidden text-sm max-h-96 overflow-y-auto">
                {isTyping ? (
                  // Show only API suggestions when typing
                  suggestions.length > 0 ? (
                    <ul>
                      {suggestions.map((s, i) => (
                        <li
                          key={i}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center transition-colors"
                          onClick={() => handleSearch(s)}
                        >
                          <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                          <span className="truncate">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-6 text-gray-500 text-center">
                      <Search className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                      <div>No suggestions found</div>
                    </div>
                  )
                ) : (
                  // Show all sections when not typing
                  <>
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-semibold mb-2 text-gray-800 flex items-center text-sm">
                          <Search className="w-4 h-4 mr-2 text-gray-600" />
                          Recent Searches
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.slice(0, 8).map((item, idx) => (
                            <button
                              key={idx}
                              className="bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 text-gray-700 transition-colors text-xs font-medium"
                              onClick={() => handleSearch(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Previously Viewed Products */}
                    {viewedProducts.length > 0 && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="font-semibold mb-3 text-gray-800 text-sm">
                          Previously Viewed
                        </div>
                        <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                          {viewedProducts.slice(0, 12).map((product, idx) => (
                            <div 
                              key={`${product.productId}-${idx}`}
                              className="flex flex-col items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all duration-200 group"
                              onClick={() => handleProductClick(product)}
                            >
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mb-2 border border-gray-200 group-hover:shadow-md transition-all duration-200">
                                <img 
                                  src={getImageUrl(product)} 
                                  alt={getProductName(product)} 
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    e.target.onerror = null; // Prevent infinite loop
                                    e.target.src = "/placeholder.jpg";
                                  }}
                                  loading="lazy"
                                />
                              </div>
                              <div 
                                className="text-xs text-gray-700 text-center leading-tight w-full group-hover:text-gray-900 transition-colors"
                                title={getProductName(product)}
                                style={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {truncateName(getProductName(product))}
                              </div>
                              {product.rating > 0 && (
                                <div className="flex items-center mt-1">
                                  <svg
                                    className="w-3 h-3 fill-yellow-400 text-yellow-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 15l-5.878 3.09 1.122-6.545L0.488 6.91l6.564-.955L10 0l2.948 5.955 6.564.955-4.756 4.635 1.122 6.545z" />
                                  </svg>
                                  <span className="text-xs text-gray-500 ml-1">
                                    {product.rating}/5
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {viewedProducts.length > 12 && (
                          <div className="text-center mt-3">
                            <button 
                              className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                              onClick={() => {
                                // Navigate to a dedicated recently viewed page or show all
                                console.log("View all recently viewed clicked");
                                setShowSuggestions(false);
                              }}
                            >
                              View all {viewedProducts.length} products →
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Trending Now */}
                    <div className="px-4 py-3">
                      <div className="font-semibold mb-2 text-gray-800 text-sm">
                        Trending Now
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {trending.map((item, idx) => (
                          <button
                            key={idx}
                            className="bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-1.5 rounded-full hover:from-purple-200 hover:to-blue-200 text-gray-700 transition-all text-xs font-medium border border-purple-200"
                            onClick={() => handleSearch(item)}
                          >
                            🔥 {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Show message when no data is available */}
                    {recentSearches.length === 0 && viewedProducts.length === 0 && (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                        <div className="text-sm font-medium">Start typing to search for products</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Your recent searches and viewed products will appear here
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Enhanced utility function to add a product to viewed products (matching your data structure)
export const addToViewedProducts = (product) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      console.warn("localStorage is not available");
      return;
    }

    console.log("Adding product to viewed:", product);
    
    // Get existing viewed products from both possible keys
    const recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    const viewedProducts = JSON.parse(localStorage.getItem("viewedProducts") || "[]");
    
    // Create the product object matching your ProductDetailsPage structure
    const productToStore = {
      productId: product.productId || product.id || product._id,
      name: product.title || product.name || "Unknown Product",
      rating: product.rating || 0,
      images: product.images || [],
      timestamp: Date.now()
    };

    // Remove existing entries to avoid duplicates
    const filteredRecent = recentlyViewed.filter(p => 
      p.productId !== productToStore.productId
    );
    const filteredViewed = viewedProducts.filter(p => 
      p.productId !== productToStore.productId
    );
    
    // Add to front and limit items
    const updatedRecent = [productToStore, ...filteredRecent].slice(0, 20);
    const updatedViewed = [productToStore, ...filteredViewed].slice(0, 20);
    
    // Save to both keys for compatibility
    localStorage.setItem("recentlyViewed", JSON.stringify(updatedRecent));
    localStorage.setItem("viewedProducts", JSON.stringify(updatedViewed));
    
    console.log("Product saved successfully:", productToStore);
  } catch (error) {
    console.error("Error adding product to viewed:", error);
    // Try to clear corrupted data
    try {
      localStorage.removeItem("recentlyViewed");
      localStorage.removeItem("viewedProducts");
    } catch (clearErr) {
      console.error("Could not clear localStorage:", clearErr);
    }
  }
};

export default SearchBar;