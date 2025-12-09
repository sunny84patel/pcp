// import express from 'express';
// import Product from '../models/Product.js';
// import ProductStoreData from '../models/ProductStoreData.js';

// const router = express.Router();

// router.get('/search', async (req, res) => {
//     const query = req.query.query || '';
//     const requestedStores = req.query.stores?.split(',') || ['home_depot', 'lowes'];

//     try {
//         // Step 1: Match all products by search query
//         const matchedProducts = await Product.find({
//             searchText: { $regex: query.trim(), $options: 'i' }
//         }).limit(50);

//         const productIds = matchedProducts.map(p => p.productId);

//         // Step 2: Fetch store data only from requested stores
//         const storeData = await ProductStoreData.find({
//             productId: { $in: productIds },
//             store: { $in: requestedStores }
//         });

//         // Step 3: Map product ID to store-specific data
//         const productMap = {};

//         matchedProducts.forEach(p => {
//             const filteredStores = storeData
//                 .filter(s => s.productId === p.productId)
//                 .map(s => s.toObject());

//             // Only include product if it has at least one matching store
//             if (filteredStores.length > 0) {
//                 productMap[p.productId] = {
//                     ...p.toObject(),
//                     stores: filteredStores
//                 };
//             }
//         });

//         const result = Object.values(productMap);
//         res.json({ count: result.length, results: result });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Search failed' });
//     }
// });


// /**
//  * Product Detail Endpoint
//  * GET /api/products/:id/details
//  */
// router.get('/products/:id/details', async (req, res) => {
//     const productId = req.params.id;

//     try {
//         const product = await Product.findOne({ productId });
//         if (!product) {
//             return res.status(404).json({ message: 'Product not found' });
//         }

//         const storeData = await ProductStoreData.find({ productId });

//         res.json({
//             ...product.toObject(),
//             stores: storeData.map(s => s.toObject())
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Product detail fetch failed' });
//     }
// });

// export default router;


import express from 'express';
// Use the new production-grade search controller
import { 
  searchProducts, 
  getSearchSuggestions, 
  getAvailableFilters 
} from '../controllers/productSearchController.js';
// Keep old controller for fallback if needed
// import { searchProducts as searchProductsOld } from '../controllers/productController.js';
import { getPopularProducts, getProductsByIds } from '../controllers/popularproductsControllers.js';
import { unifiedProductSearch } from '../controllers/typesenseController.js';
import {Product} from "../models/Product.js";
import { getPriceDroppedProducts } from '../controllers/pricedroppedControllers.js';
import { getExploreProducts } from '../controllers/popularproductsControllers.js';
import esClient from '../config/elasticsearch.js';
import { PRODUCT_INDEX } from '../utils/elasticsearchSyncV2.js';

const router = express.Router();

// ===============================
// NEW PRODUCTION SEARCH ENDPOINTS
// ===============================

// Main search endpoint - uses new optimized search
router.get('/search', searchProducts);

// Search suggestions/autocomplete
router.get('/search/suggestions', getSearchSuggestions);

// Get available filters for a search query
router.get('/search/filters', getAvailableFilters);

// Legacy/alternative search endpoints
router.get('/fast/search', unifiedProductSearch);
router.get('/popular', getPopularProducts);
router.get('/recent', getProductsByIds);
router.get('/price-drops', getPriceDroppedProducts);
router.get('/explore', getExploreProducts);

// ===============================
// IMPROVED SUGGESTIONS ENDPOINT
// Uses new index with no false positives
// ===============================
router.get("/suggestions", async (req, res) => {
  const query = req.query.q?.trim();
  if (!query || query.length < 2) return res.json([]);

  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        size: 25,
        _source: ["name", "brand", "modelNo", "inStock", "avgRating"],
        query: {
          bool: {
            should: [
              // Exact phrase prefix match (highest priority)
              {
                match_phrase_prefix: {
                  name: {
                    query,
                    boost: 20,
                    slop: 0,  // No words between
                  },
                },
              },
              // Autocomplete field match (prefix-based)
              {
                match: {
                  "name.autocomplete": {
                    query,
                    boost: 15,
                    operator: "and",
                  },
                },
              },
              // Standard match (all words must match)
              {
                match: {
                  name: {
                    query,
                    boost: 10,
                    operator: "and",
                    // NO FUZZINESS - this is key!
                  },
                },
              },
              // Brand autocomplete
              {
                match: {
                  "brand.autocomplete": {
                    query,
                    boost: 8,
                  },
                },
              },
              // Exact model number match
              {
                term: {
                  modelNo: {
                    value: query.toLowerCase(),
                    boost: 12,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        // Higher minimum score to filter out irrelevant matches
        min_score: 5,
        sort: [
          { _score: { order: "desc" } },
          { inStock: { order: "desc" } },
          { avgRating: { order: "desc" } },
        ],
      },
    });

    const suggestions = [];
    const seen = new Set();
    const queryLower = query.toLowerCase();

    if (response.hits?.hits?.length > 0) {
      for (const hit of response.hits.hits) {
        const source = hit._source || {};
        const name = source.name;
        if (!name) continue;

        const normalizedName = name.toLowerCase().trim();
        
        // Skip if already seen
        if (seen.has(normalizedName)) continue;
        
        // Additional check: name should contain at least one query word
        // This prevents "fridge" matching "bridge"
        const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2);
        const hasMatch = queryWords.some(word => normalizedName.includes(word));
        
        if (!hasMatch && queryLower.length >= 3) {
          // Allow if it starts with the query
          if (!normalizedName.startsWith(queryLower.slice(0, 3))) {
            continue;
          }
        }

        seen.add(normalizedName);
        suggestions.push(name);

        if (suggestions.length >= 10) break;
      }
    }

    return res.json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;