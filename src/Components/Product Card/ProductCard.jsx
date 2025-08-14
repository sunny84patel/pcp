import { Heart } from "lucide-react";
import React from "react";
import homedepot from "../../assets/images/homedepot.png";
import lowes from "../../assets/images/lowes.png";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const firstStore = product.stores?.[0];
  const productImage = firstStore?.images?.[0] || "/placeholder-product.jpg";

  const getStoreLogo = (storeId) =>
    storeId === "homedepot" ? homedepot : lowes;

  return (
    <Link
      to={`/product/${product.productId}`}
      className="px-2"
      style={{ width: `${100 / product.length}%` }}
    >
      <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
        {/* Heart icon */}
        <div className="relative aspect-square">
          <button className="absolute top-3 right-3 p-2 bg-[#E3E5FC] rounded-xl shadow-sm hover:shadow-md cursor-pointer">
            <Heart className="w-5 h-5 text-black" />
          </button>
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

          {/* Model number with requested color */}
          <div style={{ color: "#0000008A" }} className="text-xs mb-1">
            Model #DE6702{product.model}
          </div>

          <div className="text-xs text-gray-600">
            ⭐ {firstStore?.rating || 0}/5
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

        {/* Add to Compare - Appears on hover */}
        <div className="absolute bottom-3 left-4 flex items-center space-x-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <input type="checkbox" id={`compare-${product.id}`} />
          <label htmlFor={`compare-${product.id}`} className="text-black">
            Add to Compare
          </label>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
