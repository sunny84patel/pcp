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
const router = express.Router();

// Search endpoint
router.get('/search', searchProducts);
router.get('/fast/search', unifiedProductSearch);
router.get('/popular', getPopularProducts);
router.get('/recent', getProductsByIds);
router.get('/price-drops', getPriceDroppedProducts);


router.get("/suggestions", async (req, res) => {
  const query = req.query.q?.trim().toLowerCase();
  if (!query) return res.json([]);

  try {
    // Get last word from query
    const words = query.split(/\s+/);
    const lastWord = words[words.length - 1];

    const regex = new RegExp(`\\b${lastWord}`, "i");

    const products = await Product.find(
      { name: { $regex: regex } },
      { name: 1 }
    ).limit(20);

    // Extract only the word containing the match + surrounding context
    const suggestions = new Set();

    for (let p of products) {
      const nameWords = p.name.split(/\s+/);

      for (let i = 0; i < nameWords.length; i++) {
        if (nameWords[i].toLowerCase().includes(lastWord)) {
          // Extract a small window around the keyword (like 2 words before & after)
          const start = Math.max(0, i - 2);
          const end = Math.min(nameWords.length, i + 3);
          const snippet = nameWords.slice(start, end).join(" ");
          suggestions.add(snippet);
        }
      }
    }

    res.json(Array.from(suggestions));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


export default router;