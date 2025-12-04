import esClient from "../config/elasticsearch.js";
import { Product, Inventory, Image } from "../models/Product.js";

export const PRODUCT_INDEX = "products";

// Create index with Amazon/Flipkart-like search optimization
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
          // Optimized index settings
          max_result_window: 10000, // Support deep pagination
          analysis: {
            // ===================================
            // ANALYZERS
            // ===================================
            analyzer: {
              // Standard analyzer for exact matching
              standard_analyzer: {
                type: "standard",
                stopwords: "_none_" // Don't remove common words like "the", "and"
              },
              
              // Product name analyzer - handles multiple matching strategies
              product_name_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding", // Remove accents
                  "product_synonym_filter", // Handle synonyms
                  "word_delimiter_filter", // Split "PowerDrill" into "Power" "Drill"
                  "unique"
                ],
              },
              
              // Edge n-gram analyzer for autocomplete and prefix matching
              edge_ngram_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "edge_ngram_filter"
                ],
              },
              
              // N-gram analyzer for partial word matching
              ngram_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "ngram_filter"
                ],
              },
              
              // Search analyzer (no n-grams for search queries)
              product_search_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: [
                  "lowercase",
                  "asciifolding",
                  "product_synonym_filter",
                  "word_delimiter_filter"
                ],
              },
              
              // Brand/Category analyzer
              keyword_lowercase_analyzer: {
                type: "custom",
                tokenizer: "keyword",
                filter: ["lowercase", "asciifolding"]
              },
              
              // Path hierarchy analyzer for categories
              path_analyzer: {
                type: "custom",
                tokenizer: "path_hierarchy_tokenizer"
              },
            },
            
            // ===================================
            // TOKENIZERS
            // ===================================
            tokenizer: {
              path_hierarchy_tokenizer: {
                type: "path_hierarchy",
                delimiter: "/"
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
            },
            
            // ===================================
            // FILTERS
            // ===================================
            filter: {
              // Edge n-gram for autocomplete (starts from beginning)
              edge_ngram_filter: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 15,
                preserve_original: true
              },
              
              // N-gram for partial matching (any position)
              ngram_filter: {
                type: "ngram",
                min_gram: 3,
                max_gram: 4,
                preserve_original: false
              },
              
              // Word delimiter for splitting compound words
              word_delimiter_filter: {
                type: "word_delimiter",
                preserve_original: true,
                split_on_numerics: false,
                split_on_case_change: true,
                stem_english_possessive: true
              },
              
              // Synonym filter for common product terms
              product_synonym_filter: {
                type: "synonym",
                synonyms: [
                  // Power tools synonyms
                  "drill, drilling machine, power drill",
                  "saw, cutting tool",
                  "hammer drill, impact drill, rotary hammer",
                  "sander, polisher, grinder",
                  "screwdriver, driver",
                  
                  // Hand tools synonyms
                  "wrench, spanner",
                  "pliers, gripper",
                  "hammer, mallet",
                  
                  // Common abbreviations
                  "hp, horsepower",
                  "rpm, revolutions per minute",
                  "volt, v",
                  "amp, ampere, a",
                  
                  // Material synonyms
                  "stainless steel, ss, inox",
                  "aluminum, aluminium",
                  
                  // Add more based on your product catalog
                ]
              }
            },
          },
        },
        
        // ===================================
        // MAPPINGS
        // ===================================
        mappings: {
          properties: {
            productId: { 
              type: "keyword" 
            },

            // ===================================
            // PRODUCT NAME - Most important field
            // ===================================
            name: {
              type: "text",
              analyzer: "product_name_analyzer",
              search_analyzer: "product_search_analyzer",
              fields: {
                // Exact keyword match (for exact product names)
                keyword: { 
                  type: "keyword",
                  ignore_above: 256,
                  normalizer: "lowercase_normalizer"
                },
                
                // Standard text matching
                standard: { 
                  type: "text",
                  analyzer: "standard_analyzer"
                },
                
                // Edge n-gram for prefix/autocomplete
                edge_ngram: {
                  type: "text",
                  analyzer: "edge_ngram_analyzer",
                  search_analyzer: "product_search_analyzer"
                },
                
                // N-gram for partial word matching
                ngram: {
                  type: "text",
                  analyzer: "ngram_analyzer",
                  search_analyzer: "standard_analyzer"
                },
                
                // Raw field for phrase matching
                raw: { 
                  type: "text",
                  analyzer: "standard_analyzer"
                }
              },
            },

            // ===================================
            // MODEL NUMBER
            // ===================================
            modelNo: {
              type: "text",
              analyzer: "standard",
              fields: { 
                keyword: { 
                  type: "keyword",
                  ignore_above: 128,
                  normalizer: "lowercase_normalizer"
                },
                // For partial model number matching
                wildcard: {
                  type: "wildcard"
                }
              },
            },

            // ===================================
            // BRAND
            // ===================================
            brand: {
              type: "text",
              analyzer: "standard_analyzer",
              fields: { 
                keyword: { 
                  type: "keyword",
                  ignore_above: 128
                },
                lowercase: {
                  type: "keyword",
                  normalizer: "lowercase_normalizer"
                },
                // For fuzzy brand matching
                suggest: {
                  type: "text",
                  analyzer: "edge_ngram_analyzer",
                  search_analyzer: "standard_analyzer"
                }
              },
            },

            // ===================================
            // CATEGORY
            // ===================================
            category: {
              type: "text",
              analyzer: "standard_analyzer",
              fields: { 
                keyword: { 
                  type: "keyword",
                  ignore_above: 256
                },
                lowercase: {
                  type: "keyword",
                  normalizer: "lowercase_normalizer"
                },
                // Hierarchical categories support
                path: {
                  type: "text",
                  analyzer: "path_analyzer"
                }
              },
            },

            // ===================================
            // STORE DATA (Nested)
            // ===================================
            stores: {
              type: "nested",
              properties: {
                storeId: { type: "keyword" },
                price: { type: "float" },
                inventoryQuantity: { type: "integer" },
                rating: { type: "float" },
                totalReviews: { type: "integer" },
                images: { type: "keyword" },
              },
            },

            // ===================================
            // AGGREGATED FIELDS
            // ===================================
            minPrice: { 
              type: "float",
              index: true // Enable for sorting and filtering
            },
            maxPrice: { 
              type: "float",
              index: true
            },
            avgRating: { 
              type: "float",
              index: true
            },
            totalReviews: { 
              type: "integer",
              index: true
            },
            inStock: { 
              type: "boolean",
              index: true
            },
            
            // ===================================
            // METADATA
            // ===================================
            lastUpdated: { 
              type: "date" 
            },
            createdAt: { 
              type: "date" 
            },
            
            // ===================================
            // SEARCH OPTIMIZATION FIELDS
            // ===================================
            // Popularity score (for ranking)
            popularityScore: {
              type: "rank_feature"
            },
            
            // All searchable text combined (for fallback search)
            allText: {
              type: "text",
              analyzer: "product_name_analyzer",
              search_analyzer: "product_search_analyzer"
            }
          },
        },
      },
    });

    console.log(`✅ Created index: ${PRODUCT_INDEX} with advanced search configuration`);
  } catch (error) {
    console.error("❌ Error creating index:", error.message);
    throw error;
  }
};

// Sync single product to Elasticsearch
export const indexProduct = async (productId) => {
  try {
    const product = await Product.findOne({ productId }).lean();
    if (!product) return;

    const inventory = await Inventory.find({ productId }).lean();
    const images = await Image.find({ productId }).lean();

    const stores = inventory.map((inv) => ({
      storeId: inv.storeId,
      price: inv.price || 0,
      inventoryQuantity: inv.inventoryQuantity || 0,
      rating: inv.rating || 0,
      totalReviews: inv.totalReviews || 0,
      images: images
        .filter((img) => img.productId === productId)
        .map((i) => i.url),
    }));

    const prices = stores.map((s) => s.price).filter((p) => p > 0);
    const ratings = stores.map((s) => s.rating).filter((r) => r > 0);
    const totalReviews = stores.reduce((sum, s) => sum + (s.totalReviews || 0), 0);

    // Calculate popularity score for ranking
    const popularityScore = calculatePopularityScore(totalReviews, ratings);

    // Combine all searchable text for fallback
    const allText = [
      product.name || "",
      product.brand || "",
      product.category || "",
      product.modelNo || ""
    ].filter(Boolean).join(" ");

    const doc = {
      productId: product.productId,
      name: product.name || "",
      modelNo: product.modelNo || "",
      brand: product.brand || "",
      category: product.category || "",
      stores,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      avgRating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
      totalReviews,
      inStock: stores.some((s) => s.inventoryQuantity > 0),
      popularityScore,
      allText,
      lastUpdated: new Date(),
      createdAt: product.createdAt || new Date(),
    };

    await esClient.index({
      index: PRODUCT_INDEX,
      id: productId,
      body: doc,
      refresh: true,
    });

    console.log(`✅ Indexed product: ${productId}`);
  } catch (error) {
    console.error(`❌ Error indexing product ${productId}:`, error.message);
  }
};

// Calculate popularity score for ranking
const calculatePopularityScore = (totalReviews, ratings) => {
  // Simple popularity formula: combine review count and average rating
  const avgRating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;
  
  // Weight reviews more heavily, but cap the effect
  const reviewScore = Math.log10(totalReviews + 1) * 2;
  const ratingScore = avgRating;
  
  return reviewScore + ratingScore;
};

// Bulk sync all products
export const bulkSyncProducts = async () => {
  try {
    const products = await Product.find().lean();
    console.log(`📦 Starting bulk sync of ${products.length} products...`);

    const bulkOps = [];
    let syncedCount = 0;

    for (const product of products) {
      const inventory = await Inventory.find({
        productId: product.productId,
      }).lean();
      const images = await Image.find({
        productId: product.productId,
      }).lean();

      const stores = inventory.map((inv) => ({
        storeId: inv.storeId,
        price: inv.price || 0,
        inventoryQuantity: inv.inventoryQuantity || 0,
        rating: inv.rating || 0,
        totalReviews: inv.totalReviews || 0,
        images: images
          .filter((img) => img.productId === product.productId)
          .map((i) => i.url),
      }));

      const prices = stores.map((s) => s.price).filter((p) => p > 0);
      const ratings = stores.map((s) => s.rating).filter((r) => r > 0);
      const totalReviews = stores.reduce((sum, s) => sum + (s.totalReviews || 0), 0);

      const popularityScore = calculatePopularityScore(totalReviews, ratings);

      const allText = [
        product.name || "",
        product.brand || "",
        product.category || "",
        product.modelNo || ""
      ].filter(Boolean).join(" ");

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
          avgRating: ratings.length
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0,
          totalReviews,
          inStock: stores.some((s) => s.inventoryQuantity > 0),
          popularityScore,
          allText,
          lastUpdated: new Date(),
          createdAt: product.createdAt || new Date(),
        }
      );

      // Batch bulk operations
      if (bulkOps.length >= 1000) {
        await esClient.bulk({ body: bulkOps, refresh: false });
        syncedCount += bulkOps.length / 2;
        console.log(`✅ Synced ${syncedCount}/${products.length} products`);
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await esClient.bulk({ body: bulkOps, refresh: true });
      syncedCount += bulkOps.length / 2;
      console.log(`✅ Synced ${syncedCount}/${products.length} products`);
    }

    console.log("✅ Bulk sync completed successfully");
  } catch (error) {
    console.error("❌ Error during bulk sync:", error.message);
    throw error;
  }
};

// Delete and recreate index (useful for testing)
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

// Get index stats
export const getIndexStats = async () => {
  try {
    const stats = await esClient.indices.stats({ index: PRODUCT_INDEX });
    const count = await esClient.count({ index: PRODUCT_INDEX });
    
    return {
      totalDocuments: count.count,
      indexSize: stats.indices[PRODUCT_INDEX].total.store.size_in_bytes,
      searchCount: stats.indices[PRODUCT_INDEX].total.search.query_total,
    };
  } catch (error) {
    console.error("❌ Error getting index stats:", error.message);
    throw error;
  }
};

export default {
  PRODUCT_INDEX,
  createProductIndex,
  indexProduct,
  bulkSyncProducts,
  recreateIndex,
  getIndexStats,
};