// controllers/productController.js
import { Product, Inventory, Image } from '../models/Product.js';

export const searchProducts = async (req, res) => {
  try {
    const {
      query,
      stores,
      page = 1,
      limit = 20,
      inStockOnly = false,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const storeMap = {
      lowes: "lowe's",
      "lowe's": "lowe's",
      homedepot: 'homedepot',
      'home depot': 'homedepot'
    };

    const storeIds = stores
      ? stores.split(',').map(s => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase())
      : null;

    const isNumericQuery = /^\d+$/.test(query.trim());

    // Step 1: Search products using $text index OR numeric / modelNo query
    const productFilter = {
      $or: [
        { $text: { $search: query } }, // uses text index
        { modelNo: { $regex: query, $options: 'i' } },
        ...(isNumericQuery ? [{ productId: query.trim() }] : [])
      ]
    };

    const matchedProducts = await Product.find(productFilter)
      .lean()
      .select('productId name modelNo brand category');

    const productIds = matchedProducts.map(p => p.productId);
    if (!productIds.length) {
      return res.status(200).json({
        results: [],
        totalResults: 0,
        pagination: { 
          currentPage: Number(page), 
          hasNextPage: false,
          totalResults: 0,
          totalPages: 0
        },
        searchMethod: 'text-index',
        searchedStores: storeIds || ['all stores']
      });
    }

    // Step 2: Query Inventory using indexed fields and $in
    const inventoryFilter = {
      productId: { $in: productIds },
      ...(storeIds ? { storeId: { $in: storeIds } } : {}),
      ...(inStockOnly === 'true' || inStockOnly === true ? { inventoryQuantity: { $gt: 0 } } : {})
    };

    // Get total count for pagination (before skip/limit)
    const totalInventoryCount = await Inventory.countDocuments(inventoryFilter);

    const skip = (Number(page) - 1) * Number(limit);
    const inventoryDocs = await Inventory.find(inventoryFilter)
      .sort(getSortOption(sortBy, sortOrder))
      .skip(skip)
      .limit(Number(limit) + 1)
      .lean();

    const hasNextPage = inventoryDocs.length > limit;
    const limitedInventory = hasNextPage ? inventoryDocs.slice(0, limit) : inventoryDocs;

    // Step 3: Fetch all images for these products
    const images = await Image.find({ productId: { $in: productIds } }).lean();

    // Step 4: Merge Product + Inventory + Images
    const productMap = Object.fromEntries(matchedProducts.map(p => [p.productId, p]));

    const resultMap = {};
    limitedInventory.forEach(inv => {
      const prod = productMap[inv.productId] || {};
      const imgUrls = images.filter(img => img.productId === inv.productId).map(i => i.url);

      if (!resultMap[inv.productId]) {
        resultMap[inv.productId] = {
          productId: inv.productId,
          name: prod.name || 'Unknown Product',
          modelNo: prod.modelNo || '',
          brand: prod.brand || '',
          category: prod.category || '',
          minPrice: inv.price || 0,
          rating: inv.rating || 0,
          totalReviews: inv.totalReviews || 0,
          stores: []
        };
      }

      resultMap[inv.productId].stores.push({
        ...inv,
        images: imgUrls
      });
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalInventoryCount / Number(limit));
    const totalUniqueProducts = Object.keys(resultMap).length;

    res.status(200).json({
      results: Object.values(resultMap),
      totalResults: totalInventoryCount, // Total inventory items across all pages
      totalProducts: totalUniqueProducts, // Total unique products on current page
      pagination: { 
        currentPage: Number(page), 
        hasNextPage,
        totalResults: totalInventoryCount,
        totalPages,
        limit: Number(limit)
      },
      searchMethod: 'text-index',
      searchedStores: storeIds || ['all stores']
    });

  } catch (error) {
    console.error('❌ Error in search API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper for sorting
const getSortOption = (sortBy, sortOrder) => {
  const order = sortOrder === 'desc' ? -1 : 1;
  if (sortBy === 'price') return { price: order };
  if (sortBy === 'reviews') return { totalReviews: order };
  if (sortBy === 'popularity') return { rating: order };
  return { name: order };
};