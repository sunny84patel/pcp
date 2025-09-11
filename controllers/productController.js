// controllers/productController.js
import axios from "axios";
import { Product, Inventory, Image } from "../models/Product.js";
import dotenv from "dotenv";
dotenv.config();
const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;
console.log("🔑 Using API Key:", API_KEY );
export const searchProducts = async (req, res) => {
  try {
    const {
      query,
      stores,
      page = 1,
      limit = 20,
      inStockOnly = false,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // --- STEP 0: Map UI stores to internal IDs and API platform names ---
    const storeMap = {
      lowes: "lowe's",
      "lowe's": "lowe's",
      homedepot: "homedepot",
      "home depot": "homedepot",
    };

    const storeIds = stores
      ? stores
          .split(",")
          .map((s) => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase())
      : null;

    // ✅ Third-party API platform mapping
    const platformMap = {
      homedepot: "homedepot_search",
      "lowe's": "lowes_search",
    };
    const platform =
      storeIds?.length > 0
        ? storeIds.map((s) => platformMap[s] || s).join(",")
        : "homedepot_search"; // default to Home Depot search

    const isNumericQuery = /^\d+$/.test(query.trim());

    // --- STEP 1: Search Products from DB ---
    const productFilter = {
      $or: [
        { $text: { $search: query } },
        { modelNo: { $regex: query, $options: "i" } },
        ...(isNumericQuery ? [{ productId: query.trim() }] : []),
      ],
    };

    const matchedProducts = await Product.find(productFilter)
      .lean()
      .select("productId name modelNo brand category");

    const productIds = matchedProducts.map((p) => p.productId);

    // --- STEP 2: Query Inventory if we have products ---
    let results = [];
    if (productIds.length) {
      const inventoryFilter = {
        productId: { $in: productIds },
        ...(storeIds ? { storeId: { $in: storeIds } } : {}),
        ...(inStockOnly === "true" || inStockOnly === true
          ? { inventoryQuantity: { $gt: 0 } }
          : {}),
      };

      const totalInventoryCount = await Inventory.countDocuments(inventoryFilter);

      const skip = (Number(page) - 1) * Number(limit);
      const inventoryDocs = await Inventory.find(inventoryFilter)
        .skip(skip)
        .limit(Number(limit) + 1)
        .lean();

      const hasNextPage = inventoryDocs.length > limit;
      const limitedInventory = hasNextPage
        ? inventoryDocs.slice(0, limit)
        : inventoryDocs;

      // Fetch images
      const images = await Image.find({ productId: { $in: productIds } }).lean();
      const productMap = Object.fromEntries(
        matchedProducts.map((p) => [p.productId, p])
      );

      const resultMap = {};
      limitedInventory.forEach((inv) => {
        const prod = productMap[inv.productId] || {};
        const imgUrls = images
          .filter((img) => img.productId === inv.productId)
          .map((i) => i.url);

        if (!resultMap[inv.productId]) {
          resultMap[inv.productId] = {
            productId: inv.productId,
            name: prod.name || "Unknown Product",
            modelNo: prod.modelNo || "",
            brand: prod.brand || "",
            category: prod.category || "",
            minPrice: inv.price || 0,
            rating: inv.rating || 0,
            totalReviews: inv.totalReviews || 0,
            stores: [],
          };
        }

        resultMap[inv.productId].stores.push({
          storeId: inv.storeId,
          price: inv.price,
          inventoryQuantity: inv.inventoryQuantity,
          images: imgUrls,
        });
      });

      results = Object.values(resultMap);

      // Sorting
      if (sortBy === "price") {
        results.sort((a, b) =>
          sortOrder === "asc" ? a.minPrice - b.minPrice : b.minPrice - a.minPrice
        );
      } else if (sortBy === "reviews") {
        results.sort((a, b) =>
          sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating
        );
      } else if (sortBy === "popularity") {
        results.sort((a, b) =>
          sortOrder === "asc"
            ? a.totalReviews - b.totalReviews
            : b.totalReviews - a.totalReviews
        );
      } else if (sortBy === "name") {
        results.sort((a, b) =>
          sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        );
      }

      // If results exist, return them
      if (results.length) {
        return res.status(200).json({
          results,
          totalResults: totalInventoryCount,
          totalProducts: results.length,
          pagination: {
            currentPage: Number(page),
            hasNextPage,
            totalResults: totalInventoryCount,
            totalPages: Math.ceil(totalInventoryCount / Number(limit)),
            limit: Number(limit),
          },
          searchMethod: "text-index",
          searchedStores: storeIds || ["all stores"],
        });
      }
    }

    // --- STEP 3: Fallback to Third-Party API ---
    try {
      const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
        query
      )}&page=${page}&api_key=${API_KEY}`;

      console.log("🌐 Fallback: Fetching from third-party API:", url);
      const { data } = await axios.get(url);
      console.log("✅ API response received",data);
      const apiResults = data?.results || [];
      console.log("🔍 API returned results",apiResults);

      // Normalize to same structure
      const normalizedResults = apiResults.map((item, index) => ({
        productId: item.id || `api-${page}-${index}`,
        name: item.name || item.title || "Unknown Product",
        modelNo: item.modelNo || "",
        brand: item.brand || "",
        category: item.category || "",
        minPrice: Number(item.price) || 0,
        rating: item.rating || 0,
        totalReviews: item.totalReviews || 0,
        stores: [
          {
            storeId: item.store || platform,
            price: Number(item.price) || 0,
            inventoryQuantity: item.inStock ? 1 : 0,
            images: item.thumbnails || [],
          },
        ],
      }));

      return res.status(200).json({
        results: normalizedResults,
        totalResults: data.totalResults || normalizedResults.length,
        totalProducts: normalizedResults.length,
        pagination: {
          currentPage: Number(page),
          hasNextPage:
            data.hasNextPage ?? normalizedResults.length === Number(limit),
          totalResults: data.totalResults || normalizedResults.length,
          totalPages:
            data.totalPages ||
            Math.ceil(
              (data.totalResults || normalizedResults.length) / Number(limit)
            ),
          limit: Number(limit),
        },
        searchMethod: "third-party-api",
        searchedStores: storeIds || ["all stores"],
      });
    } catch (apiError) {
      console.error("❌ Error fetching from third-party API:", apiError.message);
      return res.status(200).json({
        results: [],
        totalResults: 0,
        pagination: {
          currentPage: Number(page),
          hasNextPage: false,
          totalResults: 0,
          totalPages: 0,
          limit: Number(limit),
        },
        searchMethod: "third-party-api-fallback-error",
        searchedStores: storeIds || ["all stores"],
      });
    }
  } catch (error) {
    console.error("❌ Error in search API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
