import { Product, Inventory, Image } from '../models/Product.js';

export const getPriceDroppedProducts = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // Step 1: Randomly fetch products with price drop from ANY store
    const inventories = await Inventory.aggregate([
      {
        $match: {
          price_reduced: { $ne: null },
          price: { $ne: null },
          $expr: { $lt: ["$price", "$price_reduced"] }
        }
      },
      { $sample: { size: Number(limit) } }
    ]);

    let products = [];
    let images = [];

    if (inventories.length > 0) {
      const productIds = inventories.map(inv => inv.productId);

      products = await Product.find({ productId: { $in: productIds } }).lean();
      images = await Image.find({ productId: { $in: productIds } }).lean();
    }

    // Step 2: If no price dropped products, fallback to random products from any store
    if (inventories.length === 0) {
      const fallbackInventories = await Inventory.aggregate([
        { $match: { price: { $ne: null } } },
        { $sample: { size: Number(limit) } }
      ]);

      const fallbackIds = fallbackInventories.map(inv => inv.productId);

      products = await Product.find({ productId: { $in: fallbackIds } }).lean();
      images = await Image.find({ productId: { $in: fallbackIds } }).lean();

      inventories.push(...fallbackInventories);
    }

    // Step 3: Merge data
    const results = inventories.map(inv => {
      const product = products.find(p => p.productId === inv.productId);
      const productImages = images
        .filter(img => img.productId === inv.productId)
        .map(img => img.url);

      return {
        productId: product?.productId,
        name: product?.name,
        modelNo: product?.modelNo,
        rating: inv?.rating || null,
        price: inv?.price || null,
        priceReduced: inv?.price_reduced || null,
        savings:
          inv?.price_reduced && inv?.price
            ? Number((inv.price_reduced - inv.price).toFixed(2))
            : 0,
        percentageSaved:
          inv?.price_reduced && inv?.price
            ? Number(
                ((inv.price_reduced - inv.price) / inv.price_reduced * 100).toFixed(1)
              )
            : 0,
        currency: inv?.currency || "USD",
        storeId: inv?.storeId,
        storeUrl: inv?.url,
        images: productImages // Full array of URLs
      };
    });

    res.json(results);
  } catch (err) {
    console.error("Error fetching price dropped products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
