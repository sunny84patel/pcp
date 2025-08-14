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
