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

      // Improved text search strategy
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

      // ========================================
      // APPLY ALL FILTERS CUMULATIVELY
      // ========================================

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

      // ========================================
      // BUILD CUMULATIVE SORT ORDER (FIXED)
      // ========================================
      let sort = [];

      if (sortByRating || sortByPopularity) {
        // 1️⃣ Rating first if set
        if (sortByRating) {
          sort.push({ avgRating: { order: sortByRating } });
          console.log("✅ Adding rating sort:", sortByRating);
        }

        // 2️⃣ Popularity next if set
        if (sortByPopularity) {
          sort.push({ totalReviews: { order: sortByPopularity } });
          console.log("✅ Adding popularity sort:", sortByPopularity);
        }

        // 3️⃣ Relevance still matters, but after explicit sorts
        sort.push({ _score: { order: "desc" } });
      } else {
        // Default: relevance only
        sort.push({ _score: { order: "desc" } });
      }

      // 4️⃣ Price as final tie-breaker (always asc)
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
          storeId: item.store || platform,
          price: Number(item.price) || 0,
          inventoryQuantity: item.inStock ? 1 : 0,
          images: item.thumbnails || [],
        }],
      }));

      // Apply filters to API results
      if (minPrice) {
        filteredApiResults = filteredApiResults.filter(p => p.minPrice >= Number(minPrice));
      }
      if (maxPrice) {
        filteredApiResults = filteredApiResults.filter(p => p.minPrice <= Number(maxPrice));
      }
      if (minRating) {
        filteredApiResults = filteredApiResults.filter(p => p.rating >= Number(minRating));
      }
      if (minReviews) {
        filteredApiResults = filteredApiResults.filter(p => p.totalReviews >= Number(minReviews));
      }
      if (brand) {
        const brandList = brand.split(",").map(b => b.trim().toLowerCase());
        filteredApiResults = filteredApiResults.filter(p => 
          p.brand && brandList.includes(p.brand.toLowerCase())
        );
      }
      if (inStockOnly === "true" || inStockOnly === true) {
        filteredApiResults = filteredApiResults.filter(p => 
          p.stores.some(s => s.inventoryQuantity > 0)
        );
      }

      // ✅ Cumulative sorting for API results (same logic as ES)
      filteredApiResults.sort((a, b) => {
        if (sortByRating) {
          const ratingDiff = sortByRating === "asc"
            ? a.rating - b.rating
            : b.rating - a.rating;
          if (ratingDiff !== 0) return ratingDiff;
        }

        if (sortByPopularity) {
          const popularityDiff = sortByPopularity === "asc"
            ? a.totalReviews - b.totalReviews
            : b.totalReviews - a.totalReviews;
          if (popularityDiff !== 0) return popularityDiff;
        }

        // price ascending as final tiebreaker
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
      console.error("❌ Error fetching from third-party API:", apiError.message);
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
    console.error("❌ Error in search API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
