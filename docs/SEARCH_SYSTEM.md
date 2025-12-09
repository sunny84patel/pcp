# Product Search System - Production Grade

## Overview

This is a completely redesigned product search system that fixes the major issues with false positive matches (e.g., "fridge" matching "bridge", "ridge").

## Key Improvements

### 1. **NO Fuzzy Matching by Default**
The old system used `fuzziness: "AUTO"` which caused:
- "fridge" → "bridge", "ridge" ❌
- "drill" → "grill", "trill" ❌

The new system uses exact matching with controlled expansions only where appropriate.

### 2. **Optimized Elasticsearch Index**
- Removed aggressive n-gram tokenization
- Using edge_ngram ONLY for autocomplete (prefix matching)
- Strict analyzers focused on precision over recall

### 3. **Smart Query Preprocessing**
- Synonym expansion (fridge → refrigerator)
- Brand detection (Dewalt, Milwaukee, etc.)
- Search intent classification
- Stop word handling

### 4. **Post-Processing False Positive Filter**
Results are validated after search to remove matches that slipped through.

### 5. **Working Filters**
All filters now work correctly:
- Price range
- Rating
- Brand
- Category
- Store
- In stock only

## Files Created/Modified

### New Files:
1. **`utils/searchHelpers.js`** - Query preprocessing, synonym expansion, false positive detection
2. **`utils/elasticsearchSyncV2.js`** - Optimized ES index with new mapping (products_v2)
3. **`controllers/productSearchController.js`** - New production-grade search controller
4. **`scripts/migrateSearchIndex.js`** - Migration script for the new index

### Modified Files:
1. **`routes/productRoutes.js`** - Updated to use new search controller

## Migration Steps

### Step 1: Run Migration Script
```bash
cd backend
node scripts/migrateSearchIndex.js
```

This will:
- Create the new `products_v2` index
- Sync all products from MongoDB
- Test search to verify no false positives

### Step 2: Test the Search
```bash
# Test search endpoint
curl "http://localhost:5000/api/products/search?query=fridge"

# Should NOT return "bridge", "ridge", etc.
```

### Step 3: Update Environment (if needed)
The new index is named `products_v2`. If you need to change this, update:
- `utils/elasticsearchSyncV2.js` → `PRODUCT_INDEX`

## API Endpoints

### Search Products
```
GET /api/products/search
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| query | string | Search query (required) |
| stores | string | Comma-separated store IDs |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20) |
| minPrice | number | Minimum price filter |
| maxPrice | number | Maximum price filter |
| brand | string | Brand filter (comma-separated) |
| category | string | Category filter (comma-separated) |
| minRating | number | Minimum rating (0-5) |
| minReviews | number | Minimum review count |
| inStockOnly | boolean | Only show in-stock items |
| sortByRating | string | 'asc' or 'desc' |
| sortByPopularity | string | 'asc' or 'desc' |
| sortByPrice | string | 'asc' or 'desc' |

**Response:**
```json
{
  "success": true,
  "results": [...],
  "totalResults": 100,
  "pagination": {
    "currentPage": 1,
    "hasNextPage": true,
    "totalPages": 5,
    "limit": 20
  },
  "activeFilters": {...},
  "searchMethod": "elasticsearch",
  "queryInfo": {
    "original": "fridge",
    "tokens": ["fridge"],
    "searchIntent": "single_term",
    "detectedBrand": null
  },
  "suggestions": ["refrigerator", "freezer"],
  "executionTime": "45ms"
}
```

### Search Suggestions (Autocomplete)
```
GET /api/products/search/suggestions?query=fri&limit=10
```

### Get Available Filters
```
GET /api/products/search/filters?query=fridge
```

Returns available brands, categories, price ranges for a given search.

## Search Strategy

The search uses a tiered approach:

### Tier 1: Exact Matches (Highest Priority)
- Exact phrase match: "hand tools" → "hand tools"
- Keyword exact match

### Tier 2: Phrase with Flexibility
- Allow 1 word between: "hand tools" → "hand power tools"

### Tier 3: All Terms Match
- All words must be present (any order)
- NO fuzziness

### Tier 4: Prefix Matching
- Autocomplete-style: "fri" → "fridge", "frigidaire"

### Tier 5: Synonym Expansion
- "fridge" also matches "refrigerator", "freezer"

### Tier 6: Brand/Category Matching
- Boost results matching brand or category

## Troubleshooting

### Issue: Still getting false positives
1. Check if you're using the new index (`products_v2`)
2. Verify the migration ran successfully
3. Check minimum score threshold (default: 20 for single terms)

### Issue: Too few results
1. Lower the minimum relevance score in `filterIrrelevantResults`
2. Add more synonyms in `searchHelpers.js`

### Issue: Search is slow
1. Check Elasticsearch cluster health
2. Consider increasing number of shards for large datasets
3. Use the suggestions endpoint for autocomplete instead of full search

## Adding New Synonyms

Edit `utils/searchHelpers.js`:

```javascript
const PRODUCT_SYNONYMS = {
  'fridge': ['refrigerator', 'freezer', 'cooler'],
  'your_term': ['synonym1', 'synonym2'],
  // ...
};
```

Then reindex if you want synonyms to work at index time (optional - search-time synonyms work automatically).

## Performance Tips

1. **Use pagination** - Don't request all results at once
2. **Use filters** - Narrow down results with brand/category filters
3. **Autocomplete** - Use suggestions endpoint for real-time search
4. **Caching** - Consider Redis caching for popular searches

## Rollback

To rollback to the old search:

1. Update `routes/productRoutes.js`:
```javascript
import { searchProducts } from '../controllers/productController.js';
```

2. Change `PRODUCT_INDEX` back to `'products'`

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify Elasticsearch connection in `config/elasticsearch.js`
3. Ensure MongoDB has products synced
