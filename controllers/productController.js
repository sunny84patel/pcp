// import Product from '../models/Product.js';
// import ProductStoreData from '../models/ProductStoreData.js';
// import { injectAffiliateUrl } from '../utils/affiliateUtil.js';

// export const searchProducts = async (req, res) => {
//   const query = req.query.q || '';
//   try {
//     const products = await Product.find({ searchText: new RegExp(query, 'i') });

//     const fullResults = await Promise.all(products.map(async (product) => {
//       const stores = await ProductStoreData.find({ productId: product.productId });
//       const enrichedStores = stores.map(store => ({
//         ...store.toObject(),
//         url: injectAffiliateUrl(store)
//       }));
//       return {
//         ...product.toObject(),
//         stores: enrichedStores
//       };
//     }));

//     res.json(fullResults);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch products' });
//   }
// };


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

    console.log('🔍 Incoming search:', {
      query, stores, page, limit, inStockOnly, sortBy, sortOrder
    });

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const storeMap = {
      lowes: "lowe's",
      "lowe's": "lowe's",
      homedepot: 'homedepot',
      'home depot': 'homedepot'
    };

    const escapedQuery = query
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .join('.*');

    const flexibleRegex = new RegExp(escapedQuery, 'i');

    let storeIds = stores
      ? stores.split(',').map(s => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase())
      : null;

    const isNumericQuery = /^\d+$/.test(query.trim());

    const inventoryQuery = {};
    if (storeIds?.length) {
      inventoryQuery.storeId = { $in: storeIds };
    }
    if (inStockOnly === 'true' || inStockOnly === true) {
      inventoryQuery.inventoryQuantity = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Base aggregation
    const pipeline = [
      { $match: inventoryQuery },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { 'product.name': { $regex: flexibleRegex } },
            { 'product.modelNo': { $regex: query, $options: 'i' } },
            ...(isNumericQuery ? [{ productId: query.trim() }] : [])
          ]
        }
      },
      {
        $group: {
          _id: '$productId',
          productId: { $first: '$productId' },
          name: { $first: '$product.name' },
          modelNo: { $first: '$product.modelNo' },
          brand: { $first: '$product.brand' },
          category: { $first: '$product.category' },
          stores: {
            $push: {
              storeId: '$storeId',
              price: '$price',
              currency: '$currency',
              inventoryQuantity: '$inventoryQuantity',
              rating: '$rating',
              totalReviews: '$totalReviews',
              url: '$url'
            }
          },
          minPrice: { $min: '$price' },
          maxRating: { $max: '$rating' },
          totalReviews: { $sum: '$totalReviews' }
        }
      }
    ];

    // Sorting logic
    const sortStage = {};
    const order = sortOrder === 'desc' ? -1 : 1;
    if (sortBy === 'price') {
      sortStage.minPrice = order;
    } else if (sortBy === 'reviews') {
      sortStage.totalReviews = order;
    } else if (sortBy === 'popularity') {
      sortStage.maxRating = order;
    } else {
      sortStage.name = order;
    }

    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) + 1 });

    const matchingProducts = await Inventory.aggregate(pipeline);

    const hasNextPage = matchingProducts.length > limit;
    const limitedProducts = hasNextPage
      ? matchingProducts.slice(0, limit)
      : matchingProducts;

    const productIds = limitedProducts.map(p => p.productId);
    const images = await Image.find({ productId: { $in: productIds } }).lean();

    const results = limitedProducts.map(product => {
      const productImages = images
        .filter(img => img.productId === product.productId)
        .map(img => img.url);

      return {
        productId: product.productId,
        name: product.name || 'Unknown Product',
        modelNo: product.modelNo || '',
        brand: product.brand || '',
        category: product.category || '',
        minPrice: product.minPrice || 0,
        rating: product.maxRating || 0,
        totalReviews: product.totalReviews || 0,
        stores: product.stores.map(store => ({
          ...store,
          images: productImages
        }))
      };
    });

    res.status(200).json({
      results,
      pagination: {
        currentPage: Number(page),
        hasNextPage
      },
      searchMethod: 'store-specific',
      searchedStores: storeIds || ['all stores']
    });

  } catch (error) {
    console.error('❌ Error in search API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

