import { Product, Inventory, Image } from "../models/Product.js";
import fetch from "node-fetch";
import esClient from "../config/elasticsearch.js";
import { PRODUCT_INDEX } from "../utils/elasticsearchSync.js";

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

// ========================
// HELPER: Extract Core Search Terms
// ========================
const extractSearchTerms = (productName) => {
  if (!productName) return "";
  
  // Remove measurements and dimensions
  let cleaned = productName
    .replace(/\b\d+[-/]?\d*\s*(in|ft|mm|cm|inch|oz|lb|gal)\.?\b/gi, "")
    .replace(/\b\d+\s*x\s*\d+\b/gi, "")
    .trim();
  
  // Split and remove common filler words
  const fillerWords = ["the", "and", "or", "with", "for", "in", "of", "a", "an"];
  const words = cleaned.split(/\s+/).filter(word => 
    word.length > 2 && !fillerWords.includes(word.toLowerCase())
  );
  
  return words.join(" ");
};

// ========================
// STEP 1: Search Similar Products in Elasticsearch
// ========================
const searchSimilarInElasticsearch = async (productName, category, storeId, currentProductId, limit = 10) => {
  try {
    const searchTerms = extractSearchTerms(productName);
    if (!searchTerms || searchTerms.length < 2) return [];
    
    console.log(`🔍 Searching ES for: "${searchTerms}" in store: ${storeId}`);
    
    // Build filter clauses
    const filterClauses = [];
    const shouldClauses = [];
    
    // Multi-field text search with boosting (similar to your product search)
    shouldClauses.push(
      { match: { name: { query: searchTerms, boost: 3, fuzziness: "AUTO" } } },
      { match_phrase: { name: { query: searchTerms, boost: 5 } } },
      { match: { "name.raw": { query: searchTerms, boost: 4 } } },
      { match: { brand: { query: searchTerms, boost: 2 } } },
      { match: { category: { query: searchTerms, boost: 1.5 } } }
    );

    // Filter by store (nested query to match your index structure)
    filterClauses.push({
      nested: {
        path: "stores",
        query: {
          term: { "stores.storeId": storeId }
        }
      }
    });

    // Exclude current product
    filterClauses.push({
      bool: {
        must_not: [
          { term: { "productId.keyword": currentProductId } }
        ]
      }
    });

    // Category boost (optional)
    const categoryBoost = [];
    if (category && category.trim()) {
      categoryBoost.push({ term: { "category.keyword": { value: category, boost: 2 } } });
    }

    const esQuery = {
      index: PRODUCT_INDEX,
      body: {
        size: limit,
        query: {
          bool: {
            must: [
              {
                bool: { should: shouldClauses, minimum_should_match: 1 }
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
    
    if (response.hits.hits.length > 0) {
      const productIds = response.hits.hits.map(hit => hit._source.productId);
      console.log(`✅ Found ${productIds.length} similar products in ES`);
      return productIds;
    }
    
    console.log("⚠️ No results from Elasticsearch");
    return [];
  } catch (error) {
    console.error("❌ Elasticsearch search error:", error.message);
    return [];
  }
};

// ========================
// STEP 2: Fetch Product Details from DB
// ========================
const fetchProductDetails = async (productIds, storeId) => {
  try {
    const products = await Product.find({
      productId: { $in: productIds }
    }).lean();

    const inventories = await Inventory.find({
      productId: { $in: productIds },
      storeId: storeId
    }).lean();

    const images = await Image.find({
      productId: { $in: productIds }
    }).lean();

    // Map products with their inventory and images
    const results = products.map(product => {
      const productInventories = inventories.filter(
        inv => inv.productId === product.productId
      );
      
      const productImages = images
        .filter(img => img.productId === product.productId)
        .map(img => img.url);

      const inventory = productInventories[0] || {};

      return {
        productId: product.productId,
        name: product.name || "Unknown Product",
        modelNo: product.modelNo || "",
        brand: product.brand || "",
        category: product.category || "",
        minPrice: inventory.price || 0,
        avgRating: inventory.rating || 0,
        totalReviews: inventory.totalReviews || 0,
        stores: productInventories.map(inv => ({
          storeId: inv.storeId,
          price: inv.price,
          listPrice: inv.listPrice,
          priceReduced: inv.priceReduced,
          currency: inv.currency || "USD",
          inventoryQuantity: inv.inventoryQuantity,
          rating: inv.rating,
          totalReviews: inv.totalReviews,
          url: inv.url,
          itemNumber: inv.itemNumber,
          vendorNumber: inv.vendorNumber,
          upc: inv.upc,
          saleEndDate: inv.saleEndDate,
          images: productImages
        }))
      };
    });

    return results;
  } catch (error) {
    console.error("❌ Error fetching product details:", error);
    return [];
  }
};

// ========================
// STEP 3: Third-Party API Fallback
// ========================
const searchThirdPartyApi = async (productName, storeId) => {
  try {
    const searchTerms = extractSearchTerms(productName);
    if (!searchTerms || searchTerms.length < 3) return [];

    console.log(`🌐 Fallback: Searching third-party API for: "${searchTerms}"`);

    // Determine API platform
    let platform = "";
    if (storeId === "lowe's" || storeId === "lowes") {
      platform = "lowes_search";
    } else if (storeId === "homedepot" || storeId === "home depot") {
      platform = "homedepot_search";
    } else {
      return [];
    }

    const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(searchTerms)}&page=1&api_key=${API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.results?.length) {
      console.log(`✅ Found ${data.results.length} results from third-party API`);
      return data.results.slice(0, 10);
    }

    console.log("⚠️ No results from third-party API");
    return [];
  } catch (error) {
    console.error("❌ Third-party API error:", error.message);
    return [];
  }
};

// ========================
// HELPER: Normalize Home Depot API Response
// ========================
const normalizeHomeDepot = (item) => {
  const productId = item.id;
  return {
    product: {
      productId,
      name: item.name,
      modelNo: item.model_no || "",
      brand: item.brand || "",
      category: item.category || ""
    },
    inventory: {
      productId,
      storeId: "homedepot",
      price: item.price || 0,
      listPrice: item.price || 0,
      priceReduced: item.price_reduced || false,
      currency: item.currency || "USD",
      inventoryQuantity: item.inventory_quantity || 0,
      rating: item.rating || 0,
      totalReviews: item.total_reviews || 0,
      url: item.url || "",
      itemNumber: null,
      vendorNumber: null,
      upc: null,
      saleEndDate: null
    },
    images: (item.thumbnails || []).map(url => ({ url, productId }))
  };
};

// ========================
// HELPER: Normalize Lowe's API Response
// ========================
const normalizeLowes = (item) => {
  const productId = item.id;
  return {
    product: {
      productId,
      name: item.name,
      modelNo: item.model_no || "",
      brand: item.brand || "",
      category: item.category || ""
    },
    inventory: {
      productId,
      storeId: "lowe's",
      price: item.price || 0,
      listPrice: item.list_price || 0,
      priceReduced: item.price_reduced || false,
      currency: item.currency || "USD",
      inventoryQuantity: item.inventory?.total_quantity || 0,
      rating: item.rating || 0,
      totalReviews: item.total_ratings || 0,
      url: item.url || "",
      itemNumber: item.item_number || null,
      vendorNumber: item.vendor_number || null,
      upc: item.upc || null,
      saleEndDate: item.sale_end_date || null
    },
    images: (item.images || []).map(url => ({ url, productId }))
  };
};

// ========================
// HELPER: Normalize API Results
// ========================
const normalizeApiResults = (apiResults, storeId) => {
  return apiResults.map(item => {
    const productId = item.id || item.product_id;
    
    let normalizedData;
    if (storeId === "homedepot" || storeId === "home depot") {
      normalizedData = normalizeHomeDepot(item);
    } else {
      normalizedData = normalizeLowes(item);
    }

    return {
      productId: normalizedData.product.productId,
      name: normalizedData.product.name,
      modelNo: normalizedData.product.modelNo,
      brand: normalizedData.product.brand,
      category: normalizedData.product.category,
      minPrice: normalizedData.inventory.price,
      avgRating: normalizedData.inventory.rating,
      totalReviews: normalizedData.inventory.totalReviews,
      stores: [{
        storeId: normalizedData.inventory.storeId,
        price: normalizedData.inventory.price,
        listPrice: normalizedData.inventory.listPrice,
        priceReduced: normalizedData.inventory.priceReduced,
        currency: normalizedData.inventory.currency,
        inventoryQuantity: normalizedData.inventory.inventoryQuantity,
        rating: normalizedData.inventory.rating,
        totalReviews: normalizedData.inventory.totalReviews,
        url: normalizedData.inventory.url,
        itemNumber: normalizedData.inventory.itemNumber,
        vendorNumber: normalizedData.inventory.vendorNumber,
        upc: normalizedData.inventory.upc,
        saleEndDate: normalizedData.inventory.saleEndDate,
        images: normalizedData.images.map(img => img.url)
      }]
    };
  });
};

// ========================
// HELPER: Save API Results to DB (Background)
// ========================
const saveApiResultsToDb = async (apiResults, storeId, category) => {
  setImmediate(async () => {
    try {
      console.log(`💾 Background save: Saving ${apiResults.length} products to DB`);
      
      for (const result of apiResults) {
        const { productId, name, modelNo, brand, stores } = result;

        // Upsert Product
        await Product.updateOne(
          { productId },
          {
            $setOnInsert: {
              productId,
              name,
              modelNo,
              brand,
              category: category || "General"
            }
          },
          { upsert: true }
        );

        // Upsert Inventory
        for (const store of stores) {
          await Inventory.updateOne(
            { productId, storeId: store.storeId },
            { $set: { ...store, productId } },
            { upsert: true }
          );

          // Insert Images
          if (store.images?.length) {
            const imageDocuments = store.images.map(url => ({
              productId,
              url
            }));
            await Image.insertMany(imageDocuments, { ordered: false }).catch(() => {});
          }
        }
      }
      
      console.log("✅ Background save completed");
    } catch (error) {
      console.error("❌ Background save error:", error);
    }
  });
};

// ========================
// MAIN CONTROLLER
// ========================
export const getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`\n🔎 Getting similar products for ID: ${id}`);

    // 1. Find the clicked product
    const currentProduct = await Product.findOne({ productId: id }).lean();
    if (!currentProduct) {
      console.log("❌ Product not found");
      return res.status(404).json({ message: "Product not found" });
    }

    console.log(`📦 Current product: ${currentProduct.name}`);

    // 2. Get store ID from product's inventory
    const baseInventory = await Inventory.findOne({ productId: id }).lean();
    if (!baseInventory) {
      console.log("❌ Product inventory not found");
      return res.status(404).json({ message: "Product inventory not found" });
    }

    const storeId = baseInventory.storeId.toLowerCase();
    console.log(`🏪 Store: ${storeId}`);

    // 3. Search similar products in Elasticsearch (PRIMARY)
    const similarProductIds = await searchSimilarInElasticsearch(
      currentProduct.name,
      currentProduct.category,
      storeId,
      id,
      10
    );

    // 4. If Elasticsearch found results, fetch full details from DB
    if (similarProductIds.length > 0) {
      const results = await fetchProductDetails(similarProductIds, storeId);
      
      if (results.length > 0) {
        console.log(`✅ Returning ${results.length} products from database\n`);
        return res.json({
          results,
          count: results.length,
          source: "elasticsearch"
        });
      }
    }

    // 5. FALLBACK: Search third-party API
    console.log("⚠️ No results from Elasticsearch, trying third-party API...");
    const apiResults = await searchThirdPartyApi(currentProduct.name, storeId);

    if (apiResults.length > 0) {
      const normalizedResults = normalizeApiResults(apiResults, storeId);
      
      // Save to DB in background
      saveApiResultsToDb(normalizedResults, storeId, currentProduct.category);

      console.log(`✅ Returning ${normalizedResults.length} products from third-party API\n`);
      return res.json({
        results: normalizedResults,
        count: normalizedResults.length,
        source: "third_party_api"
      });
    }

    // 6. No results found
    console.log("❌ No similar products found from any source\n");
    return res.json({
      results: [],
      count: 0,
      message: "No similar products found"
    });

  } catch (error) {
    console.error("❌ getSimilarProducts error:", error);
    res.status(500).json({ error: "Server error" });
  }
};