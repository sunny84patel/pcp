import axios from "axios";
import esClient from "../config/elasticsearch.js";
import { PRODUCT_INDEX } from "../utils/elasticsearchSync.js";
import dotenv from "dotenv";
dotenv.config();

const API_BASE_URL = "https://data.unwrangle.com/api/getter/";
const API_KEY = process.env.UNWRANGLE_API_KEY;

export const searchProducts = async (req, res) => {
  try {
    const {
      query,
      stores,
      page = 1,
      limit = 20,
      inStockOnly = false,
      sortBy = "relevance",
      sortOrder = "desc",
      minPrice,
      maxPrice,
      brand,
      category
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    // Store mapping
    const storeMap = {
      lowes: "lowe's",
      "lowe's": "lowe's",
      homedepot: "homedepot",
      "home depot": "homedepot",
    };

    const storeIds = stores
      ? stores.split(",").map(s => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase())
      : null;

    const isNumericQuery = /^\d+$/.test(query.trim());

    // ========================================
    // ELASTICSEARCH SEARCH QUERY
    // ========================================
    try {
      const mustClauses = [];
      const shouldClauses = [];
      const filterClauses = [];

      // Text search with boosting
      if (isNumericQuery) {
        // Exact match for product ID or model number
        shouldClauses.push(
          { term: { productId: { value: query.trim(), boost: 10 } } },
          { term: { "modelNo.keyword": { value: query.trim(), boost: 8 } } }
        );
      } else {
        // Multi-field search with different boost levels
        shouldClauses.push(
          { match: { name: { query, boost: 3, fuzziness: "AUTO" } } },
          { match_phrase: { name: { query, boost: 5 } } },
          { match: { "name.raw": { query, boost: 4 } } },
          { match: { brand: { query, boost: 2 } } },
          { match: { category: { query, boost: 1.5 } } },
          { wildcard: { "modelNo.keyword": { value: `*${query.toLowerCase()}*`, boost: 3 } } }
        );
      }

      mustClauses.push({
        bool: { should: shouldClauses, minimum_should_match: 1 }
      });

      // Filter by stores (nested query)
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

      // Filter by in-stock
      if (inStockOnly === "true" || inStockOnly === true) {
        filterClauses.push({ term: { inStock: true } });
      }

      // Price range filter
      if (minPrice || maxPrice) {
        const priceFilter = {};
        if (minPrice) priceFilter.gte = Number(minPrice);
        if (maxPrice) priceFilter.lte = Number(maxPrice);
        filterClauses.push({ range: { minPrice: priceFilter } });
      }

      // Brand filter
      if (brand) {
        filterClauses.push({ term: { "brand.keyword": brand } });
      }

      // Category filter
      if (category) {
        filterClauses.push({ term: { "category.keyword": category } });
      }

      // Build sort
      let sort = [];
      switch (sortBy) {
        case "price":
          sort = [{ minPrice: { order: sortOrder } }];
          break;
        case "reviews":
          sort = [{ avgRating: { order: sortOrder } }];
          break;
        case "popularity":
          sort = [{ totalReviews: { order: sortOrder } }];
          break;
        case "name":
          sort = [{ "name.keyword": { order: sortOrder } }];
          break;
        case "relevance":
        default:
          sort = ["_score"];
          break;
      }

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
          sort,
          track_total_hits: true
        }
      });

      const hits = esResponse.hits.hits;
      const totalResults = esResponse.hits.total.value;

      if (hits.length > 0) {
        // Format results
        const results = hits.map(hit => {
          const source = hit._source;
          
          // Filter stores if needed
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
          searchMethod: "elasticsearch",
          searchedStores: storeIds || ["all stores"],
          executionTime: esResponse.took + "ms"
        });
      }
    } catch (esError) {
      console.error("⚠️ Elasticsearch search failed, falling back:", esError.message);
    }

    // ========================================
    // FALLBACK TO THIRD-PARTY API
    // ========================================
    const platformMap = {
      homedepot: "homedepot_search",
      "lowe's": "lowes_search",
    };
    const platform = storeIds?.length > 0
      ? storeIds.map(s => platformMap[s] || s).join(",")
      : "homedepot_search";

    try {
      const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
        query
      )}&page=${page}&api_key=${API_KEY}`;

      console.log("🌐 Fallback: Fetching from third-party API:", url);
      const { data } = await axios.get(url);
      const apiResults = data?.results || [];

      const normalizedResults = apiResults.map((item, index) => ({
        productId: item.id || `api-${page}-${index}`,
        name: item.name || item.title || "Unknown Product",
        modelNo: item.modelNo || "",
        brand: item.brand || "",
        category: item.category || "",
        minPrice: Number(item.price) || 0,
        rating: item.rating || 0,
        totalReviews: item.totalReviews || 0,
        stores: [{
          storeId: item.store || platform,
          price: Number(item.price) || 0,
          inventoryQuantity: item.inStock ? 1 : 0,
          images: item.thumbnails || [],
        }],
      }));

      return res.status(200).json({
        results: normalizedResults,
        totalResults: data.totalResults || normalizedResults.length,
        totalProducts: normalizedResults.length,
        pagination: {
          currentPage: Number(page),
          hasNextPage: data.hasNextPage ?? normalizedResults.length === Number(limit),
          totalResults: data.totalResults || normalizedResults.length,
          totalPages: data.totalPages || Math.ceil((data.totalResults || normalizedResults.length) / Number(limit)),
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
        searchMethod: "fallback-error",
        searchedStores: storeIds || ["all stores"],
      });
    }
  } catch (error) {
    console.error("❌ Error in search API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};