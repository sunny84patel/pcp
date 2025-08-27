
import { Product, Inventory, Image } from "../models/Product.js";
import fetch from "node-fetch";

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

// ========================
// HELPER: Normalize Title
// ========================
const normalizeProductTitle = (title = "") => {
  return title
    .toLowerCase()
    .trim()
    // remove fractions/dimensions like "1-1/2-in" or "3/4-in"
    .replace(/\b\d+([-/]\d+)?\s?-?\s?(in|ft|mm|cm|inch|in\.|ft\.)\b/g, "")
    // remove numbers followed by units e.g. "10 in.", "20 ft"
    .replace(/\b\d+(\.\d+)?\s?(in|ft|mm|cm|inch|in\.|ft\.)\b/g, "")
    // clean non-alphanumeric (but keep spaces)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ========================
// HELPER: Call Store API with retry logic
// ========================
const searchStoreApi = async (platform, searchTerm, page = 1, maxRetries = 2) => {
  const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
    searchTerm
  )}&page=${page}&api_key=${API_KEY}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const data = await response.json();
      clearTimeout(timeout);

      if (data.success && data.results?.length) {
        return data.results;
      }
    } catch (err) {
      clearTimeout(timeout);

      const retryable = err.name === "AbortError" || err.message.includes("Server error 5");
      if (attempt === maxRetries || !retryable) return [];
      await new Promise((res) => setTimeout(res, attempt * 2000)); // 2s, 4s
    }
  }

  return [];
};


// ========================
// HELPER: Create Search Variations
// ========================
const createSearchVariations = (title) => {
  const normalized = normalizeProductTitle(title);
  const words = normalized.split(" ").filter(Boolean);

  const variations = [];
  variations.push(normalized); // full first

  // successively shorten title
  for (let i = words.length - 1; i >= 2; i--) {
    variations.push(words.slice(0, i).join(" "));
  }

  return [...new Set(variations)];
};

// ========================
// HELPER: API with fast fail for user experience
// ========================
const searchStoreApiWithFastFail = async (platform, searchTerm, page = 1) => {
  const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
    searchTerm
  )}&page=${page}&api_key=${API_KEY}`;

  // First attempt
  const controller1 = new AbortController();
  const timeout1 = setTimeout(() => controller1.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller1.signal });

    if (!response.ok) {
      throw new Error(`Server error ${response.status}`);
    }

    const data = await response.json();
    clearTimeout(timeout1);
    return { success: true, data: data.success && data.results ? data.results : [] };
  } catch (err) {
    clearTimeout(timeout1);
    const isRetryableError = err.name === 'AbortError' ||
      err.message.includes('Server error 5') ||
      err.message.includes('timeout');

    if (!isRetryableError) {
      return { success: false, data: [] };
    }

    // Second attempt with 2s wait
    await new Promise(resolve => setTimeout(resolve, 2000));

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller2.signal });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const data = await response.json();
      clearTimeout(timeout2);
      return { success: true, data: data.success && data.results ? data.results : [] };
    } catch (err2) {
      clearTimeout(timeout2);

      // Start background retries (don't await)
      backgroundRetryApi(platform, searchTerm, page).catch(() => {});

      return { success: false, data: [] };
    }
  }
};

// ========================
// HELPER: Try variations sequentially
// ========================
const searchWithVariations = async (platform, title) => {
  const variations = createSearchVariations(title).filter(term => term && term.length >= 3);

  if (!variations.length) return [];

  // Fire all searches in parallel
  const searchPromises = variations.map(term =>
    searchStoreApi(platform, term).then(results => ({ term, results }))
  );

  // Resolve as soon as one variation gets results
  for await (const { results } of searchPromises) {
    if (results?.length) {
      return results;
    }
  }

  return [];
};
// ========================
// HELPER: Background retry for remaining attempts
// ========================
const backgroundRetryApi = async (platform, searchTerm, page = 1) => {
  const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
    searchTerm
  )}&page=${page}&api_key=${API_KEY}`;

  // Retry 2 (4s wait)
  await new Promise(resolve => setTimeout(resolve, 4000));

  const controller3 = new AbortController();
  const timeout3 = setTimeout(() => controller3.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller3.signal });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results?.length) {
        // Could save to cache/DB here if needed
        return;
      }
    }
    throw new Error(`Server error ${response.status}`);
  } catch (err) {
    // Error handled silently
  } finally {
    clearTimeout(timeout3);
  }

  // Retry 3 (8s wait) - final attempt
  await new Promise(resolve => setTimeout(resolve, 8000));

  const controller4 = new AbortController();
  const timeout4 = setTimeout(() => controller4.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller4.signal });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.results?.length) {
        // Could save to cache/DB here if needed
        return;
      }
    }
    throw new Error(`Server error ${response.status}`);
  } catch (err) {
    // Final error handled silently
  } finally {
    clearTimeout(timeout4);
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
      modelNo: item.model_no,
      brand: item.brand || null,
      category: item.category || null
    },
    inventory: {
      productId,
      storeId: 'homedepot',
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
      saleEndDate: null
    },
    images: (item.thumbnails || []).map((url) => ({
      url: url.trim(),
      productId
    }))
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
      modelNo: item.model_no,
      brand: item.brand || null,
      category: item.category || null
    },
    inventory: {
      productId,
      storeId: "lowe's",
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
      saleEndDate: item.sale_end_date || null
    },
    images: (item.images || []).map((url) => ({
      url: url.trim(),
      productId
    }))
  };
};

// ========================
// HELPER: Save API Products to DB (background)
// ========================
const saveApiProductsToDb = async (apiResults, storeId, category) => {
  try {
    for (const item of apiResults) {
      const productId = item.id || item.product_id;
      if (!productId) continue;

      // Normalize based on store
      let normalizedData;
      if (storeId === 'homedepot') {
        normalizedData = normalizeHomeDepot(item);
      } else if (storeId === "lowe's" || storeId === "lowes") {
        normalizedData = normalizeLowes(item);
      } else {
        // Fallback to old structure
        normalizedData = {
          product: {
            productId,
            name: item.name || item.title || "Unknown Product",
            modelNo: item.model_no || item.model || "",
            brand: item.brand || "",
            category: category || "General"
          },
          inventory: {
            productId,
            storeId,
            price: item.price || item.current_price || 0,
            currency: "USD",
            inventoryQuantity: item.inventory_quantity || (item.in_stock ? 1 : 0),
            rating: item.rating || 0,
            totalReviews: item.total_reviews || item.review_count || 0,
            url: item.url || item.product_url || ""
          },
          images: (item.images || []).map((url) => ({ productId, url }))
        };
      }

      // 1. Upsert Product
      await Product.updateOne(
        { productId: normalizedData.product.productId },
        {
          $setOnInsert: {
            ...normalizedData.product,
            category: normalizedData.product.category || category || "General"
          },
        },
        { upsert: true }
      );

      // 2. Upsert Inventory
      await Inventory.updateOne(
        { productId: normalizedData.inventory.productId, storeId: normalizedData.inventory.storeId },
        { $set: normalizedData.inventory },
        { upsert: true }
      );

      // 3. Upsert Images
      if (normalizedData.images?.length) {
        await Image.insertMany(normalizedData.images, { ordered: false }).catch(() => { });
      }
    }
  } catch (err) {
    // Error handled silently
  }
};

// ========================
// MAIN CONTROLLER
// ========================
export const getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find current product
    const currentProduct = await Product.findOne({ productId: id }).lean();
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2. Get base store from current product's inventory
    const baseInventory = await Inventory.findOne({ productId: id }).lean();
    const baseStoreId = baseInventory?.storeId?.toLowerCase() || "lowe's";

    // 3. PRIMARY: API search for more accurate results (with fast fail)
    let apiResults = [];
    let apiPlatform = "";

    if (baseStoreId === "lowe's" || baseStoreId === "lowes") {
      apiPlatform = "lowes_search";
      apiResults = await searchWithVariations("lowes_search", currentProduct.name);
    } else if (baseStoreId === "homedepot" || baseStoreId === "home depot") {
      apiPlatform = "homedepot_search";
      apiResults = await searchWithVariations("homedepot_search", currentProduct.name);
    }

    // 4. If API has results → return them
    if (apiResults.length) {
      // Transform API results to DB-like format using proper normalization
      const mappedResults = apiResults.slice(0, 10).map((item) => {
        let normalizedData;
        if (baseStoreId === 'homedepot') {
          normalizedData = normalizeHomeDepot(item);
        } else if (baseStoreId === "lowe's" || baseStoreId === "lowes") {
          normalizedData = normalizeLowes(item);
        } else {
          // Fallback normalization
          normalizedData = {
            product: {
              productId: item.id || item.product_id,
              name: item.name || item.title || "Unknown Product",
              modelNo: item.model_no || item.model || "",
              brand: item.brand || "",
              category: currentProduct.category || "General"
            },
            inventory: {
              productId: item.id || item.product_id,
              storeId: baseStoreId,
              price: item.price || item.current_price || 0,
              currency: "USD",
              inventoryQuantity: item.inventory_quantity || (item.in_stock ? 1 : 0),
              rating: item.rating || 0,
              totalReviews: item.total_reviews || item.review_count || 0,
              url: item.url || item.product_url || ""
            },
            images: (item.images || []).map((url) => ({ url, productId: item.id || item.product_id }))
          };
        }

        return {
          productId: normalizedData.product.productId,
          name: normalizedData.product.name || "Unknown Product",
          modelNo: normalizedData.product.modelNo || "",
          brand: normalizedData.product.brand || "",
          category: normalizedData.product.category || currentProduct.category || "General",
          minPrice: normalizedData.inventory.price || 0,
          rating: normalizedData.inventory.rating || 0,
          totalReviews: normalizedData.inventory.totalReviews || 0,
          stores: [
            {
              storeId: normalizedData.inventory.storeId,
              price: normalizedData.inventory.price,
              listPrice: normalizedData.inventory.listPrice,
              priceReduced: normalizedData.inventory.priceReduced,
              currency: normalizedData.inventory.currency || "USD",
              inventoryQuantity: normalizedData.inventory.inventoryQuantity,
              rating: normalizedData.inventory.rating,
              totalReviews: normalizedData.inventory.totalReviews,
              url: normalizedData.inventory.url,
              itemNumber: normalizedData.inventory.itemNumber,
              vendorNumber: normalizedData.inventory.vendorNumber,
              upc: normalizedData.inventory.upc,
              saleEndDate: normalizedData.inventory.saleEndDate,
              images: normalizedData.images.map(img => img.url),
            },
          ],
        };
      });

      // Save API results in background for the SAME store
      saveApiProductsToDb(
        apiResults.slice(0, 10),
        baseStoreId,
        currentProduct.category
      );

      return res.json({ results: mappedResults, count: mappedResults.length });
    }

    // 5. FALLBACK: Search DB if API fails
    const storeInventories = await Inventory.find({
      storeId: baseStoreId,
      productId: { $ne: id },
    }).lean();
    const productIds = [...new Set(storeInventories.map((inv) => inv.productId))];

    let similarProducts = [];
    if (productIds.length) {
      similarProducts = await Product.find({
        productId: { $in: productIds },
        category: currentProduct.category,
      })
        .limit(10)
        .lean();
    }

    // 6. If DB has results → return them
    if (similarProducts.length) {
      const finalProductIds = similarProducts.map((p) => p.productId);
      const inventories = storeInventories.filter((inv) =>
        finalProductIds.includes(inv.productId)
      );
      const images = await Image.find({
        productId: { $in: finalProductIds },
      }).lean();

      const results = similarProducts.map((product) => {
        const productInventories = inventories.filter(
          (inv) => inv.productId === product.productId
        );
        const productImages = images
          .filter((img) => img.productId === product.productId)
          .map((img) => img.url);

        return {
          productId: product.productId,
          name: product.name || "Unknown Product",
          modelNo: product.modelNo || "",
          brand: product.brand || "",
          category: product.category || "",
          minPrice: productInventories.length
            ? Math.min(...productInventories.map((inv) => inv.price))
            : 0,
          rating: productInventories.length
            ? Math.max(...productInventories.map((inv) => inv.rating || 0))
            : 0,
          totalReviews: productInventories.reduce(
            (sum, inv) => sum + (inv.totalReviews || 0),
            0
          ),
          stores: productInventories.map((inv) => ({
            storeId: inv.storeId,
            price: inv.price,
            currency: inv.currency,
            inventoryQuantity: inv.inventoryQuantity,
            rating: inv.rating,
            totalReviews: inv.totalReviews,
            url: inv.url,
            images: productImages,
          })),
        };
      });

      return res.json({ results, count: results.length });
    }

    // 7. No results from both API and DB
    return res.json({ results: [], count: 0 });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};