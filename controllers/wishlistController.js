// controllers/wishlistController.js
import { Wishlist } from "../models/wishlist.js";
import { Product, Inventory, Image } from "../models/Product.js";

// Add to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    console.log("Adding product to wishlist:", productId);
    const userId = req.user.id;
    console.log("User ID from token:", userId);

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    if (!wishlist.products.includes(productId)) {
      wishlist.products.push(productId);
    }

    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    wishlist.products = wishlist.products.filter((id) => id !== productId);

    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get wishlist with full details
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist || wishlist.products.length === 0) {
      return res.json({ products: [] });
    }

    // Get product details
    const products = await Product.find({ productId: { $in: wishlist.products } });

    // Get images for these products
    const images = await Image.aggregate([
      { $match: { productId: { $in: wishlist.products } } },
      {
        $group: {
          _id: "$productId",
          urls: { $push: "$url" }
        }
      }
    ]);

    // Get inventory data (latest pricing, reviews, rating)
    const inventory = await Inventory.aggregate([
      { $match: { productId: { $in: wishlist.products } } },
      {
        $group: {
          _id: "$productId",
          stores: {
            $push: {
              storeId: "$storeId",
              price: "$price",
              listPrice: "$listPrice",
              priceReduced: "$priceReduced",
              currency: "$currency",
              inventoryQuantity: "$inventoryQuantity",
              rating: "$rating",
              totalReviews: "$totalReviews",
              url: "$url"
            }
          }
        }
      }
    ]);

    // Merge all data
    const productMap = {};
    products.forEach((p) => {
      productMap[p.productId] = {
        productId: p.productId,
        name: p.name,
        modelNo: p.modelNo,
        brand: p.brand,
        category: p.category,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        images: [],
        stores: []
      };
    });

    images.forEach((img) => {
      if (productMap[img._id]) {
        productMap[img._id].images = img.urls;
      }
    });

    inventory.forEach((inv) => {
      if (productMap[inv._id]) {
        productMap[inv._id].stores = inv.stores;
      }
    });

    const result = Object.values(productMap);

    res.json({ products: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
