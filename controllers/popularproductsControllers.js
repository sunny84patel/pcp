// controllers/productController.js

import { Product, Inventory, Image } from '../models/Product.js';

export const getPopularProducts = async (req, res) => {
  try {
    const { storeId = 'homedepot', limit = 10 } = req.query;

    // Randomly sample inventory items for the store
    const inventory = await Inventory.aggregate([
      { $match: { storeId } },
      { $sample: { size: Number(limit) } } // Random selection
    ]);

    const productIds = inventory.map(i => i.productId);

    // Get matching products and images
    const products = await Product.find({ productId: { $in: productIds } }).lean();
    const images = await Image.find({ productId: { $in: productIds } }).lean();

    // Merge data into final result
    const results = products.map(product => {
      const inv = inventory.find(i => i.productId === product.productId);
      const productImages = images
        .filter(img => img.productId === product.productId)
        .map(img => img.url);

      return {
        productId: product.productId,
        name: product.name,
        modelNo: product.modelNo,
        rating: inv?.rating || null,
        price: inv?.price || null,
        listPrice: inv?.listPrice || null,
        currency: inv?.currency || 'USD',
        storeId: inv?.storeId,
        storeUrl: inv?.url,
        images: productImages
      };
    });

    res.status(200).json({ results });
  } catch (err) {
    console.error('❌ Random products error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductsByIds = async (req, res) => {
  try {
    const ids = req.query.ids?.split(',').map(id => id.trim());

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: 'Missing product IDs' });
    }

    const products = await Product.find({ productId: { $in: ids } }).lean();
    const inventories = await Inventory.find({ productId: { $in: ids } }).lean();
    const images = await Image.find({ productId: { $in: ids } }).lean();

    const results = products.map(product => {
      const inv = inventories.find(i => i.productId === product.productId);
      const productImages = images.filter(img => img.productId === product.productId).map(img => img.url);
      return {
        productId: product.productId,
        name: product.name,
        modelNo: product.modelNo,
        rating: inv?.rating || null,
        price: inv?.price || null,
        listPrice: inv?.listPrice || null,
        currency: inv?.currency || 'USD',
        storeId: inv?.storeId,
        storeUrl: inv?.url,
        images: productImages
      };
    });

    res.status(200).json({ results });
  } catch (err) {
    console.error('❌ Recently viewed error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExploreProducts = async (req, res) => {
  try {
    const stores = (req.query.stores || "homedepot,lowe's")
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const perStore = Math.max(1, Math.min(Number(req.query.perStore) || 6, 50)); // clamp 1..50

    // Sample per store in parallel
    const inventoriesByStore = await Promise.all(
      stores.map(storeId =>
        Inventory.aggregate([
          { $match: { storeId } },
          { $sample: { size: perStore } }
        ])
      )
    );

    // flatten inventories to an array of inventory docs (preserves per-store samples)
    const inventories = inventoriesByStore.flat();

    // gather unique productIds to fetch product & images
    const productIds = [...new Set(inventories.map(i => i.productId))];

    const [products, images] = await Promise.all([
      Product.find({ productId: { $in: productIds } }).lean(),
      Image.find({ productId: { $in: productIds } }).lean()
    ]);

    // Map inventories -> response entries (one entry per inventory, so 6 per store ideally)
    const results = inventories
      .map(inv => {
        const product = products.find(p => p.productId === inv.productId);
        if (!product) return null; // skip if product metadata missing

        const productImages = images
          .filter(img => img.productId === inv.productId)
          .map(img => img.url);

        return {
          productId: product.productId,
          name: product.name,
          modelNo: product.modelNo,
          rating: inv?.rating ?? null,
          price: inv?.price ?? null,
          listPrice: inv?.listPrice ?? null,
          currency: inv?.currency ?? 'USD',
          storeId: inv?.storeId,
          storeUrl: inv?.url,
          images: productImages
        };
      })
      .filter(Boolean);

    res.status(200).json({ results });
  } catch (err) {
    console.error('❌ getExploreProducts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};