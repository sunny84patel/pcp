import { Heart } from "lucide-react";
import React, { useState } from "react";
import homedepot from "../../assets/images/homedepot.png";
import lowes from "../../assets/images/lowes.png";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toggleCompare } from "../../Redux/Reducers/CompareSlice";
import {
  addToWishlist,
  removeFromWishlist,
} from "../../Redux/Reducers/WishlistSlice";
import { toast } from "react-hot-toast";
const ProductCard = ({ product }) => {
  const firstStore = product.stores?.[0];
  const productImage = firstStore?.images?.[0] || "/placeholder-product.jpg";
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.compare.selected);
  const { isAuthenticated } = useSelector((state) => state.otp);

  // Local wishlist state for UI toggle
  const [localWishlist, setLocalWishlist] = useState([]);

  const getStoreLogo = (storeId) =>
    storeId === "homedepot" ? homedepot : lowes;

  // Check local wishlist
  const isInWishlist = (productId) => localWishlist.includes(productId);

  // Toggle wishlist (UI + API)
  const handleWishlistToggle = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login first to use wishlist!");
      navigate("/login", { state: { from: location }, replace: true });
      return;
    }

    if (isInWishlist(productId)) {
      // Remove from wishlist
      setLocalWishlist((prev) => prev.filter((id) => id !== productId));
      dispatch(removeFromWishlist(productId));
    } else {
      // Add to wishlist
      setLocalWishlist((prev) => [...prev, productId]);
      dispatch(addToWishlist(productId));
    }
  };

  return (
    <div
      className="px-2"
      style={{ width: `${100 / product.length}%` }}
    >
      <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
        {/* Product image and details wrapped with Link */}
        <Link to={`/product/${product.productId}`}>
          <div className="relative aspect-square">
            <img
              src={productImage}
              alt={product.name}
              className="object-contain w-full h-full"
            />
          </div>

          {/* Product details */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
              {product.name}
            </h3>

            <div style={{ color: "#0000008A" }} className="text-xs mb-1">
              {product.
                modelNo
              }
            </div>

            <div className="text-xs text-gray-600">
              ⭐ {product?.rating || 0}/5
            </div>

            <div className="mt-2">
              <div className="flex items-start justify-between">
                {/* Store logos */}
                <div className="space-y-2">
                  {product.stores.map((store, idx) => (
                    <img
                      key={idx}
                      src={getStoreLogo(store.storeId)}
                      alt={store.storeId}
                      className="h-8 w-auto"
                    />
                  ))}
                </div>

                {/* Prices */}
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">
                    ${firstStore?.price?.toFixed(2)}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    {firstStore?.inventoryQuantity > 0
                      ? `${firstStore.inventoryQuantity} in stock`
                      : "Out of stock"}
                  </div>
                  {firstStore.listPrice && (
                    <div className="text-xs text-green-600 font-medium">
                      Save $
                      {Number(firstStore.listPrice - firstStore.price).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Heart button - Separated from Link, positioned absolutely */}
        <button
          onClick={(e) => handleWishlistToggle(e, product.productId)}
          className={`absolute top-5 right-5 p-2 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${isInWishlist(product.productId)
            ? "bg-red-100 hover:bg-red-200"
            : "bg-[#E3E5FC] hover:bg-[#D1D5F7]"
            }`}
          style={{ zIndex: 20 }}
        >
          {isInWishlist(product.productId) ? (
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          ) : (
            <Heart className="w-5 h-5 text-black" />
          )}
        </button>

        {/* Compare checkbox - Outside Link so it won't redirect */}
        <div className="absolute bottom-3 left-4 flex items-center space-x-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <input
            type="checkbox"
            id={`compare-${product.productId}`}
            checked={selected.includes(product.productId)}
            onChange={() => {
              if (!isAuthenticated) {
                toast.error("Please login first to compare products!");
                // navigate("/login", { state: { from: location }, replace: true });
                return;
              }
              dispatch(toggleCompare(product.productId));
            }}
          />
          <label htmlFor={`compare-${product.productId}`} className="text-black cursor-pointer">
            Add to Compare
          </label>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;