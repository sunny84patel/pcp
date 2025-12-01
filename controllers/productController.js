// controllers/searchProducts.js
import axios from "axios";
import esClient from "../config/elasticsearch.js";
import { PRODUCT_INDEX } from "../utils/elasticsearchSync.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product, Store, Inventory, Image } from "../models/Product.js";

dotenv.config();

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

/* -------------------------
   Helpers: store normalization
   ------------------------- */

// Normalize incoming request store tokens to canonical DB storeId
// Always return "lowe's" (with apostrophe) for Lowe's, "homedepot" for Home Depot.
const normalizeStoreId = (s) => {
  if (!s) return s;
  const low = s.trim().toLowerCase();
  if (low.includes("lowe")) return "lowe's";
  if (low.includes("home")) return "homedepot";
  return low.replace(/\s+/g, "");
};

// Convert normalized storeId into third-party platform param
// e.g. "homedepot" -> "homedepot_search", "lowe's" -> "lowes_search"
const storeIdToPlatform = (storeId) => {
  if (!storeId) return "homedepot_search";
  if (storeId === "homedepot") return "homedepot_search";
  if (storeId === "lowe's") return "lowes_search";
  return `${storeId}_search`;
};

/* -------------------------
   Normalizers for API items
   ------------------------- */

const normalizeHomeDepot = (item) => {
  const productId = item.id?.toString() ?? `api-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
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
  const productId = item.id?.toString() ?? `api-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
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
      storeId: "lowe's", // <-- canonical storeId with apostrophe
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
   Saver: fire-and-forget DB upsert
   ------------------------- */

const saveApiResultsToDb = async (apiResults = [], platformStr = "homedepot_search") => {
  try {
    // If no MONGO_URI, skip saving
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("saveApiResultsToDb: MONGO_URI not set — skipping DB save");
      return;
    }

    // Only connect if not connected. If app has a global connection, it will be used.
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("saveApiResultsToDb: Connected to MongoDB");
    }

    // Decide canonical storeId from platformStr
    let storeId = "homedepot";
    const p = String(platformStr || "").toLowerCase();
    if (p.includes("lowe")) storeId = "lowe's";
    if (p.includes("home")) storeId = "homedepot";

    const storeName = storeId === "lowe's" ? "Lowe's" : "Home Depot";

    // ensure store doc exists
    await Store.updateOne(
      { _id: storeId },
      { $setOnInsert: { name: storeName, createdAt: new Date() } },
      { upsert: true }
    );

    const productOps = [];
    const inventoryOps = [];
    const imageOps = [];

    for (const item of apiResults) {
      // Prefer using the raw item for more complete normalization
      const raw = item || {};
      const normalized = storeId === "lowe's" ? normalizeLowes(raw) : normalizeHomeDepot(raw);
      const { product, inventory, images } = normalized;

      // Product upsert
      productOps.push({
        updateOne: {
          filter: { productId: product.productId },
          update: { $set: product, $setOnInsert: { createdAt: new Date() } },
          upsert: true
        }
      });

      // Inventory upsert (unique per productId + storeId)
      inventoryOps.push({
        updateOne: {
          filter: { productId: inventory.productId, storeId: inventory.storeId },
          update: { $set: inventory, $setOnInsert: { createdAt: new Date() } },
          upsert: true
        }
      });

      // Images upserts
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

    if (productOps.length) {
      await Product.bulkWrite(productOps, { ordered: false });
    }
    if (inventoryOps.length) {
      await Inventory.bulkWrite(inventoryOps, { ordered: false });
    }
    if (imageOps.length) {
      await Image.bulkWrite(imageOps, { ordered: false });
    }

    console.log(`saveApiResultsToDb: upserted ${productOps.length} products, ${inventoryOps.length} inventories, ${imageOps.length} images for store ${storeId}`);
  } catch (err) {
    console.error("saveApiResultsToDb error:", err && err.message ? err.message : err);
  } finally {
    // don't disconnect mongoose here (app-level connection preferred)
  }
};

/* -------------------------
   Main controller
   ------------------------- */

export const searchProducts = async (req, res) => {
  try {
    const {
      query,
      stores,
      page = 1,
      limit = 20,
      inStockOnly = false,
      sortByRating,      // "asc" | "desc" | undefined
      sortByPopularity,  // "asc" | "desc" | undefined
      minPrice,
      maxPrice,
      brand,
      category,
      minRating,
      minReviews,
    } = req.query;

    console.log("🔍 Backend received query params:", {
      query,
      stores,
      page,
      sortByRating,
      sortByPopularity,
      minPrice,
      maxPrice
    });

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Normalize incoming store filters
    const storeIds = stores
      ? stores.split(",").map(s => normalizeStoreId(s))
      : null;

    const isNumericQuery = /^\d+$/.test(query.trim());

    // ========================================
    // ELASTICSEARCH SEARCH QUERY
    // ========================================
    try {
      const mustClauses = [];
      const shouldClauses = [];
      const filterClauses = [];

      if (isNumericQuery) {
        shouldClauses.push(
          { term: { productId: { value: query.trim(), boost: 10 } } },
          { term: { "modelNo.keyword": { value: query.trim(), boost: 8 } } }
        );
      } else {
        const normalizedQuery = query.trim().toLowerCase();
        const queryTokens = normalizedQuery.split(/\s+/);

        shouldClauses.push({
          match_phrase: {
            name: {
              query: query,
              boost: 100,
              slop: 0
            }
          }
        });

        shouldClauses.push({
          match: {
            "name.keyword": {
              query: query,
              boost: 80
            }
          }
        });

        shouldClauses.push({
          match: {
            name: {
              query: query,
              operator: "and",
              boost: 50
            }
          }
        });

        if (queryTokens.length > 1) {
          shouldClauses.push({
            bool: {
              must: queryTokens.map(token => ({
                match: {
                  name: {
                    query: token,
                    operator: "and",
                    boost: 30
                  }
                }
              })),
              boost: 40
            }
          });
        }

        shouldClauses.push({
          match: {
            name: {
              query: query,
              fuzziness: "AUTO",
              prefix_length: 2,
              max_expansions: 10,
              operator: "and",
              boost: 20
            }
          }
        });

        shouldClauses.push({
          match_phrase: {
            brand: {
              query: query,
              boost: 30
            }
          }
        });

        shouldClauses.push({
          match: {
            category: {
              query: query,
              boost: 10
            }
          }
        });

        if (/^[a-zA-Z0-9\-]+$/.test(normalizedQuery)) {
          shouldClauses.push({
            wildcard: {
              "modelNo.keyword": {
                value: `*${normalizedQuery}*`,
                boost: 25,
                case_insensitive: true
              }
            }
          });
        }
      }

      mustClauses.push({
        bool: {
          should: shouldClauses,
          minimum_should_match: 1
        }
      });

      const minScore = isNumericQuery ? 5 : 15;

      // Filters
      if (storeIds && storeIds.length > 0) {
        filterClauses.push({
          nested: {
            path: "stores",
            query: {
              terms: { "stores.storeId": storeIds }
            }
          }
        });
      }

      if (inStockOnly === "true" || inStockOnly === true) {
        filterClauses.push({ term: { inStock: true } });
      }

      if (minPrice || maxPrice) {
        const priceFilter = {};
        if (minPrice) priceFilter.gte = Number(minPrice);
        if (maxPrice) priceFilter.lte = Number(maxPrice);
        filterClauses.push({ range: { minPrice: priceFilter } });
      }

      if (brand) {
        const brandList = brand.split(",").map(b => b.trim());
        if (brandList.length === 1) {
          filterClauses.push({ term: { "brand.keyword": brandList[0] } });
        } else {
          filterClauses.push({ terms: { "brand.keyword": brandList } });
        }
      }

      if (category) {
        const categoryList = category.split(",").map(c => c.trim());
        if (categoryList.length === 1) {
          filterClauses.push({ term: { "category.keyword": categoryList[0] } });
        } else {
          filterClauses.push({ terms: { "category.keyword": categoryList } });
        }
      }

      if (minRating) {
        filterClauses.push({
          range: {
            avgRating: {
              gte: Number(minRating)
            }
          }
        });
      }

      if (minReviews) {
        filterClauses.push({
          range: {
            totalReviews: {
              gte: Number(minReviews)
            }
          }
        });
      }

      // Sorting
      let sort = [];
      if (sortByRating || sortByPopularity) {
        if (sortByRating) {
          sort.push({ avgRating: { order: sortByRating } });
          console.log("✅ Adding rating sort:", sortByRating);
        }
        if (sortByPopularity) {
          sort.push({ totalReviews: { order: sortByPopularity } });
          console.log("✅ Adding popularity sort:", sortByPopularity);
        }
        sort.push({ _score: { order: "desc" } });
      } else {
        sort.push({ _score: { order: "desc" } });
      }
      sort.push({ minPrice: { order: "asc" } });

      console.log("📊 Final sort array:", JSON.stringify(sort, null, 2));

      // Execute Elasticsearch query
      const from = (Number(page) - 1) * Number(limit);
      const esResponse = await esClient.search({
        index: PRODUCT_INDEX,
        body: {
          from,
          size: Number(limit),
          query: {
            bool: {
              must: mustClauses,
              filter: filterClauses
            }
          },
          min_score: minScore,
          sort,
          track_total_hits: true
        }
      });

      const hits = esResponse.hits.hits;
      const totalResults = esResponse.hits.total.value;

      if (hits.length > 0) {
        const results = hits.map(hit => {
          const source = hit._source;

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
            rating: source.avgRating,
            totalReviews: source.totalReviews,
            stores: filteredStores,
            relevanceScore: hit._score
          };
        });

        const activeFilters = {
          query,
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
          sortByPopularity
        };

        return res.status(200).json({
          results,
          totalResults,
          totalProducts: results.length,
          pagination: {
            currentPage: Number(page),
            hasNextPage: from + hits.length < totalResults,
            totalResults,
            totalPages: Math.ceil(totalResults / Number(limit)),
            limit: Number(limit),
          },
          activeFilters,
          searchMethod: "elasticsearch",
          searchedStores: storeIds || ["all stores"],
          executionTime: esResponse.took + "ms"
        });
      }
    } catch (esError) {
      console.error("⚠️ Elasticsearch search failed, falling back:", esError && esError.message ? esError.message : esError);
    }

    // ========================================
    // FALLBACK TO THIRD-PARTY API
    // ========================================
    try {
      const platform = storeIds && storeIds.length > 0
        ? storeIds.map(s => storeIdToPlatform(s)).join(",")
        : "homedepot_search";

      const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(query)}&page=${page}&api_key=${API_KEY}`;

      console.log("🌐 Fallback: Fetching from third-party API:", url);
      const { data } = await axios.get(url);
      const apiResults = data?.results || [];

      let filteredApiResults = apiResults.map((item, index) => ({
        productId: item.id || `api-${page}-${index}`,
        name: item.name || item.title || "Unknown Product",
        modelNo: item.modelNo || "",
        brand: item.brand || "",
        category: item.category || "",
        minPrice: Number(item.price) || 0,
        rating: item.rating || 0,
        totalReviews: item.totalReviews || 0,
        stores: [{
          storeId: normalizeStoreId(item.store || platform.split(",")[0] || "homedepot"),
          price: Number(item.price) || 0,
          inventoryQuantity: item.inStock ? 1 : 0,
          images: item.thumbnails || item.images || [],
        }],
        rawItem: item // keep raw if needed for saver normalization
      }));

      // Apply filters to API results
      if (minPrice) filteredApiResults = filteredApiResults.filter(p => p.minPrice >= Number(minPrice));
      if (maxPrice) filteredApiResults = filteredApiResults.filter(p => p.minPrice <= Number(maxPrice));
      if (minRating) filteredApiResults = filteredApiResults.filter(p => p.rating >= Number(minRating));
      if (minReviews) filteredApiResults = filteredApiResults.filter(p => p.totalReviews >= Number(minReviews));
      if (brand) {
        const brandList = brand.split(",").map(b => b.trim().toLowerCase());
        filteredApiResults = filteredApiResults.filter(p => p.brand && brandList.includes(p.brand.toLowerCase()));
      }
      if (inStockOnly === "true" || inStockOnly === true) {
        filteredApiResults = filteredApiResults.filter(p => p.stores.some(s => s.inventoryQuantity > 0));
      }

      // Cumulative sorting for API results (same logic as ES)
      filteredApiResults.sort((a, b) => {
        if (sortByRating) {
          const ratingDiff = sortByRating === "asc" ? a.rating - b.rating : b.rating - a.rating;
          if (ratingDiff !== 0) return ratingDiff;
        }
        if (sortByPopularity) {
          const popularityDiff = sortByPopularity === "asc" ? a.totalReviews - b.totalReviews : b.totalReviews - a.totalReviews;
          if (popularityDiff !== 0) return popularityDiff;
        }
        return a.minPrice - b.minPrice;
      });

      const activeFilters = {
        query,
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
        sortByPopularity
      };

      // Fire-and-forget: save original raw API results to DB (normalized inside saver)
      try {
        const platformForSaver = platform.split(",")[0] || "homedepot_search";
        // Note: we pass the raw API array so saver extracts fields correctly per store
        saveApiResultsToDb(apiResults, platformForSaver).catch(e => console.error("Saver call failed:", e && e.message ? e.message : e));
      } catch (triggerErr) {
        console.error("Failed to trigger saver:", triggerErr && triggerErr.message ? triggerErr.message : triggerErr);
      }

      return res.status(200).json({
        results: filteredApiResults,
        totalResults: filteredApiResults.length,
        totalProducts: filteredApiResults.length,
        pagination: {
          currentPage: Number(page),
          hasNextPage: false,
          totalResults: filteredApiResults.length,
          totalPages: 1,
          limit: Number(limit),
        },
        activeFilters,
        searchMethod: "third-party-api",
        searchedStores: storeIds || ["all stores"],
      });
    } catch (apiError) {
      console.error("❌ Error fetching from third-party API:", apiError && apiError.message ? apiError.message : apiError);
      return res.status(200).json({
        results: [],
        totalResults: 0,
        totalProducts: 0,
        pagination: {
          currentPage: Number(page),
          hasNextPage: false,
          totalResults: 0,
          totalPages: 0,
          limit: Number(limit),
        },
        activeFilters: {},
        searchMethod: "fallback-error",
        searchedStores: storeIds || ["all stores"],
      });
    }
  } catch (error) {
    console.error("❌ Error in search API:", error && error.message ? error.message : error);
    res.status(500).json({ error: "Internal server error" });
  }
};
