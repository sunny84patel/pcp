/**
 * Elasticsearch Sync - Production-grade index configuration
 * Optimized for e-commerce product search with minimal false positives
 */

import esClient from "../config/elasticsearch.js";
import { Product, Inventory, Image } from "../models/Product.js";

export const PRODUCT_INDEX = "products_v2";

/**
 * Create optimized product index
 * Key changes from v1:
 * - Removed aggressive n-gram tokenization that caused false matches
 * - Using edge_ngram only for autocomplete field
 * - NO fuzziness in default search to prevent "fridge" → "bridge" matches
 * - Stricter analyzers focused on exact and prefix matching
 */
export const createProductIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });

    if (exists) {
      console.log(`Index ${PRODUCT_INDEX} already exists`);
      return;
    }

    await esClient.indices.create({
      index: PRODUCT_INDEX,
      body: {
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
          max_result_window: 10000,
          
          analysis: {
            // ===================================
            // ANALYZERS - Simplified for precision
            // ===================================
            analyzer: {
              // Standard analyzer - NO stopword removal for product names
              product_standard: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding", "trim"]
              },
              
              // Autocomplete analyzer - edge ngram for prefix matching only
              // "fridge" → ["f", "fr", "fri", "frid", "fridg", "fridge"]
              autocomplete_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding", "autocomplete_filter"]
              },
              
              // Search analyzer - used when searching (NO ngrams)
              autocomplete_search: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"]
              },
              
              // Keyword analyzer for exact matching
              exact_analyzer: {
                type: "custom",
                tokenizer: "keyword",
                filter: ["lowercase", "asciifolding", "trim"]
              },
              
              // Word delimiter for compound words
              // "PowerDrill" → ["PowerDrill", "Power", "Drill"]
              compound_word_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "word_delimiter_preserve"
                ]
              }
            },
            
            // ===================================
            // FILTERS
            // ===================================
            filter: {
              // Edge n-gram for autocomplete (prefix matching only)
              // min_gram: 2 prevents single character matches
              autocomplete_filter: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 20,
                preserve_original: true
              },
              
              // Word delimiter that preserves original
              word_delimiter_preserve: {
                type: "word_delimiter_graph",
                preserve_original: true,
                split_on_numerics: false,
                split_on_case_change: true,
                generate_word_parts: true,
                generate_number_parts: true,
                catenate_words: false,
                catenate_numbers: false,
                catenate_all: false
              }
            },
            
            // ===================================
            // NORMALIZERS
            // ===================================
            normalizer: {
              lowercase_normalizer: {
                type: "custom",
                filter: ["lowercase", "asciifolding"]
              }
            }
          }
        },
        
        // ===================================
        // MAPPINGS - Optimized for search precision
        // ===================================
        mappings: {
          properties: {
            // Product ID - exact match only
            productId: { 
              type: "keyword"
            },
            
            // ===================================
            // NAME - Primary search field
            // ===================================
            name: {
              type: "text",
              analyzer: "product_standard",
              fields: {
                // Exact keyword match (case-insensitive)
                exact: { 
                  type: "keyword",
                  normalizer: "lowercase_normalizer",
                  ignore_above: 256
                },
                // Autocomplete field for prefix matching
                autocomplete: {
                  type: "text",
                  analyzer: "autocomplete_analyzer",
                  search_analyzer: "autocomplete_search"
                },
                // Compound word field
                compound: {
                  type: "text",
                  analyzer: "compound_word_analyzer"
                }
              }
            },
            
            // ===================================
            // MODEL NUMBER
            // ===================================
            modelNo: {
              type: "keyword",
              normalizer: "lowercase_normalizer",
              fields: {
                text: {
                  type: "text",
                  analyzer: "product_standard"
                }
              }
            },
            
            // ===================================
            // BRAND - Important for filtering
            // ===================================
            brand: {
              type: "keyword",
              normalizer: "lowercase_normalizer",
              fields: {
                text: {
                  type: "text",
                  analyzer: "product_standard"
                },
                autocomplete: {
                  type: "text",
                  analyzer: "autocomplete_analyzer",
                  search_analyzer: "autocomplete_search"
                }
              }
            },
            
            // ===================================
            // CATEGORY
            // ===================================
            category: {
              type: "keyword",
              normalizer: "lowercase_normalizer",
              fields: {
                text: {
                  type: "text",
                  analyzer: "product_standard"
                }
              }
            },
            
            // ===================================
            // STORE DATA (Nested for proper filtering)
            // ===================================
            stores: {
              type: "nested",
              properties: {
                storeId: { type: "keyword" },
                price: { type: "float" },
                listPrice: { type: "float" },
                inventoryQuantity: { type: "integer" },
                rating: { type: "float" },
                totalReviews: { type: "integer" },
                url: { type: "keyword", index: false },
                images: { type: "keyword", index: false }
              }
            },
            
            // ===================================
            // AGGREGATED FIELDS (for sorting/filtering)
            // ===================================
            minPrice: { type: "float" },
            maxPrice: { type: "float" },
            avgRating: { type: "float" },
            totalReviews: { type: "integer" },
            inStock: { type: "boolean" },
            storeCount: { type: "integer" },
            
            // ===================================
            // METADATA
            // ===================================
            lastUpdated: { type: "date" },
            createdAt: { type: "date" },
            
            // ===================================
            // SEARCH OPTIMIZATION
            // ===================================
            // Combined searchable text (name + brand + category)
            searchText: {
              type: "text",
              analyzer: "product_standard",
              fields: {
                autocomplete: {
                  type: "text",
                  analyzer: "autocomplete_analyzer",
                  search_analyzer: "autocomplete_search"
                }
              }
            },
            
            // Popularity score for ranking
            popularityScore: { type: "float" }
          }
        }
      }
    });

    console.log(`✅ Created index: ${PRODUCT_INDEX} with optimized search configuration`);
  } catch (error) {
    console.error("❌ Error creating index:", error.message);
    throw error;
  }
};

/**
 * Calculate popularity score for ranking
 * Higher reviews + higher rating = higher score
 */
const calculatePopularityScore = (totalReviews, avgRating) => {
  // Log scale for reviews to prevent huge review counts from dominating
  const reviewScore = Math.log10(Math.max(totalReviews, 1) + 1) * 10;
  const ratingScore = (avgRating || 0) * 5;
  return reviewScore + ratingScore;
};

/**
 * Build combined search text for better matching
 */
const buildSearchText = (product) => {
  const parts = [
    product.name || "",
    product.brand || "",
    product.category || "",
    product.modelNo || ""
  ].filter(Boolean);
  
  return parts.join(" ").trim();
};

/**
 * Index a single product to Elasticsearch
 */
export const indexProduct = async (productId) => {
  try {
    const product = await Product.findOne({ productId }).lean();
    if (!product) {
      console.warn(`Product ${productId} not found`);
      return;
    }

    const inventory = await Inventory.find({ productId }).lean();
    const images = await Image.find({ productId }).lean();

    // Build store data
    const stores = inventory.map((inv) => ({
      storeId: inv.storeId,
      price: inv.price || 0,
      listPrice: inv.listPrice || inv.price || 0,
      inventoryQuantity: inv.inventoryQuantity || 0,
      rating: inv.rating || 0,
      totalReviews: inv.totalReviews || 0,
      url: inv.url || "",
      images: images
        .filter((img) => img.productId === productId)
        .map((i) => i.url)
    }));

    // Calculate aggregated values
    const prices = stores.map((s) => s.price).filter((p) => p > 0);
    const ratings = stores.map((s) => s.rating).filter((r) => r > 0);
    const allReviews = stores.reduce((sum, s) => sum + (s.totalReviews || 0), 0);
    const avgRating = ratings.length 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;

    const doc = {
      productId: product.productId,
      name: product.name || "",
      modelNo: product.modelNo || "",
      brand: product.brand || "",
      category: product.category || "",
      stores,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgRating,
      totalReviews: allReviews,
      inStock: stores.some((s) => s.inventoryQuantity > 0),
      storeCount: stores.length,
      searchText: buildSearchText(product),
      popularityScore: calculatePopularityScore(allReviews, avgRating),
      lastUpdated: new Date(),
      createdAt: product.createdAt || new Date()
    };

    await esClient.index({
      index: PRODUCT_INDEX,
      id: productId,
      body: doc,
      refresh: true
    });

    console.log(`✅ Indexed product: ${productId}`);
  } catch (error) {
    console.error(`❌ Error indexing product ${productId}:`, error.message);
  }
};

/**
 * Bulk sync all products to Elasticsearch
 */
export const bulkSyncProducts = async (batchSize = 500) => {
  try {
    const totalProducts = await Product.countDocuments();
    console.log(`📦 Starting bulk sync of ${totalProducts} products...`);

    let syncedCount = 0;
    let skip = 0;

    while (skip < totalProducts) {
      const products = await Product.find().skip(skip).limit(batchSize).lean();
      const bulkOps = [];

      for (const product of products) {
        const inventory = await Inventory.find({
          productId: product.productId
        }).lean();
        const images = await Image.find({
          productId: product.productId
        }).lean();

        const stores = inventory.map((inv) => ({
          storeId: inv.storeId,
          price: inv.price || 0,
          listPrice: inv.listPrice || inv.price || 0,
          inventoryQuantity: inv.inventoryQuantity || 0,
          rating: inv.rating || 0,
          totalReviews: inv.totalReviews || 0,
          url: inv.url || "",
          images: images
            .filter((img) => img.productId === product.productId)
            .map((i) => i.url)
        }));

        const prices = stores.map((s) => s.price).filter((p) => p > 0);
        const ratings = stores.map((s) => s.rating).filter((r) => r > 0);
        const allReviews = stores.reduce((sum, s) => sum + (s.totalReviews || 0), 0);
        const avgRating = ratings.length
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;

        bulkOps.push(
          { index: { _index: PRODUCT_INDEX, _id: product.productId } },
          {
            productId: product.productId,
            name: product.name || "",
            modelNo: product.modelNo || "",
            brand: product.brand || "",
            category: product.category || "",
            stores,
            minPrice: prices.length ? Math.min(...prices) : 0,
            maxPrice: prices.length ? Math.max(...prices) : 0,
            avgRating,
            totalReviews: allReviews,
            inStock: stores.some((s) => s.inventoryQuantity > 0),
            storeCount: stores.length,
            searchText: buildSearchText(product),
            popularityScore: calculatePopularityScore(allReviews, avgRating),
            lastUpdated: new Date(),
            createdAt: product.createdAt || new Date()
          }
        );
      }

      if (bulkOps.length > 0) {
        const response = await esClient.bulk({ 
          body: bulkOps, 
          refresh: false 
        });
        
        if (response.errors) {
          const errorItems = response.items.filter(item => item.index?.error);
          console.error(`⚠️ Some items failed to index:`, errorItems.slice(0, 3));
        }
        
        syncedCount += products.length;
        console.log(`✅ Synced ${syncedCount}/${totalProducts} products`);
      }

      skip += batchSize;
    }

    // Final refresh
    await esClient.indices.refresh({ index: PRODUCT_INDEX });
    console.log("✅ Bulk sync completed successfully");
    
    return { synced: syncedCount, total: totalProducts };
  } catch (error) {
    console.error("❌ Error during bulk sync:", error.message);
    throw error;
  }
};

/**
 * Delete and recreate index
 */
export const recreateIndex = async () => {
  try {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
    
    if (exists) {
      console.log(`🗑️  Deleting existing index: ${PRODUCT_INDEX}`);
      await esClient.indices.delete({ index: PRODUCT_INDEX });
    }
    
    await createProductIndex();
    console.log("✅ Index recreated successfully");
  } catch (error) {
    console.error("❌ Error recreating index:", error.message);
    throw error;
  }
};

/**
 * Get index statistics
 */
export const getIndexStats = async () => {
  try {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
    
    if (!exists) {
      return {
        exists: false,
        totalDocuments: 0,
        indexSize: 0
      };
    }
    
    const stats = await esClient.indices.stats({ index: PRODUCT_INDEX });
    const count = await esClient.count({ index: PRODUCT_INDEX });
    
    return {
      exists: true,
      totalDocuments: count.count,
      indexSize: stats.indices[PRODUCT_INDEX]?.total?.store?.size_in_bytes || 0,
      searchCount: stats.indices[PRODUCT_INDEX]?.total?.search?.query_total || 0
    };
  } catch (error) {
    console.error("❌ Error getting index stats:", error.message);
    throw error;
  }
};

/**
 * Check if index exists
 */
export const indexExists = async () => {
  try {
    return await esClient.indices.exists({ index: PRODUCT_INDEX });
  } catch (error) {
    console.error("❌ Error checking index:", error.message);
    return false;
  }
};

export default {
  PRODUCT_INDEX,
  createProductIndex,
  indexProduct,
  bulkSyncProducts,
  recreateIndex,
  getIndexStats,
  indexExists
};
