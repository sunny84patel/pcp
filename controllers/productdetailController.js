import { Product, Inventory, Image } from '../models/Product.js';
import esClient from '../config/elasticsearch.js';
import { PRODUCT_INDEX } from '../utils/elasticsearchSync.js';

const activeRequests = new Map();

// =====================================================
// HELPER: Extract Core Search Terms
// =====================================================
const extractSearchTerms = (productName) => {
  if (!productName) return "";
  
  // Remove measurements, dimensions, and SKU/item numbers
  let cleaned = productName
    .replace(/\b#\s*\d+\b/g, '') // Remove item numbers
    .replace(/\b(sku|item|model)[:\-]?\s*\w+/gi, '') // Remove SKU/item refs
    .replace(/\b\d+[-/]?\d*\s*(in|ft|mm|cm|inch|oz|lb|gal)\.?\b/gi, "") // Remove measurements
    .replace(/\b\d+\s*x\s*\d+\b/gi, "") // Remove dimensions
    .trim();
  
  // Split and remove common filler words
  const fillerWords = ["the", "and", "or", "with", "for", "in", "of", "a", "an"];
  const words = cleaned.split(/\s+/).filter(word => 
    word.length > 2 && !fillerWords.includes(word.toLowerCase())
  );
  
  return words.join(" ");
};

// =====================================================
// ELASTICSEARCH SEARCH FOR OPPOSITE STORE MATCH
// =====================================================

/**
 * Search for best matching product in opposite store using Elasticsearch
 * @param {object} baseProduct - Base product from database
 * @param {string} baseStoreId - 'homedepot' or 'lowes'
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<object|null>} Best match or null
 */
const findMatchInElasticsearch = async (baseProduct, baseStoreId, requestId) => {
  try {
    // Normalize store IDs and determine opposite store
    const normalizedBaseStore = baseStoreId.toLowerCase().replace(/['\s]/g, '');
    const oppositeStore = normalizedBaseStore === 'homedepot' ? "lowe's" : 'homedepot';
    console.log(`🔍 [${requestId}] Searching for match in ${oppositeStore} using Elasticsearch...`);

    // Extract clean search terms
    const searchTerms = extractSearchTerms(baseProduct.name);
    if (!searchTerms || searchTerms.length < 2) {
      console.log(`❌ [${requestId}] Search terms too short: "${searchTerms}"`);
      return null;
    }

    console.log(`🎯 [${requestId}] Search terms: "${searchTerms}"`);

    // Build Elasticsearch query
    const shouldClauses = [
      // Name matching with different boost levels
      { match: { name: { query: searchTerms, boost: 3, fuzziness: "AUTO" } } },
      { match_phrase: { name: { query: searchTerms, boost: 5 } } },
      { match: { "name.raw": { query: searchTerms, boost: 4 } } },
      
      // Brand matching
      { match: { brand: { query: baseProduct.brand || searchTerms, boost: 2 } } },
      
      // Model number matching (if available)
      ...(baseProduct.modelNo ? [
        { match: { modelNo: { query: baseProduct.modelNo, boost: 3 } } }
      ] : []),
      
      // Category matching
      { match: { category: { query: baseProduct.category || searchTerms, boost: 1.5 } } }
    ];

    // Filter by opposite store
    const filterClauses = [
      {
        nested: {
          path: "stores",
          query: {
            term: { "stores.storeId": oppositeStore }
          }
        }
      }
    ];

    console.log(`🔎 [${requestId}] Elasticsearch filter: stores.storeId = "${oppositeStore}"`);

    // Optional category boost
    const categoryBoost = [];
    if (baseProduct.category && baseProduct.category.trim()) {
      categoryBoost.push({ 
        term: { "category.keyword": { value: baseProduct.category, boost: 2 } } 
      });
    }

    const esQuery = {
      index: PRODUCT_INDEX,
      body: {
        size: 5, // Get top 5 matches
        query: {
          bool: {
            must: [
              {
                bool: { 
                  should: shouldClauses, 
                  minimum_should_match: 1 
                }
              }
            ],
            filter: filterClauses,
            should: categoryBoost
          }
        },
        sort: [
          { _score: { order: "desc" } },
          { avgRating: { order: "desc", missing: "_last" } },
          { totalReviews: { order: "desc", missing: "_last" } }
        ],
        track_total_hits: true
      }
    };

    const response = await esClient.search(esQuery);
    
    console.log(`📊 [${requestId}] Elasticsearch returned ${response.hits.hits.length} results (total: ${response.hits.total.value})`);
    
    if (!response.hits.hits.length) {
      console.log(`❌ [${requestId}] No matches found in Elasticsearch`);
      return null;
    }

    // Get the best match (highest score)
    const bestHit = response.hits.hits[0];
    const maxScore = response.hits.max_score || 1; // Prevent division by zero
    const matchScore = maxScore > 0 ? Math.round((bestHit._score / maxScore) * 100) : 0;
    
    console.log(`✅ [${requestId}] Found ${response.hits.hits.length} potential matches`);
    console.log(`🎯 [${requestId}] Best match score: ${matchScore}% (ES score: ${bestHit._score.toFixed(2)} / ${maxScore.toFixed(2)})`);
    console.log(`   Product: ${bestHit._source.name.substring(0, 60)}...`);

    // Only return if score is reasonable (>40%)
    if (matchScore < 40) {
      console.log(`⚠️ [${requestId}] Match score too low (${matchScore}%), skipping`);
      return null;
    }

    return {
      productId: bestHit._source.productId,
      matchScore,
      esScore: bestHit._score,
      sourceData: bestHit._source
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Elasticsearch error:`, error.message);
    return null;
  }
};

// =====================================================
// FETCH FULL PRODUCT DETAILS FROM DATABASE
// =====================================================

/**
 * Fetch complete product and inventory details from MongoDB
 * @param {string} productId - Product ID to fetch
 * @param {string} storeId - Store ID to filter inventory
 * @returns {Promise<object|null>} Complete product details or null
 */
const fetchProductFromDatabase = async (productId, storeId) => {
  try {
    const [product, inventory, images] = await Promise.all([
      Product.findOne({ productId }).lean(),
      Inventory.findOne({ productId, storeId }).lean(),
      Image.find({ productId }).lean()
    ]);

    if (!product || !inventory) {
      return null;
    }

    return {
      product,
      inventory,
      images: images.map(img => img.url)
    };
  } catch (error) {
    console.error(`❌ Error fetching product ${productId}:`, error.message);
    return null;
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const getDeliveryDateString = (daysToAdd = 2) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString("en-US", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  });
};

const buildRetailerObject = (product, inventory, matchInfo = null) => {
  const retailer = {
    store: inventory.storeId.toLowerCase() === "homedepot" ? "Home Depot" : "Lowe's",
    productTitle: product.name || "Product Name Not Available",
    price: parseFloat(inventory.price || 0),
    listPrice: parseFloat(inventory.listPrice || inventory.price || 0),
    savings: Math.max(0, (inventory.listPrice || inventory.price || 0) - (inventory.price || 0)).toFixed(2),
    isLowest: false, // Calculated later
    offers: 3,
    reviewScore: parseFloat(inventory.rating || 0),
    reviewCount: parseInt(inventory.totalReviews || 0),
    stockStatus: (inventory.inventoryQuantity || 0) > 0 ? "In stock for Pickup" : "Out of stock",
    url: inventory.url || "",
    storeLocation: "Niagara Falls #1287",
    distance: "0.1 mi",
    delivery: `Delivery in 2-3 Days, ${getDeliveryDateString(2)}`,
    productId: product.productId,
    isBaseProduct: matchInfo === null
  };

  // Add match metadata if this is a matched product
  if (matchInfo) {
    retailer.matchScore = matchInfo.matchScore;
    retailer.esScore = matchInfo.esScore;
    retailer.matchSource = "elasticsearch";
  }

  return retailer;
};

// =====================================================
// MAIN CONTROLLER
// =====================================================

/**
 * Get product details with cross-store matching using Elasticsearch
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getProductDetails = async (req, res) => {
  const { id } = req.params;
  const requestId = `${id}-${Date.now()}`;
  console.log(`\n🚀 [${requestId}] Starting getProductDetails for product: ${id}`);

  try {
    // Prevent duplicate concurrent requests
    if (activeRequests.has(id)) {
      console.log(`⚠️ [${requestId}] Request already in progress`);
      return res.status(409).json({ error: "Request already in progress for this product" });
    }
    activeRequests.set(id, requestId);

    // ==========================
    // STEP 1: Fetch base product from database
    // ==========================
    console.log(`📊 [${requestId}] Fetching base product from database...`);
    const [baseProduct, baseInventory] = await Promise.all([
      Product.findOne({ productId: id }).lean(),
      Inventory.findOne({ productId: id }).lean()
    ]);

    if (!baseProduct || !baseInventory) {
      console.log(`❌ [${requestId}] Product not found in database`);
      return res.status(404).json({ error: "Product not found" });
    }

    const baseStoreId = baseInventory.storeId; // Keep original (might be "lowe's" with apostrophe)
    const normalizedBaseStore = baseStoreId.toLowerCase().replace(/['\s]/g, ''); // Normalize for comparison
    console.log(`🏪 [${requestId}] Base store: ${baseStoreId} (normalized: ${normalizedBaseStore})`);
    console.log(`📦 [${requestId}] Base product: ${baseProduct.name}`);

    // Fetch base product images
    const baseImages = await Image.find({ productId: id }).lean();

    // ==========================
    // STEP 2: Build base retailer
    // ==========================
    const retailers = [buildRetailerObject(baseProduct, baseInventory)];
    console.log(`✅ [${requestId}] Added base retailer: ${retailers[0].store}`);

    // ==========================
    // STEP 3: Search for match in opposite store using Elasticsearch
    // ==========================
    const matchResult = await findMatchInElasticsearch(baseProduct, baseStoreId, requestId);

    if (matchResult) {
      // Fetch full details from database
      console.log(`📊 [${requestId}] Fetching matched product details from database...`);
      const normalizedBaseStore = baseStoreId.toLowerCase().replace(/['\s]/g, '');
      const oppositeStore = normalizedBaseStore === 'homedepot' ? "lowe's" : 'homedepot';
      const matchDetails = await fetchProductFromDatabase(matchResult.productId, oppositeStore);

      if (matchDetails) {
        const matchRetailer = buildRetailerObject(
          matchDetails.product,
          matchDetails.inventory,
          {
            matchScore: matchResult.matchScore,
            esScore: matchResult.esScore
          }
        );

        retailers.push(matchRetailer);
        console.log(`✅ [${requestId}] Added match retailer: ${matchRetailer.store}`);
        console.log(`   Match score: ${matchResult.matchScore}%, Product: ${matchDetails.product.name}`);
      } else {
        console.log(`⚠️ [${requestId}] Could not fetch full details for matched product`);
      }
    } else {
      console.log(`ℹ️ [${requestId}] No suitable match found - proceeding with 1 retailer only`);
    }

    // ==========================
    // STEP 4: Calculate lowest price and finalize
    // ==========================
    const prices = retailers.map(r => r.price).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    retailers.forEach(r => { 
      r.isLowest = r.price === lowestPrice && r.price > 0; 
    });

    // ==========================
    // STEP 5: Build final response
    // ==========================
    const response = {
      productId: baseProduct.productId,
      title: baseProduct.name || "Product Name Not Available",
      model: `#${baseProduct.modelNo || "N/A"}`,
      images: baseImages.map(img => img.url),
      rating: parseFloat(baseInventory.rating || 0),
      reviewCount: parseInt(baseInventory.totalReviews || 0),
      lowestPrice,
      retailers,
      specifications: {
        Model: baseProduct.modelNo || "N/A",
        Category: baseProduct.category || "General",
        Brand: baseProduct.brand || "N/A",
        ReturnPolicy: "30 Days Return"
      },
      matchFound: retailers.length > 1,
      matchScore: matchResult?.matchScore || 0,
      searchSource: "elasticsearch"
    };

    console.log(`✅ [${requestId}] Response ready with ${retailers.length} retailers`);
    console.log(`🚀 [${requestId}] DONE - Elasticsearch search completed\n`);

    res.json(response);

  } catch (err) {
    console.error(`❌ [${requestId}] Controller Error:`, err.message);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
      productFound: false
    });
  } finally {
    // Clean up active request tracking
    activeRequests.delete(id);
    console.log(`🧹 [${requestId}] Cleaned up active request tracking`);
  }
};