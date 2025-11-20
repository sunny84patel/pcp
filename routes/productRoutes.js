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
import { searchProducts } from '../controllers/productController.js';
import { getPopularProducts, getProductsByIds } from '../controllers/popularproductsControllers.js';
import { unifiedProductSearch } from '../controllers/typesenseController.js';
import {Product} from "../models/Product.js";
import { getPriceDroppedProducts } from '../controllers/pricedroppedControllers.js';
import { getExploreProducts } from '../controllers/popularproductsControllers.js';
import esClient from '../config/elasticsearch.js';
const router = express.Router();
const PRODUCT_INDEX = 'products';

// Search endpoint
router.get('/search', searchProducts);
router.get('/fast/search', unifiedProductSearch);
router.get('/popular', getPopularProducts);
router.get('/recent', getProductsByIds);
router.get('/price-drops', getPriceDroppedProducts);
router.get('/explore', getExploreProducts);

router.get("/suggestions", async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) return res.json([]);

  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        size: 25, // get a few more docs, we'll dedupe in code
        _source: ["name", "brand", "modelNo", "inStock"],
        query: {
          bool: {
            should: [
              // Phrase prefix match (best for "starts with" behavior)
              {
                match_phrase_prefix: {
                  name: {
                    query,
                    boost: 10,
                    slop: 2,
                  },
                },
              },
              // Edge ngram match (partial words, thanks to product_analyzer)
              {
                match: {
                  name: {
                    query,
                    boost: 5,
                    operator: "and",
                  },
                },
              },
              // General fuzzy match
              {
                match: {
                  name: {
                    query,
                    boost: 2,
                    operator: "or",
                    fuzziness: query.length > 4 ? "AUTO" : 0,
                  },
                },
              },
              // Brand prefix
              {
                match_phrase_prefix: {
                  brand: {
                    query,
                    boost: 3,
                  },
                },
              },
              // Exact model number match
              {
                term: {
                  "modelNo.keyword": {
                    value: query,
                    boost: 4,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [
          { _score: { order: "desc" } },
          { inStock: { order: "desc" } },
          { avgRating: { order: "desc" } },
        ],
      },
    });

    const suggestions = [];
    const seen = new Set();

    if (response.hits?.hits?.length > 0) {
      for (const hit of response.hits.hits) {
        const source = hit._source || {};
        const name = source.name;
        if (!name) continue;

        const normalizedName = name.toLowerCase().trim();
        if (seen.has(normalizedName)) continue;

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