import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../Components/Navbar/navbar";
import Footer from "../Components/Footer/Footer";
import { Star, Share2, Trash2, Bell, Clock3, ArrowLeft } from "lucide-react";
import { ClipLoader } from "react-spinners";

import homedepot from "../assets/images/homedepot.png";
import lowes from "../assets/images/lowes.png";
import offericon from "../assets/images/offericon.png";

// Import Redux actions
import { fetchWishlist, removeFromWishlist } from "../Redux/Reducers/WishlistSlice";
import { toggleCompare } from "../Redux/Reducers/CompareSlice";
import { useNavigate } from "react-router-dom";

// ===== small pieces =====
const Stars = ({ value }) => (
  <div className="flex items-center gap-1 text-xs text-gray-800 mt-2 mb-2">
    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    <span>{value}/5</span>
  </div>
);

const PriceTile = ({ product }) => {
  // Get first store entry (you could also loop if multiple stores exist)
  const storeData = product.stores?.[0] || {};
  const storeId = storeData.storeId?.toLowerCase();

  let storeLogo = homedepot; // default
  let storeDisplayName = "Home Depot";

  if (
    storeId === "lowe's" || storeId === "lowes" || storeId === "lowe" ||
    storeData.storeId?.toLowerCase().includes("lowe")
  ) {
    storeLogo = lowes;
    storeDisplayName = "Lowe's";
  } else if (
    storeId === "homedepot" || storeId === "home depot" || storeId === "home_depot" ||
    storeData.storeId?.toLowerCase().includes("depot")
  ) {
    storeLogo = homedepot;
    storeDisplayName = "Home Depot";
  }

  console.log("Product store detection:", {
    productId: product.productId,
    detected: storeDisplayName,
    storeId: storeData.storeId,
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <img src={storeLogo} alt={storeDisplayName} className="h-5 w-auto" />
        <span className="text-lg font-bold">
          {storeData.price ? `$${storeData.price}` : "N/A"}
        </span>
        {storeData.listPrice && (
          <span className="text-xs text-gray-400 line-through">
            ${storeData.listPrice}
          </span>
        )}
      </div>

      {storeData.listPrice && storeData.listPrice > storeData.price && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-green-700">
            Save ${(storeData.listPrice - storeData.price).toFixed(2)}
          </span>
          <span className="rounded bg-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-900">
            Lowest Price
          </span>
        </div>
      )}
    </div>
  );
};


const WishlistRow = ({ item, onDelete, isDeleting }) => {
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.compare.selected);

  return (
    <div className="rounded-xl border border-[#CFC7F2] bg-white px-4 py-3 shadow-sm relative">
      {/* Loading overlay for individual item deletion */}
      {isDeleting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl z-10">
          <ClipLoader color="#5F43B2" size={30} />
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="flex-shrink-0">
          <img 
            src={item.images?.[0] || "/placeholder-product.jpg"} 
            alt={item.name} 
            className="h-20 w-20 object-contain" 
          />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1">
          {/* Title + Stars */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
          </div>
          
          {/* Model number */}
          {item.modelNo && (
            <div className="text-xs text-gray-600 mb-1">{item.modelNo}</div>
          )}
          
          <Stars value={item.stores?.[0]?.rating || 0} />

          {/* Prices + Offers */}
          <div className="mt-1 flex items-center gap-4">
            <PriceTile product={item} />
            
            {/* Divider */}
            <div className="h-10 w-px bg-gray-300" />
            
            {/* Offers - Using static data since API might not have this */}
            <div>
              <div className="text-sm font-medium text-gray-900">3 Offers</div>
              <div className="mt-1 flex items-center gap-1">
                <img src={offericon} alt="" className="h-5 w-auto object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-6 ml-4">
          <div className="flex gap-2">
            <button className="rounded-full p-2 hover:bg-gray-100" title="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"
              title="Delete"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <button className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-black">
            <span>Set Price Alert</span>
            <Clock3 className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
            <span>Add to Compare</span>
            <input 
              type="checkbox" 
              className="h-4 w-4 accent-[#5F43B2]"
              checked={selected.includes(item.productId)}
              onChange={() => dispatch(toggleCompare(item.productId))}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

// ===== page =====
export default function WishlistPage() {
  const dispatch = useDispatch();
  const { products: wishlistProducts, loading, error } = useSelector((state) => state.wishlist);
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [clearingAll, setClearingAll] = useState(false);
    const navigate = useNavigate();

  // Fetch wishlist on component mount
  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  // Handle item removal
  const handleRemove = async (productId) => {
    setDeletingItems(prev => new Set(prev).add(productId));
    
    try {
      await dispatch(removeFromWishlist(productId)).unwrap();
    } catch (error) {
      console.error("Failed to remove item:", error);
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      // You might want to implement a clearAllWishlist action in your slice
      // For now, remove items one by one
      for (const product of wishlistProducts) {
        await dispatch(removeFromWishlist(product.productId));
      }
    } catch (error) {
      console.error("Failed to clear all items:", error);
    } finally {
      setClearingAll(false);
    }
  };

  if (loading && wishlistProducts.length === 0) {
    return (
      <>
        <Navbar />
        <div className="mx-auto w-full max-w-7xl px-4 py-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ClipLoader color="#5F43B2" size={50} />
            <p className="mt-4 text-gray-500">Loading your wishlist...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          <div className="text-center text-red-500 py-8">
            <div className="mb-4">❌</div>
            <div className="text-lg font-semibold mb-2">Error loading wishlist</div>
            <div className="text-sm">{error.message || error}</div>
            <button 
              className="mt-4 px-4 py-2 bg-[#5F43B2] text-white rounded-lg hover:bg-[#4F33A2] transition-colors"
              onClick={() => dispatch(fetchWishlist())}
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* top bar (title + actions) */}
        <div
          className="flex justify-between items-end pb-3 mb-8"
          style={{ borderBottom: "1px solid #ABA9A980" }}
        >
          <div className="flex items-center gap-3 text-[18px] font-semibold">
          <button
            onClick={() => navigate(-1)} // go back one step in history
            className="flex items-center gap-1 text-black-600 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium ">Back</span>
          </button>

          <div>
            My Wishlist
            <span className="ml-2 text-sm font-normal text-gray-500">
              {wishlistProducts.length} products in your wishlist
            </span>
          </div>
        </div>
          <div className="flex items-center gap-6 text-sm">
            <button 
              className="text-gray-700 hover:text-black disabled:opacity-50 flex items-center gap-2"
              onClick={handleClearAll}
              disabled={loading || wishlistProducts.length === 0 || clearingAll}
            >
              {clearingAll ? (
                <>
                  <ClipLoader color="#5F43B2" size={16} />
                  <span>Clearing...</span>
                </>
              ) : (
                "Clear All"
              )}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {wishlistProducts.length === 0 && !loading ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">💝</div>
            <div className="text-gray-500 text-lg mb-4">Your wishlist is empty</div>
            <div className="text-gray-400 mb-6">Start adding products you love!</div>
            <button className="px-6 py-3 bg-[#5F43B2] text-white rounded-lg hover:bg-[#4F33A2] transition-colors">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            {/* rows */}
            <div className="space-y-4">
              {wishlistProducts.map((item) => (
                <WishlistRow 
                  key={item.productId} 
                  item={item} 
                  onDelete={() => handleRemove(item.productId)}
                  isDeleting={deletingItems.has(item.productId)}
                />
              ))}
            </div>

            {/* pagination - you might want to implement this based on your API */}
            {wishlistProducts.length > 10 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  &lt; Previous
                </button>
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`h-8 w-8 rounded-full text-sm ${
                      n === 1 ? "bg-[#5F43B2] text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  Next &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}