/**
 * Product Search Controller - Production-grade implementation
 * 
 * Key improvements over previous version:
 * 1. NO fuzzy matching by default (prevents "fridge" → "bridge" issues)
 * 2. Smart query preprocessing with synonym expansion
 * 3. Tiered search strategy: exact → prefix → broad
 * 4. Post-processing to filter out false positives
 * 5. Proper minimum score thresholds
 * 6. All filters working correctly
 */

import axios from "axios";
import esClient from "../config/elasticsearch.js";
import { PRODUCT_INDEX } from "../utils/elasticsearchSyncV2.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product, Store, Inventory, Image } from "../models/Product.js";
import {
  preprocessQuery,
  calculateMinScore,
  buildSynonymClauses,
  filterIrrelevantResults,
  isFalsePositive,
  getSuggestions
} from "../utils/searchHelpers.js";

dotenv.config();

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

/* -------------------------
   Store normalization helpers
   ------------------------- */

const normalizeStoreId = (s) => {
  if (!s) return s;
  const low = s.trim().toLowerCase();
  if (low.includes("lowe")) return "lowe's";
  if (low.includes("home")) return "homedepot";
  return low.replace(/\s+/g, "");
};

const storeIdToPlatform = (storeId) => {
  if (!storeId) return "homedepot_search";
  if (storeId === "homedepot") return "homedepot_search";
  if (storeId === "lowe's") return "lowes_search";
  return `${storeId}_search`;
};

/* -------------------------
   API response normalizers
   ------------------------- */

const normalizeHomeDepot = (item) => {
  const productId = item.id?.toString() ?? `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    product: {
      productId,
      name: item.name || item.title || "Unknown Product",
      modelNo: item.model_no || item.modelNo || null,
      brand: item.brand || null,
      category: item.category || null,
      updatedAt: new Date()
    },
    inventory: {
      productId,
      storeId: "homedepot",
      price: Number(item.price ?? item.list_price ?? 0),
      listPrice: Number(item.list_price ?? item.price ?? 0),
      priceReduced: item.price_reduced ?? null,
      currency: item.currency ?? "USD",
      inventoryQuantity: Number(item.inventory_quantity ?? (item.inStock ? 1 : 0) ?? 0),
      rating: Number(item.rating ?? 0),
      totalReviews: Number(item.total_reviews ?? item.totalReviews ?? 0),
      url: item.url ?? "",
      itemNumber: item.item_number ?? null,
      vendorNumber: item.vendor_number ?? null,
      upc: item.upc ?? null,
      saleEndDate: item.sale_end_date ? new Date(item.sale_end_date) : null,
      updatedAt: new Date()
    },
    images: (item.thumbnails || item.images || []).map((u) => ({ url: (u || "").trim(), productId }))
  };
};

const normalizeLowes = (item) => {
  const productId = item.id?.toString() ?? `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    product: {
      productId,
      name: item.name || item.title || "Unknown Product",
      modelNo: item.model_no || item.modelNo || null,
      brand: item.brand || null,
      category: item.category || null,
      updatedAt: new Date()
    },
    inventory: {
      productId,
      storeId: "lowe's",
      price: Number(item.price ?? item.list_price ?? 0),
      listPrice: Number(item.list_price ?? item.price ?? 0),
      priceReduced: item.price_reduced ?? null,
      currency: item.currency ?? "USD",
      inventoryQuantity: Number(item.inventory?.total_quantity ?? item.inventory_quantity ?? (item.inStock ? 1 : 0) ?? 0),
      rating: Number(item.rating ?? 0),
      totalReviews: Number(item.total_ratings ?? item.totalReviews ?? 0),
      url: item.url ?? "",
      itemNumber: item.item_number ?? null,
      vendorNumber: item.vendor_number ?? null,
      upc: item.upc ?? null,
      saleEndDate: item.sale_end_date ? new Date(item.sale_end_date) : null,
      updatedAt: new Date()
    },
    images: (item.images || item.thumbnails || []).map((u) => ({ url: (u || "").trim(), productId }))
  };
};

/* -------------------------
   DB SEARCH HELPER
   Fallback to MongoDB when Elasticsearch fails
   ------------------------- */

const searchProductsFromDb = async (queryInfo, options = {}) => {
  const {
    storeIds,
    inStockOnly,
    minPrice,
    maxPrice,
    brand,
    category,
    minRating,
    minReviews,
    page = 1,
    limit = 20,
    sortByRating,
    sortByPopularity,
    sortByPrice
  } = options;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Build the text search query
  const searchQuery = {};
  
  // Use MongoDB text search for the query
  if (queryInfo.normalized) {
    searchQuery.$text = { $search: queryInfo.normalized };
  }

  // Brand filter
  if (brand) {
    const brandList = brand.split(",").map(b => b.trim());
    searchQuery.brand = { $regex: brandList.join("|"), $options: "i" };
  }

  // Category filter
  if (category) {
    const categoryList = category.split(",").map(c => c.trim());
    searchQuery.category = { $regex: categoryList.join("|"), $options: "i" };
  }

  // Build aggregation pipeline
  const pipeline = [
    // Match products based on text search
    { $match: searchQuery },
    
    // Add text score for sorting by relevance
    ...(queryInfo.normalized ? [{ $addFields: { textScore: { $meta: "textScore" } } }] : []),
    
    // Lookup inventory data
    {
      $lookup: {
        from: "inventories",
        localField: "productId",
        foreignField: "productId",
        as: "inventoryData"
      }
    },
    
    // Lookup images
    {
      $lookup: {
        from: "images",
        localField: "productId",
        foreignField: "productId",
        as: "imageData"
      }
    }
  ];

  // Filter by store if specified
  if (storeIds && storeIds.length > 0) {
    pipeline.push({
      $addFields: {
        inventoryData: {
          $filter: {
            input: "$inventoryData",
            as: "inv",
            cond: { $in: ["$$inv.storeId", storeIds] }
          }
        }
      }
    });
    // Only keep products that have inventory in the specified stores
    pipeline.push({
      $match: { "inventoryData.0": { $exists: true } }
    });
  }

  // Add computed fields
  pipeline.push({
    $addFields: {
      minPrice: { $min: "$inventoryData.price" },
      maxPrice: { $max: "$inventoryData.price" },
      avgRating: { $avg: "$inventoryData.rating" },
      totalReviews: { $sum: "$inventoryData.totalReviews" },
      inStock: { $gt: [{ $sum: "$inventoryData.inventoryQuantity" }, 0] }
    }
  });

  // Price filters
  if (minPrice !== undefined) {
    pipeline.push({ $match: { minPrice: { $gte: Number(minPrice) } } });
  }
  if (maxPrice !== undefined) {
    pipeline.push({ $match: { minPrice: { $lte: Number(maxPrice) } } });
  }

  // Rating filter
  if (minRating !== undefined) {
    pipeline.push({ $match: { avgRating: { $gte: Number(minRating) } } });
  }

  // Reviews filter
  if (minReviews !== undefined) {
    pipeline.push({ $match: { totalReviews: { $gte: Number(minReviews) } } });
  }

  // In stock filter
  if (inStockOnly === true || inStockOnly === "true") {
    pipeline.push({ $match: { inStock: true } });
  }

  // Build sort options
  const sortStage = {};
  const normalizedRating = normalizeSortOrder(sortByRating, "desc");
  const normalizedPopularity = normalizeSortOrder(sortByPopularity, "desc");
  const normalizedPrice = normalizeSortOrder(sortByPrice, "asc");

  if (normalizedRating) {
    sortStage.avgRating = normalizedRating === "desc" ? -1 : 1;
  }
  if (normalizedPopularity) {
    sortStage.totalReviews = normalizedPopularity === "desc" ? -1 : 1;
  }
  if (normalizedPrice) {
    sortStage.minPrice = normalizedPrice === "desc" ? -1 : 1;
  }
  
  // Default sort by text score if available, then by totalReviews
  if (Object.keys(sortStage).length === 0) {
    if (queryInfo.normalized) {
      sortStage.textScore = -1;
    }
    sortStage.totalReviews = -1;
    sortStage.minPrice = 1;
  }

  pipeline.push({ $sort: sortStage });

  // Get total count before pagination
  const countPipeline = [...pipeline, { $count: "total" }];
  
  // Add pagination
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limitNum });

  // Project final shape
  pipeline.push({
    $project: {
      productId: 1,
      name: 1,
      modelNo: 1,
      brand: 1,
      category: 1,
      minPrice: 1,
      maxPrice: 1,
      rating: "$avgRating",
      totalReviews: 1,
      inStock: 1,
      textScore: 1,
      stores: {
        $map: {
          input: "$inventoryData",
          as: "inv",
          in: {
            storeId: "$$inv.storeId",
            price: "$$inv.price",
            listPrice: "$$inv.listPrice",
            inventoryQuantity: "$$inv.inventoryQuantity",
            rating: "$$inv.rating",
            totalReviews: "$$inv.totalReviews",
            url: "$$inv.url",
            images: {
              $map: {
                input: "$imageData",
                as: "img",
                in: "$$img.url"
              }
            }
          }
        }
      }
    }
  });

  // Execute aggregation
  const [results, countResult] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate(countPipeline)
  ]);

  const totalResults = countResult[0]?.total || 0;

  return {
    results,
    totalResults,
    page: pageNum,
    limit: limitNum
  };
};

/* -------------------------
   DB save helper (fire-and-forget)
   ------------------------- */

const saveApiResultsToDb = async (apiResults = [], platformStr = "homedepot_search") => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("saveApiResultsToDb: MONGO_URI not set — skipping DB save");
      return;
    }

    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    let storeId = "homedepot";
    const p = String(platformStr || "").toLowerCase();
    if (p.includes("lowe")) storeId = "lowe's";
    if (p.includes("home")) storeId = "homedepot";

    const storeName = storeId === "lowe's" ? "Lowe's" : "Home Depot";

    await Store.updateOne(
      { _id: storeId },
      { $setOnInsert: { name: storeName, createdAt: new Date() } },
      { upsert: true }
    );

    const productOps = [];
    const inventoryOps = [];
    const imageOps = [];

    for (const item of apiResults) {
      const raw = item || {};
      const normalized = storeId === "lowe's" ? normalizeLowes(raw) : normalizeHomeDepot(raw);
      const { product, inventory, images } = normalized;

      productOps.push({
        updateOne: {
          filter: { productId: product.productId },
          update: { $set: product, $setOnInsert: { createdAt: new Date() } },
          upsert: true
        }
      });

      inventoryOps.push({
        updateOne: {
          filter: { productId: inventory.productId, storeId: inventory.storeId },
          update: { $set: inventory, $setOnInsert: { createdAt: new Date() } },
          upsert: true
        }
      });

      for (const img of images) {
        if (!img.url) continue;
        imageOps.push({
          updateOne: {
            filter: { url: img.url, productId: img.productId },
            update: { $set: img, $setOnInsert: { createdAt: new Date() } },
            upsert: true
          }
        });
      }
    }

    if (productOps.length) await Product.bulkWrite(productOps, { ordered: false });
    if (inventoryOps.length) await Inventory.bulkWrite(inventoryOps, { ordered: false });
    if (imageOps.length) await Image.bulkWrite(imageOps, { ordered: false });

    console.log(`saveApiResultsToDb: upserted ${productOps.length} products for store ${storeId}`);
  } catch (err) {
    console.error("saveApiResultsToDb error:", err?.message || err);
  }
};

/* -------------------------
   BUILD ELASTICSEARCH QUERY
   Production-grade search with NO false positives
   ------------------------- */

const buildElasticsearchQuery = (queryInfo) => {
  const { normalized, tokens, isNumeric, isModelNumber, detectedBrand, synonyms, searchIntent } = queryInfo;
  const shouldClauses = [];
  const mustClauses = [];

  // ===========================================
  // TIER 1: EXACT MATCHES (Highest Priority)
  // ===========================================

  if (isNumeric) {
    // Product ID search - exact match only
    shouldClauses.push(
      { term: { productId: { value: normalized, boost: 100 } } }
    );
  } else if (isModelNumber) {
    // Model number search
    shouldClauses.push(
      { term: { modelNo: { value: normalized, boost: 100 } } },
      { match: { "modelNo.text": { query: normalized, boost: 80 } } }
    );
  } else {
    // ===========================================
    // TIER 1: EXACT PHRASE MATCH
    // "hand tools" must match "hand tools" exactly in order
    // ===========================================
    shouldClauses.push({
      match_phrase: {
        name: {
          query: normalized,
          boost: 100,
          slop: 0  // No words between
        }
      }
    });

    // Exact match on keyword field
    shouldClauses.push({
      term: {
        "name.exact": {
          value: normalized,
          boost: 120
        }
      }
    });

    // ===========================================
    // TIER 2: PHRASE WITH MINOR FLEXIBILITY
    // "hand tools" can match "hand power tools"
    // ===========================================
    shouldClauses.push({
      match_phrase: {
        name: {
          query: normalized,
          boost: 80,
          slop: 1  // Allow 1 word between
        }
      }
    });

    // ===========================================
    // TIER 3: ALL TERMS MUST MATCH (no fuzziness!)
    // "hand tools" must have BOTH "hand" AND "tools"
    // ===========================================
    shouldClauses.push({
      match: {
        name: {
          query: normalized,
          operator: "and",
          boost: 60
          // NO fuzziness - this is key to preventing false matches
        }
      }
    });

    // ===========================================
    // TIER 4: PREFIX/AUTOCOMPLETE MATCHING
    // "fridg" matches "fridge", "fridges", "frigidaire"
    // BUT NOT "bridge" because "b" ≠ "f"
    // ===========================================
    shouldClauses.push({
      match: {
        "name.autocomplete": {
          query: normalized,
          operator: "and",
          boost: 40
        }
      }
    });

    // Match phrase prefix for incomplete queries
    if (tokens.length >= 1) {
      shouldClauses.push({
        match_phrase_prefix: {
          name: {
            query: normalized,
            boost: 35,
            max_expansions: 20
          }
        }
      });
    }

    // ===========================================
    // TIER 5: INDIVIDUAL TOKEN MATCHING
    // Each word must be present, with position-based boosting
    // ===========================================
    if (tokens.length > 1) {
      // Multi-word: require most terms to match
      shouldClauses.push({
        match: {
          name: {
            query: normalized,
            operator: "or",
            minimum_should_match: "80%",
            boost: 30
          }
        }
      });
    }

    // Individual token exact matches (no fuzzy!)
    tokens.forEach((token, idx) => {
      if (token.length >= 3) {
        const positionBoost = (tokens.length - idx) * 2;
        shouldClauses.push({
          match: {
            name: {
              query: token,
              boost: 20 + positionBoost
              // NO fuzziness
            }
          }
        });
      }
    });

    // ===========================================
    // TIER 6: BRAND MATCHING
    // If searching "dewalt drill", boost Dewalt brand products
    // ===========================================
    if (detectedBrand) {
      shouldClauses.push({
        term: {
          brand: {
            value: detectedBrand,
            boost: 50
          }
        }
      });
    }

    // Search in brand field
    shouldClauses.push({
      match: {
        "brand.text": {
          query: normalized,
          boost: 25
        }
      }
    });

    // ===========================================
    // TIER 7: CATEGORY MATCHING
    // ===========================================
    shouldClauses.push({
      match: {
        "category.text": {
          query: normalized,
          boost: 20
        }
      }
    });

    // ===========================================
    // TIER 8: SYNONYM EXPANSION
    // "fridge" also searches for "refrigerator"
    // ===========================================
    if (synonyms && synonyms.length > 0) {
      const synonymClauses = buildSynonymClauses(synonyms);
      shouldClauses.push(...synonymClauses);
    }

    // ===========================================
    // TIER 9: COMBINED SEARCH TEXT
    // Fallback to search across all text
    // ===========================================
    shouldClauses.push({
      match: {
        searchText: {
          query: normalized,
          operator: "and",
          boost: 15
        }
      }
    });
  }

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1
    }
  };
};

/* -------------------------
   BUILD FILTER CLAUSES
   All filters working correctly
   ------------------------- */

const buildFilterClauses = (options) => {
  const {
    storeIds,
    inStockOnly,
    minPrice,
    maxPrice,
    brand,
    category,
    minRating,
    minReviews
  } = options;

  const filters = [];

  // Store filter (nested query)
  if (storeIds && storeIds.length > 0) {
    filters.push({
      nested: {
        path: "stores",
        query: {
          terms: { "stores.storeId": storeIds }
        }
      }
    });
  }

  // In stock filter
  if (inStockOnly) {
    filters.push({ term: { inStock: true } });
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceRange = {};
    if (minPrice !== undefined) priceRange.gte = Number(minPrice);
    if (maxPrice !== undefined) priceRange.lte = Number(maxPrice);
    filters.push({ range: { minPrice: priceRange } });
  }

  // Brand filter
  if (brand) {
    const brandList = brand.split(",").map(b => b.trim().toLowerCase());
    if (brandList.length === 1) {
      filters.push({ term: { brand: brandList[0] } });
    } else {
      filters.push({ terms: { brand: brandList } });
    }
  }

  // Category filter
  if (category) {
    const categoryList = category.split(",").map(c => c.trim().toLowerCase());
    if (categoryList.length === 1) {
      filters.push({ term: { category: categoryList[0] } });
    } else {
      filters.push({ terms: { category: categoryList } });
    }
  }

  // Minimum rating filter
  if (minRating !== undefined) {
    filters.push({
      range: { avgRating: { gte: Number(minRating) } }
    });
  }

  // Minimum reviews filter
  if (minReviews !== undefined) {
    filters.push({
      range: { totalReviews: { gte: Number(minReviews) } }
    });
  }

  return filters;
};


/**
 * Normalize sort order value to 'asc' or 'desc'
 * Handles various input formats: 'desc', 'asc', 'high', 'low', 'high_to_low', 'low_to_high', etc.
 */
const normalizeSortOrder = (value, defaultForHigh = "desc") => {
  if (!value) return null;
  
  const v = String(value).toLowerCase().trim();
  
  // Direct 'desc' or 'asc' values
  if (v === "desc" || v === "descending") return "desc";
  if (v === "asc" || v === "ascending") return "asc";
  
  // Common UI values like 'high', 'low', 'high_to_low', 'low_to_high'
  if (v === "high" || v === "high_to_low" || v === "highest" || v === "most") return "desc";
  if (v === "low" || v === "low_to_high" || v === "lowest" || v === "least") return "asc";
  
  // If truthy but not recognized, use the provided default for "high" values
  return defaultForHigh;
};

const buildCumulativeSortOptions = (sortByRating, sortByPopularity, sortByPrice) => {
  const sort = [];

  // Normalize all sort values
  const normalizedRating = normalizeSortOrder(sortByRating, "desc");
  const normalizedPopularity = normalizeSortOrder(sortByPopularity, "desc");
  const normalizedPrice = normalizeSortOrder(sortByPrice, "asc");

  console.log("🔧 Building cumulative sort:", {
    sortByRating: sortByRating || "none",
    sortByPopularity: sortByPopularity || "none", 
    sortByPrice: sortByPrice || "none",
    normalized: {
      rating: normalizedRating,
      popularity: normalizedPopularity,
      price: normalizedPrice
    }
  });

  // ===========================================
  // COMBINED RATING + POPULARITY SORTING
  // When both are applied, use a script to combine them
  // This ensures products are sorted by BOTH factors together
  // ===========================================
  if (normalizedRating && normalizedPopularity) {
    // Use script-based sorting to combine rating and popularity
    // Normalize both values to 0-1 range and combine them
    const ratingOrder = normalizedRating === "desc" ? 1 : -1;
    const popularityOrder = normalizedPopularity === "desc" ? 1 : -1;
    
    sort.push({
      _script: {
        type: "number",
        script: {
          lang: "painless",
          source: `
            // Normalize rating (0-5 scale to 0-1)
            double ratingScore = (doc['avgRating'].size() > 0 ? doc['avgRating'].value : 0) / 5.0;
            
            // Normalize totalReviews using log scale (to prevent huge values from dominating)
            // Using log10(reviews + 1) / log10(10001) to get 0-1 range (max ~10000 reviews)
            double reviewsRaw = doc['totalReviews'].size() > 0 ? doc['totalReviews'].value : 0;
            double popularityScore = Math.log10(reviewsRaw + 1) / Math.log10(10001);
            
            // Combine scores with equal weight (50% each)
            // Multiply by order factors to handle asc/desc
            double combinedScore = (ratingScore * ${ratingOrder} * 0.5) + (popularityScore * ${popularityOrder} * 0.5);
            
            return combinedScore;
          `
        },
        order: "desc"  // Higher combined score = better
      }
    });
    console.log("   ✅ Added COMBINED rating+popularity sort (script-based)");
    
    // Add price as secondary sort if specified
    if (normalizedPrice) {
      sort.push({
        minPrice: {
          order: normalizedPrice,
          missing: "_last"
        }
      });
      console.log("   ✅ Added price sort:", normalizedPrice);
    }
  } else {
    // Single filter mode - use direct field sorting
    
    // Priority 1: Rating (if specified alone)
    if (normalizedRating) {
      sort.push({
        avgRating: {
          order: normalizedRating,
          missing: "_last"
        }
      });
      console.log("   ✅ Added rating sort:", normalizedRating);
    }

    // Priority 2: Popularity (if specified alone) - uses totalReviews field
    if (normalizedPopularity) {
      sort.push({
        totalReviews: {
          order: normalizedPopularity,
          missing: "_last"
        }
      });
      console.log("   ✅ Added popularity sort (totalReviews):", normalizedPopularity);
    }

    // Priority 3: Price (if specified)
    if (normalizedPrice) {
      sort.push({
        minPrice: {
          order: normalizedPrice,
          missing: "_last"
        }
      });
      console.log("   ✅ Added price sort:", normalizedPrice);
    }
  }

  // Always add relevance score as final tiebreaker
  sort.push({ _score: { order: "desc" } });

  // If no explicit sorts, add default tiebreakers
  if (!normalizedRating && !normalizedPopularity && !normalizedPrice) {
    sort.push({ totalReviews: { order: "desc", missing: "_last" } });
    sort.push({ minPrice: { order: "asc", missing: "_last" } });
  }

  console.log("✅ Final sort array:", JSON.stringify(sort, null, 2));
  return sort;
};

/* -------------------------
   MAIN SEARCH CONTROLLER
   ------------------------- */

export const searchProducts = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      query,
      stores,
      page = 1,
      limit = 20,
      inStockOnly = false,
      // New unified sort parameter
      // sortBy = 'relevance', // 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'popularity' | 'newest'
      // Legacy sort parameters (for backward compatibility)
      sortByRating,
      sortByPopularity,
      sortByPrice,
      minPrice,
      maxPrice,
      brand,
      category,
      minRating,
      minReviews,
    } = req.query;

    console.log("🔍 Search request:", {
      query,
      stores,
      page,
      limit,
      sortByRating,
      sortByPopularity,
      sortByPrice
    });

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search term"
      });
    }

    // Preprocess query
    const queryInfo = preprocessQuery(query);
    console.log("📝 Processed query:", {
      original: queryInfo.original,
      tokens: queryInfo.tokens,
      searchIntent: queryInfo.searchIntent,
      synonyms: queryInfo.synonyms
    });

    // Parse store IDs
    const storeIds = stores
      ? stores.split(",").map(s => normalizeStoreId(s)).filter(Boolean)
      : null;

    // Calculate minimum score threshold
    const minScore = calculateMinScore(queryInfo);

    // Determine sort option (new unified param takes priority)
    // const effectiveSortBy = sortBy !== 'relevance'
    //   ? sortBy
    //   : convertLegacySortOptions(sortByRating, sortByPopularity, sortByPrice);

    // console.log("📊 Sort option:", effectiveSortBy);

    // ===========================================
    // TRY ELASTICSEARCH FIRST
    // ===========================================
    try {
      // Build query
      const esQuery = buildElasticsearchQuery(queryInfo);

      // Build filters
      const filterClauses = buildFilterClauses({
        storeIds,
        inStockOnly: inStockOnly === "true" || inStockOnly === true,
        minPrice,
        maxPrice,
        brand,
        category,
        minRating,
        minReviews
      });

      // Build sort (single sort option, not multiple)
      const sort = buildCumulativeSortOptions(sortByRating, sortByPopularity, sortByPrice);

      // Pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const from = (pageNum - 1) * limitNum;

      // Execute search
      const esResponse = await esClient.search({
        index: PRODUCT_INDEX,
        body: {
          from,
          size: limitNum,
          query: {
            bool: {
              must: [esQuery],
              filter: filterClauses
            }
          },
          min_score: minScore,
          sort,
          track_total_hits: true,
          // Return explanation for debugging (optional)
          // explain: true
        }
      });

      const hits = esResponse.hits.hits;
      const totalResults = esResponse.hits.total.value;

      console.log(`✅ Elasticsearch: ${hits.length} results (${totalResults} total) in ${esResponse.took}ms`);

      if (hits.length > 0) {
        // Transform results
        let results = hits.map(hit => {
          const source = hit._source;

          // Filter stores based on query parameters
          let filteredStores = source.stores || [];
          if (storeIds && storeIds.length > 0) {
            filteredStores = filteredStores.filter(s => storeIds.includes(s.storeId));
          }
          if (inStockOnly === "true" || inStockOnly === true) {
            filteredStores = filteredStores.filter(s => s.inventoryQuantity > 0);
          }

          return {
            productId: source.productId,
            name: source.name,
            modelNo: source.modelNo,
            brand: source.brand,
            category: source.category,
            minPrice: source.minPrice,
            maxPrice: source.maxPrice,
            rating: source.avgRating,
            totalReviews: source.totalReviews,
            inStock: source.inStock,
            stores: filteredStores,
            score: hit._score
          };
        });

        // ===========================================
        // POST-PROCESSING: Filter out false positives
        // This is the KEY to preventing "fridge" → "bridge" matches
        // ===========================================
        results = results.filter(result => !isFalsePositive(result.name, queryInfo));

        // Additional relevance filtering
        results = filterIrrelevantResults(results, queryInfo, 15);

        // Build active filters for response
        const activeFilters = {
          query: queryInfo.original,
          stores: storeIds,
          inStockOnly: inStockOnly === "true" || inStockOnly === true,
          priceRange: {
            min: minPrice ? Number(minPrice) : null,
            max: maxPrice ? Number(maxPrice) : null
          },
          brand: brand ? brand.split(",").map(b => b.trim()) : null,
          category: category ? category.split(",").map(c => c.trim()) : null,
          minRating: minRating ? Number(minRating) : null,
          minReviews: minReviews ? Number(minReviews) : null,
          sortByRating,
          sortByPopularity,
          sortByPrice
        };

        // Get suggestions if few results
        const suggestions = results.length < 5 ? getSuggestions(queryInfo) : [];

        const executionTime = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          results,
          totalResults: results.length,           // Filtered results count (after post-processing)
          totalMatchedResults: totalResults,      // Total from Elasticsearch (before post-processing)
          pagination: {
            currentPage: pageNum,
            hasNextPage: from + hits.length < totalResults,
            totalResults: totalResults,           // Use ES total for pagination calculation
            totalPages: Math.ceil(totalResults / limitNum),
            limit: limitNum,
            showing: {
              from: from + 1,
              to: from + results.length,
              of: totalResults                    // "Showing 1-18 out of 79 products"
            }
          },
          activeFilters,
          searchMethod: "elasticsearch",
          searchedStores: storeIds || ["all"],
          queryInfo: {
            original: queryInfo.original,
            tokens: queryInfo.tokens,
            searchIntent: queryInfo.searchIntent,
            detectedBrand: queryInfo.detectedBrand
          },
          suggestions,
          executionTime: `${executionTime}ms`
        });
      }

      // No results from Elasticsearch - provide suggestions
      const suggestions = getSuggestions(queryInfo);

      console.log("⚠️ No Elasticsearch results, trying MongoDB fallback");

    } catch (esError) {
      console.error("⚠️ Elasticsearch error:", esError?.message || esError);
      // Continue to MongoDB fallback
    }

    // ===========================================
    // FALLBACK TO MONGODB DATABASE
    // ===========================================
    try {
      console.log("🗄️ Trying MongoDB database fallback...");

      const dbResult = await searchProductsFromDb(queryInfo, {
        storeIds,
        inStockOnly: inStockOnly === "true" || inStockOnly === true,
        minPrice,
        maxPrice,
        brand,
        category,
        minRating,
        minReviews,
        page,
        limit,
        sortByRating,
        sortByPopularity,
        sortByPrice
      });

      if (dbResult.results && dbResult.results.length > 0) {
        // Filter false positives
        let results = dbResult.results.filter(result => !isFalsePositive(result.name, queryInfo));

        // Additional relevance filtering
        results = filterIrrelevantResults(results, queryInfo, 15);

        console.log(`✅ MongoDB: ${results.length} results found`);

        // Build active filters for response
        const activeFilters = {
          query: queryInfo.original,
          stores: storeIds,
          inStockOnly: inStockOnly === "true" || inStockOnly === true,
          priceRange: {
            min: minPrice ? Number(minPrice) : null,
            max: maxPrice ? Number(maxPrice) : null
          },
          brand: brand ? brand.split(",").map(b => b.trim()) : null,
          category: category ? category.split(",").map(c => c.trim()) : null,
          minRating: minRating ? Number(minRating) : null,
          minReviews: minReviews ? Number(minReviews) : null,
          sortByRating,
          sortByPopularity,
          sortByPrice
        };

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const executionTime = Date.now() - startTime;

        return res.status(200).json({
          success: true,
          results,
          totalResults: results.length,
          totalMatchedResults: dbResult.totalResults,
          pagination: {
            currentPage: pageNum,
            hasNextPage: (pageNum * limitNum) < dbResult.totalResults,
            totalResults: dbResult.totalResults,
            totalPages: Math.ceil(dbResult.totalResults / limitNum),
            limit: limitNum,
            showing: {
              from: ((pageNum - 1) * limitNum) + 1,
              to: ((pageNum - 1) * limitNum) + results.length,
              of: dbResult.totalResults
            }
          },
          activeFilters,
          searchMethod: "mongodb",
          searchedStores: storeIds || ["all"],
          queryInfo: {
            original: queryInfo.original,
            tokens: queryInfo.tokens,
            searchIntent: queryInfo.searchIntent,
            detectedBrand: queryInfo.detectedBrand
          },
          suggestions: results.length < 5 ? getSuggestions(queryInfo) : [],
          executionTime: `${executionTime}ms`
        });
      }

      console.log("⚠️ No MongoDB results, trying third-party API fallback");

    } catch (dbError) {
      console.error("⚠️ MongoDB error:", dbError?.message || dbError);
      // Continue to third-party API fallback
    }

    // ===========================================
    // FALLBACK TO THIRD-PARTY API
    // ===========================================
    try {
      const platform = storeIds && storeIds.length > 0
        ? storeIds.map(s => storeIdToPlatform(s)).join(",")
        : "homedepot_search";

      const apiUrl = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(query)}&page=${page}&api_key=${API_KEY}`;

      console.log("🌐 Fallback API:", apiUrl);
      const { data } = await axios.get(apiUrl, { timeout: 10000 });
      const apiResults = data?.results || [];

      // Transform API results
      let results = apiResults.map((item, index) => ({
        productId: item.id || `api-${page}-${index}`,
        name: item.name || item.title || "Unknown Product",
        modelNo: item.model_no || item.modelNo || "",
        brand: item.brand || "",
        category: item.category || "",
        minPrice: Number(item.price) || 0,
        maxPrice: Number(item.list_price || item.price) || 0,
        rating: Number(item.rating) || 0,
        totalReviews: Number(item.total_reviews || item.totalReviews) || 0,
        inStock: item.in_stock !== false && item.inventory_quantity !== 0,
        stores: [{
          storeId: normalizeStoreId(item.store || platform.split(",")[0] || "homedepot"),
          price: Number(item.price) || 0,
          inventoryQuantity: item.inventory_quantity || (item.in_stock ? 1 : 0),
          rating: Number(item.rating) || 0,
          totalReviews: Number(item.total_reviews || item.totalReviews) || 0,
          images: item.thumbnails || item.images || [],
          url: item.url || ""
        }]
      }));

      // Apply filters
      if (minPrice) results = results.filter(p => p.minPrice >= Number(minPrice));
      if (maxPrice) results = results.filter(p => p.minPrice <= Number(maxPrice));
      if (minRating) results = results.filter(p => p.rating >= Number(minRating));
      if (minReviews) results = results.filter(p => p.totalReviews >= Number(minReviews));
      if (brand) {
        const brandList = brand.split(",").map(b => b.trim().toLowerCase());
        results = results.filter(p => p.brand && brandList.includes(p.brand.toLowerCase()));
      }
      if (inStockOnly === "true" || inStockOnly === true) {
        results = results.filter(p => p.inStock);
      }

      // Filter false positives
      results = results.filter(result => !isFalsePositive(result.name, queryInfo));

      // Apply sorting using normalized values
      const normalizedRating = normalizeSortOrder(sortByRating, "desc");
      const normalizedPopularity = normalizeSortOrder(sortByPopularity, "desc");
      const normalizedPrice = normalizeSortOrder(sortByPrice, "asc");

      // Helper function to calculate combined score (matches ES script logic)
      const calculateCombinedScore = (product, ratingOrder, popularityOrder) => {
        // Normalize rating (0-5 scale to 0-1)
        const ratingScore = (product.rating || 0) / 5.0;
        
        // Normalize totalReviews using log scale
        const reviewsRaw = product.totalReviews || 0;
        const popularityScore = Math.log10(reviewsRaw + 1) / Math.log10(10001);
        
        // Combine scores with equal weight (50% each)
        return (ratingScore * ratingOrder * 0.5) + (popularityScore * popularityOrder * 0.5);
      };

      results.sort((a, b) => {
        // If both rating AND popularity filters are applied, use combined scoring
        if (normalizedRating && normalizedPopularity) {
          const ratingOrder = normalizedRating === "desc" ? 1 : -1;
          const popularityOrder = normalizedPopularity === "desc" ? 1 : -1;
          
          const scoreA = calculateCombinedScore(a, ratingOrder, popularityOrder);
          const scoreB = calculateCombinedScore(b, ratingOrder, popularityOrder);
          
          const diff = scoreB - scoreA;  // Higher score first
          if (diff !== 0) return diff;
          
          // Price as tiebreaker
          if (normalizedPrice) {
            return normalizedPrice === "desc" 
              ? (b.minPrice || 0) - (a.minPrice || 0) 
              : (a.minPrice || 0) - (b.minPrice || 0);
          }
          return 0;
        }
        
        // Single filter mode
        if (normalizedRating) {
          const diff = normalizedRating === "desc" ? (b.rating || 0) - (a.rating || 0) : (a.rating || 0) - (b.rating || 0);
          if (diff !== 0) return diff;
        }
        if (normalizedPopularity) {
          const diff = normalizedPopularity === "desc" ? (b.totalReviews || 0) - (a.totalReviews || 0) : (a.totalReviews || 0) - (b.totalReviews || 0);
          if (diff !== 0) return diff;
        }
        if (normalizedPrice) {
          const diff = normalizedPrice === "desc" ? (b.minPrice || 0) - (a.minPrice || 0) : (a.minPrice || 0) - (b.minPrice || 0);
          if (diff !== 0) return diff;
        }
        return (a.minPrice || 0) - (b.minPrice || 0);
      });

      // Save to DB (fire and forget)
      saveApiResultsToDb(apiResults, platform).catch(e =>
        console.error("Background save failed:", e?.message)
      );

      const executionTime = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        results,
        totalResults: results.length,
        pagination: {
          currentPage: Number(page),
          hasNextPage: apiResults.length >= 20,
          totalResults: results.length,
          totalPages: data?.no_of_pages || 1,
          limit: Number(limit)
        },
        activeFilters: {
          query: queryInfo.original,
          stores: storeIds,
          inStockOnly: inStockOnly === "true" || inStockOnly === true
        },
        searchMethod: "third-party-api",
        searchedStores: storeIds || ["all"],
        suggestions: getSuggestions(queryInfo),
        executionTime: `${executionTime}ms`
      });

    } catch (apiError) {
      console.error("❌ API fallback error:", apiError?.message || apiError);

      const executionTime = Date.now() - startTime;

      return res.status(200).json({
        success: false,
        results: [],
        totalResults: 0,
        pagination: {
          currentPage: Number(page),
          hasNextPage: false,
          totalResults: 0,
          totalPages: 0,
          limit: Number(limit)
        },
        activeFilters: { query: queryInfo.original },
        searchMethod: "fallback-error",
        suggestions: getSuggestions(queryInfo),
        message: "No results found. Try different search terms.",
        executionTime: `${executionTime}ms`
      });
    }

  } catch (error) {
    console.error("❌ Search error:", error?.message || error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "An error occurred while searching. Please try again."
    });
  }
};

/* -------------------------
   AUTOCOMPLETE/SUGGESTIONS ENDPOINT
   Fast prefix-based suggestions
   ------------------------- */

export const getSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const queryInfo = preprocessQuery(query);

    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        size: 0,
        query: {
          match: {
            "name.autocomplete": {
              query: queryInfo.normalized,
              operator: "and"
            }
          }
        },
        aggs: {
          suggestions: {
            terms: {
              field: "name.exact",
              size: Number(limit),
              order: { _count: "desc" }
            }
          },
          brands: {
            terms: {
              field: "brand",
              size: 5
            }
          },
          categories: {
            terms: {
              field: "category",
              size: 5
            }
          }
        }
      }
    });

    const suggestions = response.aggregations?.suggestions?.buckets?.map(b => b.key) || [];
    const brands = response.aggregations?.brands?.buckets?.map(b => b.key) || [];
    const categories = response.aggregations?.categories?.buckets?.map(b => b.key) || [];

    // Add synonym-based suggestions
    const synonymSuggestions = queryInfo.synonyms.slice(0, 3);

    return res.status(200).json({
      suggestions: [...new Set([...suggestions, ...synonymSuggestions])].slice(0, Number(limit)),
      brands,
      categories
    });

  } catch (error) {
    console.error("Suggestions error:", error?.message);
    return res.status(200).json({ suggestions: [] });
  }
};

/* -------------------------
   GET AVAILABLE FILTERS
   Returns available filter options for current search
   ------------------------- */

export const getAvailableFilters = async (req, res) => {
  try {
    const { query, stores } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const queryInfo = preprocessQuery(query);
    const storeIds = stores?.split(",").map(s => normalizeStoreId(s)).filter(Boolean);

    const esQuery = buildElasticsearchQuery(queryInfo);
    const filterClauses = storeIds ? [{
      nested: {
        path: "stores",
        query: { terms: { "stores.storeId": storeIds } }
      }
    }] : [];

    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        size: 0,
        query: {
          bool: {
            must: [esQuery],
            filter: filterClauses
          }
        },
        aggs: {
          brands: {
            terms: { field: "brand", size: 50 }
          },
          categories: {
            terms: { field: "category", size: 50 }
          },
          price_stats: {
            stats: { field: "minPrice" }
          },
          rating_stats: {
            stats: { field: "avgRating" }
          },
          stores: {
            nested: { path: "stores" },
            aggs: {
              store_ids: {
                terms: { field: "stores.storeId", size: 10 }
              }
            }
          }
        }
      }
    });

    const aggs = response.aggregations;

    return res.status(200).json({
      brands: aggs?.brands?.buckets?.map(b => ({ name: b.key, count: b.doc_count })) || [],
      categories: aggs?.categories?.buckets?.map(c => ({ name: c.key, count: c.doc_count })) || [],
      priceRange: {
        min: aggs?.price_stats?.min || 0,
        max: aggs?.price_stats?.max || 0,
        avg: aggs?.price_stats?.avg || 0
      },
      ratingRange: {
        min: aggs?.rating_stats?.min || 0,
        max: aggs?.rating_stats?.max || 5,
        avg: aggs?.rating_stats?.avg || 0
      },
      stores: aggs?.stores?.store_ids?.buckets?.map(s => ({ id: s.key, count: s.doc_count })) || []
    });

  } catch (error) {
    console.error("Filters error:", error?.message);
    return res.status(500).json({ error: "Failed to get filters" });
  }
};

export default {
  searchProducts,
  getSearchSuggestions,
  getAvailableFilters
};
