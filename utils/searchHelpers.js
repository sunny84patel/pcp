/**
 * Search Helpers - Production-grade search utilities
 * Handles query preprocessing, tokenization, and relevance scoring
 */

// Common stop words to remove from search queries
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
  'then', 'once', 'if', 'because', 'until', 'while', 'about', 'against',
  'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further'
]);

// Product category synonyms for better matching
const PRODUCT_SYNONYMS = {
  // Appliances
  'fridge': ['refrigerator', 'freezer', 'cooler'],
  'refrigerator': ['fridge', 'freezer', 'cooler'],
  'ac': ['air conditioner', 'air conditioning', 'cooling unit'],
  'air conditioner': ['ac', 'cooling unit', 'hvac'],
  'washer': ['washing machine', 'laundry machine'],
  'dryer': ['drying machine', 'clothes dryer'],
  'dishwasher': ['dish washer', 'dish cleaning machine'],
  'microwave': ['microwave oven'],
  'oven': ['stove', 'range', 'cooker'],
  'stove': ['oven', 'range', 'cooktop'],
  
  // Tools
  'drill': ['power drill', 'drilling machine', 'cordless drill'],
  'saw': ['cutting saw', 'circular saw', 'power saw'],
  'hammer': ['mallet', 'sledge'],
  'screwdriver': ['driver', 'screw driver'],
  'wrench': ['spanner'],
  'pliers': ['gripper', 'needle nose'],
  
  // Building Materials
  'lumber': ['wood', 'timber', 'plywood'],
  'plywood': ['lumber', 'wood panel'],
  'drywall': ['sheetrock', 'gypsum board', 'wallboard'],
  'cement': ['concrete', 'mortar'],
  'tile': ['tiles', 'flooring tile', 'ceramic'],
  
  // Paint & Finishes
  'paint': ['coating', 'finish', 'stain'],
  'primer': ['undercoat', 'base coat'],
  'stain': ['wood stain', 'finish'],
  
  // Plumbing
  'faucet': ['tap', 'spigot'],
  'toilet': ['commode', 'water closet'],
  'sink': ['basin', 'washbasin'],
  'pipe': ['tubing', 'plumbing pipe'],
  
  // Electrical
  'outlet': ['receptacle', 'socket', 'plug'],
  'switch': ['light switch', 'wall switch'],
  'bulb': ['light bulb', 'lamp', 'led'],
  'wire': ['wiring', 'electrical wire', 'cable'],
  
  // Outdoor & Garden
  'mower': ['lawn mower', 'grass cutter'],
  'trimmer': ['weed eater', 'string trimmer', 'edger'],
  'blower': ['leaf blower', 'yard blower'],
  'hose': ['garden hose', 'water hose'],
  'sprinkler': ['irrigation', 'water sprinkler'],
  
  // Furniture
  'sofa': ['couch', 'settee', 'loveseat'],
  'couch': ['sofa', 'settee', 'loveseat'],
  'table': ['desk', 'workbench'],
  'chair': ['seat', 'stool'],
  'cabinet': ['cupboard', 'storage'],
  'shelf': ['shelving', 'rack'],
};

// Known brand names for better brand detection
const KNOWN_BRANDS = new Set([
  'dewalt', 'milwaukee', 'makita', 'bosch', 'ryobi', 'craftsman', 'stanley',
  'black+decker', 'black & decker', 'ridgid', 'kobalt', 'husky', 'klein',
  'ge', 'whirlpool', 'samsung', 'lg', 'frigidaire', 'maytag', 'kenmore',
  'kitchenaid', 'bosch', 'miele', 'electrolux', 'haier', 'hisense',
  'carrier', 'lennox', 'trane', 'rheem', 'goodman', 'daikin', 'honeywell',
  'behr', 'sherwin-williams', 'benjamin moore', 'valspar', 'rust-oleum',
  'kohler', 'moen', 'delta', 'american standard', 'pfister', 'glacier bay',
  'leviton', 'lutron', 'philips', 'ge lighting', 'cree', 'feit',
  'scotts', 'miracle-gro', 'ortho', 'roundup', 'vigoro', 'pennington',
  'hampton bay', 'home decorators', 'stylewell', 'noble house', 'walker edison',
  'anderson', 'pella', 'milgard', 'marvin', 'therma-tru', 'masonite',
  'owens corning', 'johns manville', 'certainteed', 'gaf', 'tamko'
]);

/**
 * Preprocess search query for better matching
 * @param {string} query - Raw search query
 * @returns {Object} Processed query information
 */
export const preprocessQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return {
      original: '',
      normalized: '',
      tokens: [],
      isNumeric: false,
      isModelNumber: false,
      hasBrand: false,
      detectedBrand: null,
      synonyms: [],
      searchIntent: 'general'
    };
  }

  const original = query.trim();
  const normalized = original.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Tokenize and filter
  const rawTokens = normalized.split(/\s+/).filter(t => t.length > 0);
  const tokens = rawTokens.filter(t => !STOP_WORDS.has(t) || t.length > 3);
  
  // Detect if query is numeric (product ID)
  const isNumeric = /^\d+$/.test(normalized.replace(/\s/g, ''));
  
  // Detect if query looks like a model number
  const isModelNumber = /^[a-z0-9]+-?[a-z0-9]*$/i.test(normalized.replace(/\s/g, '')) && 
                        /\d/.test(normalized) && 
                        /[a-z]/i.test(normalized);
  
  // Detect brand in query
  let detectedBrand = null;
  let hasBrand = false;
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (KNOWN_BRANDS.has(lowerToken)) {
      hasBrand = true;
      detectedBrand = lowerToken;
      break;
    }
    // Check multi-word brands
    for (const brand of KNOWN_BRANDS) {
      if (normalized.includes(brand)) {
        hasBrand = true;
        detectedBrand = brand;
        break;
      }
    }
    if (hasBrand) break;
  }
  
  // Get synonyms for search terms
  const synonyms = [];
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (PRODUCT_SYNONYMS[lowerToken]) {
      synonyms.push(...PRODUCT_SYNONYMS[lowerToken]);
    }
  }
  
  // Determine search intent
  let searchIntent = 'general';
  if (isNumeric) searchIntent = 'product_id';
  else if (isModelNumber) searchIntent = 'model_number';
  else if (hasBrand && tokens.length > 1) searchIntent = 'brand_product';
  else if (hasBrand) searchIntent = 'brand_only';
  else if (tokens.length === 1) searchIntent = 'single_term';
  else searchIntent = 'multi_term';
  
  return {
    original,
    normalized,
    tokens,
    isNumeric,
    isModelNumber,
    hasBrand,
    detectedBrand,
    synonyms: [...new Set(synonyms)],
    searchIntent
  };
};

/**
 * Calculate minimum score threshold based on query characteristics
 * @param {Object} queryInfo - Processed query info
 * @returns {number} Minimum score threshold
 */
export const calculateMinScore = (queryInfo) => {
  // Higher thresholds mean stricter matching (fewer false positives)
  switch (queryInfo.searchIntent) {
    case 'product_id':
      return 50; // Exact match required
    case 'model_number':
      return 40; // High confidence needed
    case 'brand_product':
      return 25; // Brand + product search
    case 'brand_only':
      return 30; // Just searching for brand
    case 'single_term':
      return 20; // Single word search needs higher threshold
    case 'multi_term':
      return 15; // Multi-word has more context
    default:
      return 20;
  }
};

/**
 * Build synonyms expansion query
 * @param {Array} synonyms - Array of synonym terms
 * @returns {Array} Elasticsearch should clauses for synonyms
 */
export const buildSynonymClauses = (synonyms) => {
  if (!synonyms || synonyms.length === 0) return [];
  
  return synonyms.map(synonym => ({
    match: {
      name: {
        query: synonym,
        boost: 15, // Lower boost than main terms
        operator: 'and'
      }
    }
  }));
};

/**
 * Calculate result relevance score for post-processing
 * @param {Object} result - Search result
 * @param {Object} queryInfo - Processed query info
 * @returns {number} Relevance score (0-100)
 */
export const calculateRelevanceScore = (result, queryInfo) => {
  if (!result || !queryInfo) return 0;
  
  let score = 0;
  const name = (result.name || '').toLowerCase();
  const brand = (result.brand || '').toLowerCase();
  const category = (result.category || '').toLowerCase();
  const { tokens, normalized, detectedBrand } = queryInfo;
  
  // Exact name match (highest priority)
  if (name === normalized) {
    score += 50;
  }
  // Name contains full query
  else if (name.includes(normalized)) {
    score += 40;
  }
  
  // All tokens present in name
  const tokensInName = tokens.filter(t => name.includes(t));
  const tokenMatchRatio = tokens.length > 0 ? tokensInName.length / tokens.length : 0;
  score += tokenMatchRatio * 30;
  
  // Brand match bonus
  if (detectedBrand && brand.includes(detectedBrand)) {
    score += 15;
  }
  
  // Check for false positive indicators
  // If query is "fridge" but result is "bridge", penalize
  for (const token of tokens) {
    if (token.length >= 4) {
      // Check if name contains the token but with different first letter
      const regex = new RegExp(`[^${token[0]}]${token.slice(1)}`, 'i');
      if (regex.test(name) && !name.includes(token)) {
        score -= 20; // Penalize fuzzy false positives
      }
    }
  }
  
  // Rating and review bonus
  const rating = result.rating || result.avgRating || 0;
  const reviews = result.totalReviews || 0;
  if (rating >= 4) score += 3;
  if (reviews >= 100) score += 2;
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Filter out irrelevant results based on query
 * @param {Array} results - Search results
 * @param {Object} queryInfo - Processed query info
 * @param {number} minRelevance - Minimum relevance score to keep
 * @returns {Array} Filtered results
 */
export const filterIrrelevantResults = (results, queryInfo, minRelevance = 25) => {
  if (!results || results.length === 0) return [];
  
  return results
    .map(result => ({
      ...result,
      calculatedRelevance: calculateRelevanceScore(result, queryInfo)
    }))
    .filter(result => result.calculatedRelevance >= minRelevance)
    .sort((a, b) => b.calculatedRelevance - a.calculatedRelevance);
};

/**
 * Check if a result is a false positive match
 * @param {string} productName - Product name
 * @param {Object} queryInfo - Processed query info
 * @returns {boolean} True if likely false positive
 */
export const isFalsePositive = (productName, queryInfo) => {
  if (!productName || !queryInfo) return false;
  
  const name = productName.toLowerCase();
  const { tokens, normalized } = queryInfo;
  
  // For short single-word queries, be strict
  if (tokens.length === 1 && tokens[0].length >= 4) {
    const token = tokens[0];
    
    // Check if the product name contains similar but different words
    // e.g., "fridge" query matching "bridge" or "ridge"
    
    // Must contain the exact token or a synonym
    const synonyms = PRODUCT_SYNONYMS[token] || [];
    const allValidTerms = [token, ...synonyms];
    
    // Check if name contains any valid term as a complete word
    const hasValidMatch = allValidTerms.some(term => {
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      return wordBoundaryRegex.test(name);
    });
    
    if (!hasValidMatch) {
      // Check if it's a partial match that shouldn't count
      // "fridge" → "fri", "rid", "idg", "dge" matching in "bridge" is bad
      const partials = [];
      for (let i = 0; i < token.length - 2; i++) {
        partials.push(token.slice(i, i + 3));
      }
      
      // If name contains partials but not the full word, it's likely false positive
      const hasPartial = partials.some(p => name.includes(p));
      if (hasPartial) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Suggest alternative search terms if results are poor
 * @param {Object} queryInfo - Processed query info
 * @returns {Array} Array of suggested search terms
 */
export const getSuggestions = (queryInfo) => {
  const suggestions = [];
  
  // Add synonyms as suggestions
  if (queryInfo.synonyms && queryInfo.synonyms.length > 0) {
    suggestions.push(...queryInfo.synonyms.slice(0, 3));
  }
  
  // If brand detected, suggest brand-only search
  if (queryInfo.detectedBrand) {
    suggestions.push(queryInfo.detectedBrand);
    
    // Also suggest without brand
    const withoutBrand = queryInfo.tokens
      .filter(t => t.toLowerCase() !== queryInfo.detectedBrand)
      .join(' ');
    if (withoutBrand) {
      suggestions.push(withoutBrand);
    }
  }
  
  return [...new Set(suggestions)];
};

export default {
  preprocessQuery,
  calculateMinScore,
  buildSynonymClauses,
  calculateRelevanceScore,
  filterIrrelevantResults,
  isFalsePositive,
  getSuggestions,
  PRODUCT_SYNONYMS,
  KNOWN_BRANDS
};
