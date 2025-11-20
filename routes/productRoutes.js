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
        // Use completion suggester for fast prefix matching
        suggest: {
          product_suggest: {
            prefix: query,
            completion: {
              field: 'name.suggest',
              size: 15,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: query.length > 4 ? 1 : 0 // Allow typos for longer queries
              }
            }
          }
        },
        // Fallback search query if suggester returns no results
        size: 15,
        _source: ['name', 'brand', 'modelNo', 'inStock'],
        query: {
          bool: {
            should: [
              // Phrase prefix match (best for "starts with" behavior)
              {
                match_phrase_prefix: {
                  name: {
                    query: query,
                    boost: 10,
                    slop: 2
                  }
                }
              },
              // Edge ngram match (catches partial words)
              {
                match: {
                  name: {
                    query: query,
                    boost: 5,
                    operator: 'and'
                  }
                }
              },
              // General match (broader coverage)
              {
                match: {
                  name: {
                    query: query,
                    boost: 2,
                    operator: 'or',
                    fuzziness: query.length > 4 ? 'AUTO' : 0
                  }
                }
              },
              // Brand match
              {
                match_phrase_prefix: {
                  brand: {
                    query: query,
                    boost: 3
                  }
                }
              },
              // Model number match
              {
                term: {
                  'modelNo.keyword': {
                    value: query,
                    boost: 4
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { inStock: { order: 'desc' } },
          { avgRating: { order: 'desc' } }
        ]
      }
    });

    const suggestions = [];
    const seen = new Set();

    // First, try to get results from completion suggester
    if (response.suggest?.product_suggest?.[0]?.options?.length > 0) {
      for (const option of response.suggest.product_suggest[0].options) {
        const name = option.text;
        const normalizedName = name.toLowerCase().trim();
        
        if (!seen.has(normalizedName)) {
          seen.add(normalizedName);
          suggestions.push(name);
        }
        
        if (suggestions.length >= 10) break;
      }
    }

    // If suggester didn't return enough results, use search results
    if (suggestions.length < 10 && response.hits?.hits?.length > 0) {
      for (const hit of response.hits.hits) {
        const name = hit._source.name;
        const normalizedName = name.toLowerCase().trim();
        
        if (!seen.has(normalizedName)) {
          seen.add(normalizedName);
          suggestions.push(name);
        }
        
        if (suggestions.length >= 10) break;
      }
    }

    res.json(suggestions);
    
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;