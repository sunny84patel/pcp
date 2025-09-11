import { Product, Inventory, Image } from '../models/Product.js';
import fetch from 'node-fetch'; // Assuming node-fetch is installed for API calls

// Environment variables - Set API_KEY in .env
const API_BASE_URL = 'https://data.unwrangle.com/api/getter/';
const API_KEY = process.env.UNWRANGLE_API_KEY;
console.log("🔑 Using API Key:", API_KEY ) ;
// Map to track active requests to prevent duplicates
const activeRequests = new Map();

// =====================================================
// HELPER: SINGLE API CALL ONLY
// =====================================================

/**
 * Makes ONE API call with timeout - no retries, no variations
 * @param {string} platform - 'homedepot_search' or 'lowes_search'
 * @param {string} searchTerm - Single search term to try
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<array>} Array of product results or empty array
 */
const makeSingleApiCall = async (platform, searchTerm, requestId) => {
  if (!API_KEY) {
    console.error(`❌ [${requestId}] API_KEY is not set in environment variables`);
    return [];
  }

  const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(searchTerm)}&api_key=${API_KEY}`;

  try {
    console.log(`🔍 [${requestId}] Making SINGLE API call to ${platform} for: "${searchTerm}"`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductComparison/1.0)',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`❌ [${requestId}] API returned ${response.status} - CALL FAILED`);
      return [];
    }

    const data = await response.json();

    if (!data.success || !data.results || data.results.length === 0) {
      console.log(`❌ [${requestId}] No results found - CALL FAILED`);
      return [];
    }

    console.log(`✅ [${requestId}] SUCCESS: Found ${data.results.length} products - CALL SUCCEEDED`);
    return data.results;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ [${requestId}] API call timeout - CALL FAILED`);
    } else {
      console.error(`❌ [${requestId}] API call error: ${error.message} - CALL FAILED`);
    }
    return [];
  }
};

const getDeliveryDateString = (daysToAdd = 2) => {
  const today = new Date();
  today.setDate(today.getDate() + daysToAdd);

  const options = { weekday: "long", day: "numeric", month: "long" };
  return today.toLocaleDateString("en-US", options);
};
/**
 * Creates the BEST single search term from product info
 * @param {object} baseProduct - Product from database
 * @returns {string} Single optimized search term
 */
const createBestSearchTerm = (baseProduct) => {
  const { name, brand, modelNo } = baseProduct;


  // Priority 1: Clean up product name and take first 4 meaningful words
  if (name) {
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/\b#\s*\d+\b/g, '') // Remove item numbers
      .replace(/\bsku\s*[:\-]?\s*\w+/gi, '') // Remove SKU
      .replace(/\bitem\s*[:\-]?\s*\w+/gi, '') // Remove item refs
      .replace(/[\s\-:;,./#()]+/g, ' ') // Replace punctuation with space
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();

    const words = cleanName
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 8) // Take only first 4 words
      .join(' ');

    if (words.length > 0) {
      console.log(`🎯 Using cleaned product name: "${words}"`);
      return words;
    }
  }

  // Priority 2: Brand + Model (most specific)
  if (brand && modelNo) {
    console.log(`🎯 Using Brand + Model: "${brand} ${modelNo}"`);
    return `${brand} ${modelNo}`;
  }


  // Priority 3: Just brand if available
  if (brand) {
    console.log(`🎯 Using brand only: "${brand}"`);
    return brand;
  }

  console.log(`⚠️ No good search term found, using generic fallback`);
  return 'product';
};

/**
 * Attempts to find ONE matching product with SINGLE API call
 * Only calls second store if first call fails
 * @param {object} baseProduct - Base product from database
 * @param {string} baseStoreId - 'homedepot' or 'lowes'
 * @param {string} requestId - Request ID for tracking
 * @returns {Promise<object|null>} Single match or null
 */
const findSingleMatch = async (baseProduct, baseStoreId, requestId) => {
  const otherPlatform = baseStoreId === 'homedepot' ? 'lowes_search' : 'homedepot_search';
  const otherStoreId = baseStoreId === 'homedepot' ? 'lowes' : 'homedepot';

  // Create the BEST search term (only one)
  const searchTerm = createBestSearchTerm(baseProduct);

  console.log(`🚀 [${requestId}] Will make SINGLE API call to ${otherStoreId}`);
  console.log(`🎯 [${requestId}] Search term: "${searchTerm}"`);

  // Make ONLY ONE API call
  const results = await makeSingleApiCall(otherPlatform, searchTerm, requestId);

  if (!results || results.length === 0) {
    console.log(`❌ [${requestId}] SINGLE API call failed - No match found in ${otherStoreId}`);
    return null;
  }

  // Take first result as match
  const firstResult = results[0];
  console.log(`✅ [${requestId}] SINGLE API call succeeded - Match found: ${firstResult.name || firstResult.title}`);

  return {
    product: {
      productId: firstResult.id || firstResult.product_id || `${otherStoreId}_${Date.now()}`,
      name: firstResult.name || firstResult.title || 'Product Name Not Available',
      modelNo: firstResult.model_no || firstResult.model || baseProduct.modelNo || 'N/A',
      brand: firstResult.brand || baseProduct.brand || 'N/A',
    },
    inventory: {
      storeId: otherStoreId,
      price: parseFloat(firstResult.price || firstResult.current_price || 0),
      listPrice: parseFloat(
        firstResult.list_price ||
        firstResult.original_price ||
        firstResult.price ||
        firstResult.current_price ||
        0
      ),
      rating: parseFloat(firstResult.rating || 0),
      totalReviews: parseInt(firstResult.total_reviews || firstResult.review_count || 0),
      inventoryQuantity: firstResult.inventory_quantity || (firstResult.in_stock ? 1 : 0),
      url: firstResult.url || firstResult.product_url || '',
    },
    matchScore: 100,
    matchType: 'single_api_call',
  };
};

// =====================================================
// MAIN CONTROLLER - SINGLE API CALL STRATEGY
// =====================================================

/**
 * Controller to get product details with SINGLE API call approach
 * Makes only ONE API call to other store, stops immediately
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getProductDetails = async (req, res) => {
  const requestId = `${req.params.id}-${Date.now()}`;
  console.log(`🚀 [${requestId}] Starting getProductDetails for product: ${req.params.id}`);

  try {
    const { id } = req.params;

    // Prevent duplicate concurrent requests for same product
    if (activeRequests.has(id)) {
      console.log(`⚠️ [${requestId}] Request already in progress for product ${id} - returning early`);
      return res.status(409).json({ error: "Request already in progress for this product" });
    }

    if (res.headersSent) {
      console.log(`⚠️ [${requestId}] Response already sent - skipping`);
      return;
    }

    // Mark this product as being processed
    activeRequests.set(id, requestId);

    // ==========================
    // Fetch product + inventory from DB
    // ==========================
    console.log(`📊 [${requestId}] Fetching product data from database...`);
    const baseProduct = await Product.findOne({ productId: id });
    const baseInventory = await Inventory.findOne({ productId: id });

    if (!baseProduct || !baseInventory) {
      console.log(`❌ [${requestId}] Product not found in database`);
      return res.status(404).json({ error: "Product not found" });
    }

    const baseStoreId = baseInventory.storeId;
    console.log(`🏪 [${requestId}] Base store: ${baseStoreId}`);

    // ==========================
    // Build base retailer (we always have this)
    // ==========================
    const baseRetailer = {
      store: baseStoreId === "homedepot" ? "Home Depot" : "Lowe's",
      productTitle: baseProduct.name || "Product Name Not Available",
      price: parseFloat(baseInventory.price || 0),
      listPrice: parseFloat(baseInventory.listPrice || baseInventory.price || 0),
      savings: ((baseInventory.listPrice || baseInventory.price || 0) - (baseInventory.price || 0)).toFixed(2),
      isLowest: true, // Will be recalculated if we find a match
      offers: 3,
      reviewScore: parseFloat(baseInventory.rating || 0),
      reviewCount: parseInt(baseInventory.totalReviews || 0),
      stockStatus: (baseInventory.inventoryQuantity || 0) > 0 ? "In stock for Pickup" : "Out of stock",
      url: baseInventory.url || "",
      storeLocation: "Niagara Falls #1287",
      distance: "0.1 mi",
     delivery: `Delivery in 2-3 Days, ${getDeliveryDateString(2)}`,
      matchScore: 100,
      productId: baseProduct.productId,
      isBaseProduct: true
    };

    const retailers = [baseRetailer];
    console.log(`✅ [${requestId}] Added base retailer: ${baseRetailer.store}`);

    // ==========================
    // Make SINGLE API call for match
    // ==========================
    console.log(`🔍 [${requestId}] Making SINGLE API call to find match...`);

    let matchResult = null;

    try {
      // ONLY ONE API CALL - no timeout wrapper, no race conditions
      matchResult = await findSingleMatch(baseProduct, baseStoreId, requestId);
    } catch (error) {
      console.error(`❌ [${requestId}] Error in single API call:`, error.message);
      matchResult = null;
    }

    // ==========================
    // Add match to retailers if found
    // ==========================
    if (matchResult && matchResult.product && matchResult.inventory) {
      const matchPrice = parseFloat(matchResult.inventory.price || 0);
      const matchListPrice = parseFloat(matchResult.inventory.listPrice || matchPrice);

      retailers.push({
        store: matchResult.inventory.storeId === "homedepot" ? "Home Depot" : "Lowe's",
        productTitle: matchResult.product.name || "Product Name Not Available",
        price: matchPrice,
        listPrice: matchListPrice,
        savings: Math.max(0, matchListPrice - matchPrice).toFixed(2),
        isLowest: false, // Will be recalculated below
        offers: 3,
        reviewScore: parseFloat(matchResult.inventory.rating || 0),
        reviewCount: parseInt(matchResult.inventory.totalReviews || 0),
        stockStatus: (matchResult.inventory.inventoryQuantity || 0) > 0 ? "In stock for Pickup" : "Out of stock",
        url: matchResult.inventory.url || "",
        storeLocation: "Niagara Falls #1287",
        distance: "0.1 mi",
        delivery: `Delivery in 2-3 Days, ${getDeliveryDateString(2)}`,
        matchScore: matchResult.matchScore || 0,
        productId: matchResult.product.productId,
        isBaseProduct: false,
        matchType: matchResult.matchType || "single_api_call"
      });

      console.log(`✅ [${requestId}] Added match retailer: ${retailers[1].store}`);
      console.log(`🎯 [${requestId}] COMPLETE - 2 retailers found with SINGLE API call`);
    } else {
      console.log(`ℹ️ [${requestId}] No match found - proceeding with 1 retailer only`);
    }

    // ==========================
    // Finalize pricing and response
    // ==========================
    const prices = retailers.map(r => r.price).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    retailers.forEach(r => { r.isLowest = r.price === lowestPrice && r.price > 0; });

    // Fetch product images
    const imageDocs = await Image.find({ productId: id });
    const images = imageDocs.map(img => img.url);

    const response = {
      productId: baseProduct.productId,
      title: baseProduct.name || "Product Name Not Available",
      model: `#${baseProduct.modelNo || "N/A"}`,
      images,
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
      apiCallsMade: 1 // Always exactly 1 call
    };

    console.log(`✅ [${requestId}] Response ready with ${retailers.length} retailers`);
    console.log(`🚀 [${requestId}] DONE - Made exactly 1 API call, no background processes`);

    res.json(response);

  } catch (err) {
    const errorMessage = err?.message || "Unknown error occurred";
    console.error(`❌ [${requestId}] Controller Error:`, errorMessage);

    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
      productFound: false
    });
  } finally {
    // Always clean up the active request tracking
    activeRequests.delete(req.params.id);
    console.log(`🧹 [${requestId}] Cleaned up active request tracking`);
  }
};