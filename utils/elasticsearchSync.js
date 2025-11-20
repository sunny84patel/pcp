
import esClient from "../config/elasticsearch.js";
import { Product, Inventory, Image } from "../models/Product.js";

export const PRODUCT_INDEX = "products";

// Create index with optimized mappings (no completion suggester)
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
          analysis: {
            analyzer: {
              product_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding", "edge_ngram_filter"],
              },
              search_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"],
              },
            },
            filter: {
              edge_ngram_filter: {
                type: "edge_ngram",
                min_gram: 2,
                max_gram: 20,
              },
            },
          },
        },
        mappings: {
          properties: {
            productId: { type: "keyword" },

            name: {
              type: "text",
              analyzer: "product_analyzer",
              search_analyzer: "search_analyzer",
              fields: {
                keyword: { type: "keyword" },
                raw: { type: "text", analyzer: "standard" },
              },
            },

            modelNo: {
              type: "text",
              analyzer: "keyword",
              fields: { keyword: { type: "keyword" } },
            },

            brand: {
              type: "text",
              fields: { keyword: { type: "keyword" } },
            },

            category: {
              type: "text",
              fields: { keyword: { type: "keyword" } },
            },

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

            minPrice: { type: "float" },
            maxPrice: { type: "float" },
            avgRating: { type: "float" },
            totalReviews: { type: "integer" },
            inStock: { type: "boolean" },
            lastUpdated: { type: "date" },
          },
        },
      },
    });

    console.log(`✅ Created index: ${PRODUCT_INDEX}`);
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
      totalReviews: stores.reduce(
        (sum, s) => sum + (s.totalReviews || 0),
        0
      ),
      inStock: stores.some((s) => s.inventoryQuantity > 0),
      lastUpdated: new Date(),
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

// Bulk sync all products
export const bulkSyncProducts = async () => {
  try {
    const products = await Product.find().lean();
    console.log(`📦 Starting bulk sync of ${products.length} products...`);

    const bulkOps = [];

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
          totalReviews: stores.reduce(
            (sum, s) => sum + (s.totalReviews || 0),
            0
          ),
          inStock: stores.some((s) => s.inventoryQuantity > 0),
          lastUpdated: new Date(),
        }
      );

      if (bulkOps.length >= 1000) {
        await esClient.bulk({ body: bulkOps, refresh: false });
        console.log(`✅ Synced ${bulkOps.length / 2} products`);
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await esClient.bulk({ body: bulkOps, refresh: true });
      console.log(`✅ Synced remaining ${bulkOps.length / 2} products`);
    }

    console.log("✅ Bulk sync completed");
  } catch (error) {
    console.error("❌ Error during bulk sync:", error.message);
    throw error;
  }
};

export default {
  PRODUCT_INDEX,
  createProductIndex,
  indexProduct,
  bulkSyncProducts,
};
