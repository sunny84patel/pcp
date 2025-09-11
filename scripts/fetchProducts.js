import dotenv from "dotenv";
dotenv.config();

import { Product, Inventory, Image } from "../models/Product.js";
import fetch from "node-fetch";

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

console.log("🔑 Using API Key (productController):", API_KEY || "❌ MISSING!");

// --- Normalizers ---
const normalizeHomeDepot = (item) => {
  const productId = item.id;
  return {
    product: {
      productId,
      name: item.name,
      modelNo: item.model_no,
      brand: item.brand || null,
      category: item.category || null,
    },
    inventory: {
      productId,
      storeId: "homedepot",
      price: item.price,
      listPrice: item.price,
      priceReduced: item.price_reduced,
      currency: item.currency,
      inventoryQuantity: item.inventory_quantity,
      rating: item.rating,
      totalReviews: item.total_reviews,
      url: item.url,
      itemNumber: null,
      vendorNumber: null,
      upc: null,
      saleEndDate: null,
    },
    images: (item.thumbnails || []).map((url) => ({ url, productId })),
  };
};

const normalizeLowes = (item) => {
  const productId = item.id;
  return {
    product: {
      productId,
      name: item.name,
      modelNo: item.model_no,
      brand: item.brand || null,
      category: item.category || null,
    },
    inventory: {
      productId,
      storeId: "lowes",
      price: item.price,
      listPrice: item.list_price,
      priceReduced: item.price_reduced,
      currency: item.currency,
      inventoryQuantity: item.inventory?.total_quantity || null,
      rating: item.rating,
      totalReviews: item.total_ratings,
      url: item.url,
      itemNumber: item.item_number || null,
      vendorNumber: item.vendor_number || null,
      upc: item.upc || null,
      saleEndDate: item.sale_end_date || null,
    },
    images: (item.images || []).map((url) => ({ url, productId })),
  };
};

// ---------------------
// Search Products Controller
// ---------------------
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

    const storeMap = {
      lowes: "lowe's",
      "lowe's": "lowe's",
      homedepot: "homedepot",
      "home depot": "homedepot",
    };

    const storeIds = stores
      ? stores
          .split(",")
          .map(
            (s) => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase()
          )
      : null;

    const isNumericQuery = /^\d+$/.test(query.trim());

    // Step 1: Search products in local DB
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

    if (productIds.length > 0) {
      // ✅ Found products in DB → continue with existing logic
      const inventoryFilter = {
        productId: { $in: productIds },
        ...(storeIds ? { storeId: { $in: storeIds } } : {}),
        ...(inStockOnly === "true" || inStockOnly === true
          ? { inventoryQuantity: { $gt: 0 } }
          : {}),
      };

      const totalInventoryCount = await Inventory.countDocuments(
        inventoryFilter
      );

      const skip = (Number(page) - 1) * Number(limit);
      const inventoryDocs = await Inventory.find(inventoryFilter)
        .skip(skip)
        .limit(Number(limit) + 1)
        .lean();

      const hasNextPage = inventoryDocs.length > limit;
      const limitedInventory = hasNextPage
        ? inventoryDocs.slice(0, limit)
        : inventoryDocs;

      const images = await Image.find({
        productId: { $in: productIds },
      }).lean();

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
          ...inv,
          images: imgUrls,
        });
      });

      let results = Object.values(resultMap);

      // Sorting logic
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

    // ---------------------
    // No DB results → Fallback to Unwrangle API
    // ---------------------
    if (!API_KEY) {
      console.error("❌ Missing API key. Cannot fetch from Unwrangle.");
      return res.status(500).json({ error: "Server misconfiguration: Missing API key" });
    }

    const platform = storeIds?.includes("lowe's")
      ? "lowes_search"
      : "homedepot_search";

    const apiUrl = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
      query
    )}&page=${page}&api_key=${API_KEY}`;

    console.log("🌐 Fallback: Fetching from third-party API:", apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(
        `❌ Error fetching from third-party API: ${response.status} ${response.statusText}`
      );
      return res.status(502).json({ error: "Failed to fetch external data" });
    }

    const apiData = await response.json();
    const normalizer = platform === "lowes_search" ? normalizeLowes : normalizeHomeDepot;

    const normalizedResults = (apiData.data || []).map(normalizer);

    // Merge normalized results to match local DB structure
    const resultMap = {};
    normalizedResults.forEach(({ product, inventory, images }) => {
      if (!resultMap[product.productId]) {
        resultMap[product.productId] = {
          productId: product.productId,
          name: product.name,
          modelNo: product.modelNo,
          brand: product.brand,
          category: product.category,
          minPrice: inventory.price || 0,
          rating: inventory.rating || 0,
          totalReviews: inventory.totalReviews || 0,
          stores: [],
        };
      }
      resultMap[product.productId].stores.push({
        ...inventory,
        images: images.map((img) => img.url),
      });
    });

    const results = Object.values(resultMap);

    return res.status(200).json({
      results,
      totalResults: results.length,
      totalProducts: results.length,
      pagination: {
        currentPage: Number(page),
        hasNextPage: false, // external API may not provide total count
        totalResults: results.length,
        totalPages: 1,
        limit: Number(limit),
      },
      searchMethod: "external-api",
      searchedStores: [platform],
    });
  } catch (error) {
    console.error("❌ Error in search API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
