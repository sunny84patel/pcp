// controllers/productController.js

import { Product, Inventory, Image } from '../models/Product.js';

export const getPopularProducts = async (req, res) => {
  try {
    const { storeId = 'homedepot', limit = 10 } = req.query;

    const parsedLimit = Number(limit) > 0 ? Number(limit) : 10;

    // Get most popular inventory for this store
    const inventory = await Inventory.find({ storeId })
      .sort({ totalReviews: -1 }) // highest reviews first
      .limit(parsedLimit)
      .lean();

    if (!inventory || inventory.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const productIds = inventory.map(i => i.productId);

    // Get products and images
    const products = await Product.find({ productId: { $in: productIds } }).lean();
    const images = await Image.find({ productId: { $in: productIds } }).lean();

    // Maps for fast lookup
    const productMap = new Map(products.map(p => [p.productId, p]));
    const imagesMap = images.reduce((acc, img) => {
      if (!acc.has(img.productId)) acc.set(img.productId, []);
      acc.get(img.productId).push(img.url);
      return acc;
    }, new Map());

    // Build results in the same popularity order
    const results = inventory.map(inv => {
      const product = productMap.get(inv.productId) || {};

      return {
        productId: inv.productId,
        name: product.name || null,
        modelNo: product.modelNo || null,
        rating: inv.rating ?? null,
        totalReviews: inv.totalReviews ?? null,
        price: inv.price ?? null,
        listPrice: inv.listPrice ?? null,
        priceReduced: inv.priceReduced ?? null,
        currency: inv.currency ?? 'USD',
        storeId: inv.storeId,
        storeUrl: inv.url,
        images: imagesMap.get(inv.productId) || []
      };
    });

    res.status(200).json({ results });
  } catch (err) {
    console.error('❌ Popular products error:', err);
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
