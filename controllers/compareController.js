// controllers/compareController.js
import { Product, Inventory, Store, Image } from "../models/Product.js";

export const compareProducts = async (req, res) => {
  try {
    const { productIds } = req.body; // array of productIds

    if (!productIds || productIds.length < 1) {
      return res.status(400).json({ message: "Please select at least 1 products to compare." });
    }

    // Fetch products
    const products = await Product.find({ productId: { $in: productIds } }).lean();

    if (!products.length) {
      return res.status(404).json({ message: "No products found." });
    }

    // Fetch related inventories
    const inventories = await Inventory.find({ productId: { $in: productIds } }).lean();

    // Fetch related stores
    const storeIds = inventories.map((inv) => inv.storeId);
    const stores = await Store.find({ _id: { $in: storeIds } }).lean();
    const storeMap = Object.fromEntries(stores.map((s) => [s._id, s]));

    // Fetch images
    const images = await Image.find({ productId: { $in: productIds } }).lean();
    const imageMap = {};
    images.forEach((img) => {
      if (!imageMap[img.productId]) imageMap[img.productId] = [];
      imageMap[img.productId].push(img.url);
    });

    // Format response
    const result = products.map((product) => {
      const productInventories = inventories
        .filter((inv) => inv.productId === product.productId)
        .map((inv) => ({
          storeId: inv.storeId,
          storeName: storeMap[inv.storeId]?.name || inv.storeId,
          price: inv.price,
          listPrice: inv.listPrice,
          priceReduced: inv.priceReduced,
          currency: inv.currency,
          stock: inv.inventoryQuantity,
          rating: inv.rating,
          totalReviews: inv.totalReviews,
          url: inv.url,
          saleEndDate: inv.saleEndDate,
        }));

      return {
        productId: product.productId,
        name: product.name,
        modelNo: product.modelNo,
        brand: product.brand,
        category: product.category,
        images: imageMap[product.productId] || [],
        stores: productInventories,
      };
    });

    res.json({ comparedProducts: result });
  } catch (error) {
    console.error("Compare Products Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
