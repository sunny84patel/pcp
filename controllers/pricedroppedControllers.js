import { Product, Inventory, Image } from '../models/Product.js';

export const getPriceDroppedProducts = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    // 👉 Step 1: Only inventories where there is a real discount:
    // listPrice (discounted) < price (actual)
    const inventories = await Inventory.aggregate([
      {
        $match: {
          price: { $ne: null },
          listPrice: { $ne: null },
          $expr: { $lt: ["$listPrice", "$price"] }  // listPrice < price
        }
      },
      { $sample: { size: Number(limit) } }
    ]);

    // If you truly want *only* discounted products, no fallback:
    if (inventories.length === 0) {
      return res.json([]);
    }

    const productIds = inventories.map(inv => inv.productId);

    const [products, images] = await Promise.all([
      Product.find({ productId: { $in: productIds } }).lean(),
      Image.find({ productId: { $in: productIds } }).lean()
    ]);

    // Step 2: Merge data
    const results = inventories.map(inv => {
      const product = products.find(p => p.productId === inv.productId);
      const productImages = images
        .filter(img => img.productId === inv.productId)
        .map(img => img.url);

      // ✅ Your semantics:
      // price = original/current actual price (higher)
      // listPrice = discounted price (lower)
      const hasDiscount =
        inv?.price != null &&
        inv?.listPrice != null &&
        inv.listPrice < inv.price;

      const savings = hasDiscount
        ? Number((inv.price - inv.listPrice).toFixed(2))
        : 0;

      // e.g. "you save 20% off original price"
      const percentageSaved = hasDiscount
        ? Number(((inv.price - inv.listPrice) / inv.price * 100).toFixed(1))
        : 0;

      return {
        productId: product?.productId,
        name: product?.name,
        modelNo: product?.modelNo,
        rating: inv?.rating ?? null,
        // 👇 keep both so frontend can show "Now / Was"
        price: inv?.price ?? null,        // original/current price
        listPrice: inv?.listPrice ?? null, // discounted price
        priceReduced: inv?.priceReduced ?? null, // legacy field if you still use it
        savings,
        percentageSaved,
        currency: inv?.currency || "USD",
        storeId: inv?.storeId,
        storeUrl: inv?.url,
        images: productImages
      };
    });

    res.json(results);
  } catch (err) {
    console.error("Error fetching price dropped products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
