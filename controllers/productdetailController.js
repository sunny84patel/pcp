// import { Product, Inventory, Image } from '../models/Product.js';

// // =====================================================
// // ENHANCED PRODUCT NORMALIZATION & MATCHING SYSTEM
// // =====================================================

// // Advanced product title normalization for cross-store matching
// const normalizeProductTitle = (title) => {
//   return title
//     .toLowerCase()
//     .trim()
//     // Remove common store-specific formatting
//     .replace(/\b#\s*\d+\b/g, '') // Remove item numbers like "#12345"
//     .replace(/\b\d+\s*#\s*/g, '') // Remove size indicators like "1/2 #"
//     .replace(/\bsku\s*[:\-]?\s*\w+/gi, '') // Remove SKU references
//     .replace(/\bitem\s*[:\-]?\s*\w+/gi, '') // Remove item references
//     // Normalize measurements and quantities
//     .replace(/\b(\d+)\s*\/\s*(\d+)\s*(in|inch|inches|")\b/gi, '$1/$2inch') // 1/2 in -> 1/2inch
//     .replace(/\b(\d+)\s*(in|inch|inches|")\b/gi, '$1inch') // 1 in -> 1inch
//     .replace(/\b(\d+)\s*(ft|feet|')\b/gi, '$1ft') // 1 ft -> 1ft
//     .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1x$2') // 1 x 2 -> 1x2
//     // Normalize pack quantities
//     .replace(/\b(\d+)\s*[\-\s]*(pack|pc|pcs|piece|pieces)\b/gi, '$1pack')
//     .replace(/\((\d+)[\-\s]*(pack|pc|pcs|piece|pieces)\)/gi, '$1pack')
//     // Normalize common product terms
//     .replace(/\b(two[\-\s]*hole|2[\-\s]*hole)\b/gi, '2hole')
//     .replace(/\b(three[\-\s]*hole|3[\-\s]*hole)\b/gi, '3hole')
//     .replace(/\b(four[\-\s]*hole|4[\-\s]*hole)\b/gi, '4hole')
//     .replace(/\belectrical\s*metallic\s*tube/gi, 'emt')
//     .replace(/\bconduit\s*fittings?\b/gi, 'conduitfitting')
//     .replace(/\bstrap\s*conduit/gi, 'conduitstrap')
//     .replace(/\bmetal\s*conduit/gi, 'metalconduit')
//     .replace(/\bpvc\s*conduit/gi, 'pvcconduit')
//     // Remove extra spaces and punctuation
//     .replace(/[\s\-:;,./#()]+/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();
// };

// // Extract core product essence (ignoring store-specific variations)
// const extractProductEssence = (title) => {
//   const normalized = normalizeProductTitle(title);
  
//   // Extract key product identifiers
//   const measurements = normalized.match(/\b\d+\/\d+inch|\b\d+inch|\b\d+ft|\b\d+x\d+|\b\d+pack\b/gi) || [];
//   const materials = normalized.match(/\b(zinc[\-\s]*plated|galvanized|steel|stainless[\-\s]*steel|aluminum|brass|copper|plastic|metal|pvc|abs)\b/gi) || [];
//   const productType = normalized.match(/\b(strap|conduit|fitting|tube|emt|clamp|bracket|hanger|coupling|connector|elbow|tee|reducer)\b/gi) || [];
//   const features = normalized.match(/\b(2hole|3hole|4hole|standard|heavy[\-\s]*duty|rigid|flexible|weatherproof|indoor|outdoor)\b/gi) || [];
  
//   // Core words (excluding common filler words)
//   const stopWords = ['the', 'a', 'an', 'with', 'for', 'and', 'of', 'to', 'on', 'by', 'in', 'at', 'from'];
//   const words = normalized
//     .split(' ')
//     .filter(word => word.length > 2 && !stopWords.includes(word))
//     .filter(word => !/^\d+$/.test(word)); // Remove standalone numbers
  
//   return {
//     normalized,
//     measurements: measurements.map(m => m.toLowerCase()),
//     materials: materials.map(m => m.toLowerCase().replace(/\s+/g, '')),
//     productType: productType.map(p => p.toLowerCase()),
//     features: features.map(f => f.toLowerCase()),
//     coreWords: words,
//     essence: [...measurements, ...materials, ...productType, ...features]
//       .map(item => item.toLowerCase().replace(/\s+/g, ''))
//       .filter((item, index, arr) => arr.indexOf(item) === index)
//   };
// };

// // Calculate product similarity based on essence matching
// const calculateProductSimilarity = (baseEssence, candidateTitle) => {
//   const candidateEssence = extractProductEssence(candidateTitle);
  
//   let score = 0;
//   let matchDetails = {
//     measurementMatches: [],
//     materialMatches: [],
//     typeMatches: [],
//     featureMatches: [],
//     coreWordMatches: []
//   };
  
//   // Measurement matching (30% weight) - Very important for exact products
//   const measurementMatches = baseEssence.measurements.filter(measurement =>
//     candidateEssence.measurements.some(candMeasurement =>
//       candMeasurement === measurement || 
//       candMeasurement.includes(measurement) || 
//       measurement.includes(candMeasurement)
//     )
//   );
//   if (measurementMatches.length > 0) {
//     score += 30;
//     matchDetails.measurementMatches = measurementMatches;
//   }
  
//   // Material matching (25% weight)
//   const materialMatches = baseEssence.materials.filter(material =>
//     candidateEssence.materials.some(candMaterial =>
//       candMaterial === material ||
//       candMaterial.includes(material) ||
//       material.includes(candMaterial)
//     )
//   );
//   if (materialMatches.length > 0) {
//     score += 25;
//     matchDetails.materialMatches = materialMatches;
//   }
  
//   // Product type matching (25% weight)
//   const typeMatches = baseEssence.productType.filter(type =>
//     candidateEssence.productType.some(candType =>
//       candType === type ||
//       candType.includes(type) ||
//       type.includes(candType)
//     )
//   );
//   if (typeMatches.length > 0) {
//     score += 25;
//     matchDetails.typeMatches = typeMatches;
//   }
  
//   // Feature matching (15% weight)
//   const featureMatches = baseEssence.features.filter(feature =>
//     candidateEssence.features.some(candFeature =>
//       candFeature === feature ||
//       candFeature.includes(feature) ||
//       feature.includes(candFeature)
//     )
//   );
//   if (featureMatches.length > 0) {
//     score += 15;
//     matchDetails.featureMatches = featureMatches;
//   }
  
//   // Core word overlap (5% weight)
//   const coreWordMatches = baseEssence.coreWords.filter(word =>
//     candidateEssence.coreWords.some(candWord =>
//       candWord.includes(word) || word.includes(candWord)
//     )
//   );
//   if (coreWordMatches.length > 0) {
//     score += 5;
//     matchDetails.coreWordMatches = coreWordMatches;
//   }
  
//   return {
//     score: Math.round(score * 100) / 100,
//     matchDetails,
//     baseEssence: baseEssence.essence,
//     candidateEssence: candidateEssence.essence
//   };
// };

// // Enhanced exact product search with better normalization
// const findExactProductInOtherStores = async (baseProduct, baseStoreId) => {
//   const stores = ['homedepot', "lowe's"];
//   const baseEssence = extractProductEssence(baseProduct.name);
  
//   console.log(`\n🔍 ENHANCED EXACT PRODUCT SEARCH`);
//   console.log(`Base product: "${baseProduct.name}"`);
//   console.log(`Base essence:`, baseEssence.essence);
//   console.log(`Normalized: "${baseEssence.normalized}"`);
  
//   for (const storeId of stores) {
//     if (storeId === baseStoreId) continue;
    
//     console.log(`\nSearching in ${storeId}...`);
    
//     // Method 1: Model number match (highest confidence)
//     if (baseProduct.modelNo) {
//       const modelMatch = await Product.findOne({
//         modelNo: baseProduct.modelNo,
//         productId: { $ne: baseProduct.productId }
//       });
      
//       if (modelMatch) {
//         const inventory = await Inventory.findOne({
//           productId: modelMatch.productId,
//           storeId: storeId
//         });
        
//         if (inventory) {
//           console.log(`🎯 MODEL NUMBER EXACT MATCH FOUND!`);
//           console.log(`Product: "${modelMatch.name}"`);
//           return {
//             product: modelMatch,
//             inventory,
//             matchScore: 100,
//             strategyLevel: 0,
//             isDifferentStore: true,
//             isExactMatch: true,
//             matchType: 'model_number'
//           };
//         }
//       }
//     }
    
//     // Method 2: Essence-based matching (for same products with different naming)
//     // Get products from the target store
//     const storeInventory = await Inventory.find({ storeId }).select('productId').lean();
//     const storeProductIds = storeInventory.map(inv => inv.productId);
    
//     // Search for products with similar essence
//     const candidateProducts = await Product.find({
//       productId: { $in: storeProductIds, $ne: baseProduct.productId }
//     }).limit(200); // Increased limit for better coverage
    
//     let bestMatch = null;
//     let bestScore = 0;
    
//     for (const candidate of candidateProducts) {
//       const similarity = calculateProductSimilarity(baseEssence, candidate.name);
      
//       // Consider it an exact match if:
//       // 1. Score is very high (85+) AND
//       // 2. Has measurement + material + type matches OR
//       // 3. Score is perfect (95+)
//       const hasKeyMatches = (
//         similarity.matchDetails.measurementMatches.length > 0 &&
//         similarity.matchDetails.materialMatches.length > 0 &&
//         similarity.matchDetails.typeMatches.length > 0
//       );
      
//       const isExactMatch = similarity.score >= 95 || (similarity.score >= 85 && hasKeyMatches);
      
//       if (isExactMatch && similarity.score > bestScore) {
//         const inventory = await Inventory.findOne({
//           productId: candidate.productId,
//           storeId: storeId
//         });
        
//         if (inventory) {
//           bestMatch = {
//             product: candidate,
//             inventory,
//             matchScore: similarity.score,
//             matchDetails: similarity.matchDetails,
//             strategyLevel: 0,
//             isDifferentStore: true,
//             isExactMatch: true,
//             matchType: 'essence_based'
//           };
//           bestScore = similarity.score;
//         }
//       }
//     }
    
//     if (bestMatch) {
//       console.log(`🎯 ESSENCE-BASED EXACT MATCH FOUND! (Score: ${bestMatch.matchScore})`);
//       console.log(`Base: "${baseProduct.name}"`);
//       console.log(`Match: "${bestMatch.product.name}"`);
//       console.log(`Match details:`, bestMatch.matchDetails);
//       return bestMatch;
//     }
    
//     // Method 3: Relaxed essence matching (lower threshold but still high confidence)
//     for (const candidate of candidateProducts) {
//       const similarity = calculateProductSimilarity(baseEssence, candidate.name);
      
//       // More relaxed matching - good for variations in naming
//       if (similarity.score >= 75 && similarity.score > bestScore) {
//         const hasMinimumMatches = (
//           similarity.matchDetails.measurementMatches.length > 0 &&
//           (similarity.matchDetails.materialMatches.length > 0 || similarity.matchDetails.typeMatches.length > 0)
//         );
        
//         if (hasMinimumMatches) {
//           const inventory = await Inventory.findOne({
//             productId: candidate.productId,
//             storeId: storeId
//           });
          
//           if (inventory) {
//             bestMatch = {
//               product: candidate,
//               inventory,
//               matchScore: similarity.score,
//               matchDetails: similarity.matchDetails,
//               strategyLevel: 1,
//               isDifferentStore: true,
//               isExactMatch: false,
//               matchType: 'relaxed_essence'
//             };
//             bestScore = similarity.score;
//           }
//         }
//       }
//     }
    
//     if (bestMatch) {
//       console.log(`🎯 RELAXED ESSENCE MATCH FOUND! (Score: ${bestMatch.matchScore})`);
//       console.log(`Base: "${baseProduct.name}"`);
//       console.log(`Match: "${bestMatch.product.name}"`);
//       return bestMatch;
//     }
//   }
  
//   console.log(`❌ No exact matches found with enhanced search`);
//   return null;
// };

// // =====================================================
// // ORIGINAL FALLBACK SEARCH SYSTEM (UNCHANGED)
// // =====================================================

// // Enhanced keyword extraction with category detection
// const extractSearchKeywords = (title) => {
//   const stopWords = ['the', 'a', 'an', 'with', 'for', 'and', 'of', 'to', 'on', 'by', 'pack', 'set', 'kit', 'piece'];
  
//   // Category indicators (most important for matching)
//   const categoryPatterns = {
//     doors: /\b(door|barn\s*door|sliding\s*door|entry\s*door)\b/gi,
//     hardware: /\b(hardware|hinge|handle|lock|knob|latch|strap|fitting|conduit)\b/gi,
//     plumbing: /\b(drain|basin|pipe|faucet|toilet|sink|shower)\b/gi,
//     electrical: /\b(switch|outlet|wire|cable|light|lamp|electrical|metallic|tube|emt)\b/gi,
//     tools: /\b(drill|saw|hammer|screwdriver|tool)\b/gi,
//     paint: /\b(paint|primer|stain|brush|roller)\b/gi,
//     flooring: /\b(tile|carpet|wood|laminate|vinyl|floor)\b/gi,
//     lighting: /\b(light|fixture|bulb|led|chandelier)\b/gi
//   };

//   // Brand patterns (high importance)
//   const brandPatterns = /\b(dewalt|milwaukee|ryobi|craftsman|kobalt|husky|ridgid|porter\s*cable|black\s*\+\s*decker|stanley|irwin|lennox|carrier|trane|american\s*standard|delta|moen|kohler|pfister|schlage|kwikset|baldwin|yale|august)\b/gi;

//   // Normalize title
//   const normalized = title
//     .toLowerCase()
//     .trim()
//     .replace(/[\s\-:;,./#()]+/g, ' ')
//     .replace(/\b(\d+)\s*(in|inch|inches|")\b/gi, '$1inch')
//     .replace(/\b(\d+)\s*(ft|feet|')\b/gi, '$1ft')
//     .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1x$2')
//     .replace(/\b(\d+)\s*(pack|pc|pcs|piece|pieces)\b/gi, '$1pack');

//   // Extract different types of keywords
//   const allWords = normalized
//     .split(/\s+/)
//     .filter(word => word.length > 1)
//     .filter(word => !stopWords.includes(word))
//     .filter((word, index, arr) => arr.indexOf(word) === index);

//   // Extract categories
//   const categories = [];
//   Object.entries(categoryPatterns).forEach(([category, pattern]) => {
//     if (pattern.test(title)) {
//       categories.push(category);
//     }
//   });

//   // Extract brands
//   const brands = [];
//   const brandMatches = title.match(brandPatterns) || [];
//   brandMatches.forEach(brand => {
//     brands.push(brand.toLowerCase().replace(/\s+/g, ''));
//   });

//   // Extract measurements and specifications
//   const measurements = title.match(/\b\d+[\s\-]*(inch|in|"|ft|feet|'|x\d+|pack|pc)\b/gi) || [];
//   const colors = title.match(/\b(black|white|brown|gray|grey|silver|gold|bronze|chrome|brass|copper|red|blue|green|yellow|clear|transparent)\b/gi) || [];
//   const materials = title.match(/\b(wood|metal|plastic|steel|aluminum|brass|copper|vinyl|leather|fabric|glass|ceramic|stone|concrete|zinc|plated)\b/gi) || [];

//   // Priority keywords (most important for matching)
//   const priorityKeywords = [
//     ...brands,
//     ...categories,
//     ...measurements.map(m => m.toLowerCase().replace(/\s+/g, '')),
//     ...colors.map(c => c.toLowerCase()),
//     ...materials.map(m => m.toLowerCase())
//   ];

//   // Core product keywords (excluding common words)
//   const coreKeywords = allWords.filter(word => 
//     !categories.includes(word) && 
//     !brands.includes(word) &&
//     !['indoor', 'outdoor', 'standard', 'single', 'double', 'matte', 'finish'].includes(word)
//   );

//   return {
//     allKeywords: allWords,
//     priorityKeywords: [...new Set(priorityKeywords)],
//     coreKeywords: coreKeywords,
//     categories,
//     brands,
//     measurements: measurements.map(m => m.toLowerCase().replace(/\s+/g, '')),
//     colors: colors.map(c => c.toLowerCase()),
//     materials: materials.map(m => m.toLowerCase()),
//     originalTitle: title,
//     normalizedTitle: normalized
//   };
// };

// // Create flexible search strategies
// const createSearchStrategies = (searchKeywords) => {
//   const strategies = [];
//   const { priorityKeywords, categories, brands, measurements, colors, coreKeywords, allKeywords } = searchKeywords;

//   // Strategy 1: Brand + Category + Key Measurements (Highest Priority)
//   if (brands.length > 0 && categories.length > 0) {
//     const keyMeasurements = measurements.slice(0, 2);
//     const searchTerms = [...brands, ...categories, ...keyMeasurements];
//     strategies.push({
//       level: 1,
//       searchTerms,
//       query: createFlexibleQuery(searchTerms),
//       description: `Brand + Category + Measurements: [${searchTerms.join(', ')}]`,
//       minMatches: Math.max(2, Math.floor(searchTerms.length * 0.6))
//     });
//   }

//   // Strategy 2: Category + Core Features + Measurements
//   if (categories.length > 0) {
//     const keyFeatures = coreKeywords.slice(0, 3);
//     const keyMeasurements = measurements.slice(0, 2);
//     const searchTerms = [...categories, ...keyFeatures, ...keyMeasurements];
//     strategies.push({
//       level: 2,
//       searchTerms,
//       query: createFlexibleQuery(searchTerms),
//       description: `Category + Features + Measurements: [${searchTerms.join(', ')}]`,
//       minMatches: Math.max(2, Math.floor(searchTerms.length * 0.5))
//     });
//   }

//   // Strategy 3: Brand + Core Keywords
//   if (brands.length > 0) {
//     const keyFeatures = coreKeywords.slice(0, 4);
//     const searchTerms = [...brands, ...keyFeatures];
//     strategies.push({
//       level: 3,
//       searchTerms,
//       query: createFlexibleQuery(searchTerms),
//       description: `Brand + Core Features: [${searchTerms.join(', ')}]`,
//       minMatches: Math.max(1, Math.floor(searchTerms.length * 0.4))
//     });
//   }

//   // Strategy 4: Priority Keywords (Most Important Terms)
//   if (priorityKeywords.length >= 2) {
//     const topPriority = priorityKeywords.slice(0, 5);
//     strategies.push({
//       level: 4,
//       searchTerms: topPriority,
//       query: createFlexibleQuery(topPriority),
//       description: `Priority Keywords: [${topPriority.join(', ')}]`,
//       minMatches: Math.max(1, Math.floor(topPriority.length * 0.4))
//     });
//   }

//   // Strategy 5: Core Product Keywords (Broader Search)
//   if (coreKeywords.length >= 2) {
//     const topCore = coreKeywords.slice(0, 6);
//     strategies.push({
//       level: 5,
//       searchTerms: topCore,
//       query: createFlexibleQuery(topCore),
//       description: `Core Keywords: [${topCore.join(', ')}]`,
//       minMatches: Math.max(1, Math.floor(topCore.length * 0.3))
//     });
//   }

//   // Strategy 6: Fallback - Any significant keywords
//   if (allKeywords.length >= 2) {
//     const fallbackTerms = allKeywords.slice(0, 8);
//     strategies.push({
//       level: 6,
//       searchTerms: fallbackTerms,
//       query: createFlexibleQuery(fallbackTerms),
//       description: `Fallback Search: [${fallbackTerms.join(', ')}]`,
//       minMatches: 1
//     });
//   }

//   return strategies;
// };

// // Create flexible OR-based queries instead of restrictive AND queries
// const createFlexibleQuery = (terms) => {
//   const escapedTerms = terms.map(term => 
//     term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
//   );
  
//   const orConditions = escapedTerms.map(term => ({
//     name: { $regex: `\\b${term}\\b`, $options: 'i' }
//   }));

//   return { $or: orConditions };
// };

// // Enhanced scoring system
// const calculateMatchScore = (baseKeywords, candidateTitle, strategy) => {
//   const candidateKeywords = extractSearchKeywords(candidateTitle);
  
//   let score = 0;
//   let factors = [];

//   // Category match (30% weight) - Most important for product type
//   const categoryMatches = baseKeywords.categories.filter(cat => 
//     candidateKeywords.categories.includes(cat)
//   );
//   if (categoryMatches.length > 0) {
//     score += 30;
//     factors.push(`category_match: ${categoryMatches.join(',')}`);
//   }

//   // Brand match (25% weight) - Very important for exact products
//   const brandMatches = baseKeywords.brands.filter(brand =>
//     candidateKeywords.brands.some(candBrand => 
//       candBrand.includes(brand) || brand.includes(candBrand)
//     )
//   );
//   if (brandMatches.length > 0) {
//     score += 25;
//     factors.push(`brand_match: ${brandMatches.join(',')}`);
//   }

//   // Measurement match (20% weight) - Important for sizing
//   const measurementMatches = baseKeywords.measurements.filter(measurement =>
//     candidateKeywords.measurements.some(candMeasurement =>
//       candMeasurement.includes(measurement) || measurement.includes(candMeasurement)
//     )
//   );
//   if (measurementMatches.length > 0) {
//     score += 20;
//     factors.push(`measurement_match: ${measurementMatches.join(',')}`);
//   }

//   // Core keyword overlap (15% weight)
//   const coreMatches = baseKeywords.coreKeywords.filter(keyword =>
//     candidateKeywords.allKeywords.some(candKeyword =>
//       candKeyword.includes(keyword) || keyword.includes(candKeyword)
//     )
//   );
//   const coreMatchRatio = baseKeywords.coreKeywords.length > 0 ? 
//     coreMatches.length / baseKeywords.coreKeywords.length : 0;
//   score += coreMatchRatio * 15;
//   factors.push(`core_keywords: ${coreMatches.length}/${baseKeywords.coreKeywords.length}`);

//   // Color/Material match (5% weight)
//   const colorMatches = baseKeywords.colors.filter(color =>
//     candidateKeywords.colors.includes(color)
//   );
//   if (colorMatches.length > 0) {
//     score += 5;
//     factors.push(`color_match: ${colorMatches.join(',')}`);
//   }

//   // Material match (5% weight)
//   const materialMatches = baseKeywords.materials.filter(material =>
//     candidateKeywords.materials.includes(material)
//   );
//   if (materialMatches.length > 0) {
//     score += 5;
//     factors.push(`material_match: ${materialMatches.join(',')}`);
//   }

//   // Strategy level bonus (prefer matches from more targeted strategies)
//   const levelBonus = Math.max(0, (7 - strategy.level) / 6) * 10;
//   score += levelBonus;
//   factors.push(`strategy_level: ${strategy.level}`);

//   return {
//     score: Math.round(score * 100) / 100,
//     factors,
//     categoryMatches,
//     brandMatches,
//     measurementMatches,
//     coreMatches,
//     strategyLevel: strategy.level
//   };
// };

// // Fallback to similar product search
// const findSimilarProduct = async (baseProduct, baseStoreId) => {
//   const stores = ['homedepot', "lowe's"];
//   const baseSearchKeywords = extractSearchKeywords(baseProduct.name);
  
//   console.log(`Searching for similar products as fallback...`);

//   // Get available products from other stores
//   const storeProductIds = {};
//   for (const storeId of stores) {
//     if (storeId === baseStoreId) continue; // Only search other stores
//     const inventoryDocs = await Inventory.find({ storeId }).select('productId').lean();
//     storeProductIds[storeId] = inventoryDocs.map(doc => doc.productId);
//     console.log(`Found ${storeProductIds[storeId].length} products in ${storeId} inventory`);
//   }

//   // Create search strategies
//   const searchStrategies = createSearchStrategies(baseSearchKeywords);
//   let allMatches = [];
//   const minScore = 40; // Higher threshold for similar products

//   // Execute search strategies for other stores only
//   for (const strategy of searchStrategies) {
//     console.log(`Trying strategy ${strategy.level}: ${strategy.description}`);
    
//     for (const storeId of stores) {
//       if (storeId === baseStoreId) continue; // Skip base store
      
//       const matchedProducts = await Product.find({
//         $and: [
//           strategy.query,
//           { productId: { $in: storeProductIds[storeId] } },
//           { productId: { $ne: baseProduct.productId } }
//         ]
//       }).limit(20);

//       // Score and filter matches
//       for (const product of matchedProducts) {
//         const inventory = await Inventory.findOne({
//           productId: product.productId,
//           storeId: storeId
//         });

//         if (inventory) {
//           const matchResult = calculateMatchScore(baseSearchKeywords, product.name, strategy);
          
//           if (matchResult.score >= minScore) {
//             allMatches.push({
//               product,
//               inventory,
//               matchScore: matchResult.score,
//               matchDetails: matchResult,
//               strategyLevel: strategy.level,
//               isDifferentStore: true,
//               isExactMatch: false
//             });
//           }
//         }
//       }
//     }

//     // If we have some good matches, we can stop
//     if (allMatches.length >= 5) {
//       break;
//     }
//   }

//   // Sort by quality and return best match
//   allMatches.sort((a, b) => {
//     if (a.strategyLevel !== b.strategyLevel) return a.strategyLevel - b.strategyLevel;
//     return b.matchScore - a.matchScore;
//   });

//   const bestMatch = allMatches[0] || null;
  
//   if (bestMatch) {
//     console.log(`🎯 SIMILAR PRODUCT FOUND:`);
//     console.log(`Store: ${bestMatch.inventory.storeId}`);
//     console.log(`Product: "${bestMatch.product.name.slice(0, 60)}..."`);
//     console.log(`Score: ${bestMatch.matchScore}`);
//   } else {
//     console.log(`❌ NO SIMILAR PRODUCTS FOUND`);
//   }

//   return bestMatch;
// };

// // =====================================================
// // MAIN MATCHING FUNCTION
// // =====================================================

// // Updated main matching function that uses enhanced exact matching
// const findBestMatchingProduct = async (baseProduct, baseStoreId) => {
//   console.log(`\n🔍 SEARCHING FOR MATCHING PRODUCT`);
//   console.log(`Base product: "${baseProduct.name}"`);
//   console.log(`From: ${baseStoreId} | Searching in other stores`);

//   // Step 1: Enhanced exact product search
//   console.log(`\n=== ENHANCED EXACT PRODUCT SEARCH ===`);
//   const exactMatch = await findExactProductInOtherStores(baseProduct, baseStoreId);
  
//   if (exactMatch) {
//     return exactMatch;
//   }
  
//   // Step 2: Fall back to original similar product search
//   console.log(`\n=== FALLBACK TO SIMILAR PRODUCT SEARCH ===`);
//   return await findSimilarProduct(baseProduct, baseStoreId);
// };

// // =====================================================
// // MAIN CONTROLLER FUNCTION
// // =====================================================

// export const getProductDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Step 1: Find base product and inventory
//     const baseProduct = await Product.findOne({ productId: id });
//     const baseInventory = await Inventory.findOne({ productId: id });

//     if (!baseProduct || !baseInventory) {
//       return res.status(404).json({ error: 'Product not found' });
//     }

//     const baseStoreId = baseInventory.storeId;

//     // Step 2: Find exact match or best similar product
//     const bestMatch = await findBestMatchingProduct(baseProduct, baseStoreId);

//     // Step 3: Load images for products
//     const allProductIds = bestMatch 
//       ? [baseProduct.productId, bestMatch.product.productId]
//       : [baseProduct.productId];
    
//     const imageDocs = await Image.find({ productId: { $in: allProductIds } });
//     const imageMap = {};
//     imageDocs.forEach((img) => {
//       if (!imageMap[img.productId]) imageMap[img.productId] = [];
//       imageMap[img.productId].push(img.url);
//     });

//     // Step 4: Build retailers array (base product + best match only)
//     const retailers = [];

//     // Add base product
//     retailers.push({
//       store: baseInventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
//       productTitle: baseProduct.name,
//       price: baseInventory.price,
//       listPrice: baseInventory.listPrice || baseInventory.price,
//       savings: (baseInventory.listPrice || baseInventory.price) - baseInventory.price,
//       isLowest: false,
//       offers: 3,
//       reviewScore: baseInventory.rating || 0,
//       reviewCount: baseInventory.totalReviews || 0,
//       stockStatus: baseInventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
//       url: baseInventory.url,
//       storeLocation: "Niagara Falls #1287",
//       distance: "0.1 mi",
//       delivery: "Delivery in 2-3 Days, Friday, 27 June",
//       matchScore: 100,
//       productId: baseProduct.productId,
//       isBaseProduct: true
//     });

//     // Add best match if found
//     if (bestMatch) {
//       retailers.push({
//         store: bestMatch.inventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
//         productTitle: bestMatch.product.name,
//         price: bestMatch.inventory.price,
//         listPrice: bestMatch.inventory.listPrice || bestMatch.inventory.price,
//         savings: (bestMatch.inventory.listPrice || bestMatch.inventory.price) - bestMatch.inventory.price,
//         isLowest: false,
//         offers: 3,
//         reviewScore: bestMatch.inventory.rating || 0,
//         reviewCount: bestMatch.inventory.totalReviews || 0,
//         stockStatus: bestMatch.inventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
//         url: bestMatch.inventory.url,
//         storeLocation: "Niagara Falls #1287",
//         distance: "0.1 mi",
//         delivery: "Delivery in 2-3 Days, Friday, 27 June",
//         matchScore: bestMatch.matchScore,
//         productId: bestMatch.product.productId,
//         isBaseProduct: false,
//         isDifferentStore: bestMatch.isDifferentStore,
//         matchType: bestMatch.matchType || 'unknown'
//       });
//     }

//     // Step 5: Mark lowest price
//     const lowestPrice = Math.min(...retailers.map(r => r.price));
//     retailers.forEach(r => r.isLowest = r.price === lowestPrice);

//     // Step 6: Extract keywords for specifications
//     const baseSearchKeywords = extractSearchKeywords(baseProduct.name);
//     const baseEssence = extractProductEssence(baseProduct.name);

//     console.log(`\n🏆 FINAL RESULTS:`);
//     console.log(`Total retailers: ${retailers.length}`);
//     console.log(`Best match found: ${bestMatch ? 'Yes' : 'No'}`);
//     if (bestMatch) {
//       console.log(`Best match: "${bestMatch.product.name.slice(0, 50)}..." (Score: ${bestMatch.matchScore})`);
//       console.log(`Match type: ${bestMatch.matchType}`);
//       if (bestMatch.matchDetails) {
//         console.log(`Match details:`, {
//           measurements: bestMatch.matchDetails.measurementMatches || [],
//           materials: bestMatch.matchDetails.materialMatches || [],
//           types: bestMatch.matchDetails.typeMatches || [],
//           features: bestMatch.matchDetails.featureMatches || []
//         });
//       }
//     }
//     console.log(`Lowest price: ${lowestPrice}`);
    
//     // Step 7: Build response
//     res.json({
//       productId: baseProduct.productId,
//       title: baseProduct.name,
//       model: `#${baseProduct.modelNo || 'N/A'}`,
//       images: imageMap[baseProduct.productId] || [],
//       rating: baseInventory.rating || 0,
//       reviewCount: baseInventory.totalReviews || 0,
//       lowestPrice,
//       retailers,
//       specifications: {
//         Model: baseProduct.modelNo || 'N/A',
//         Category: baseSearchKeywords.categories.join(', ') || 'General',
//         Features: baseSearchKeywords.coreKeywords.slice(0, 5).join(', '),
//         Materials: baseEssence.materials.join(', ') || 'N/A',
//         Measurements: baseEssence.measurements.join(', ') || 'N/A',
//         Type: baseEssence.productType.join(', ') || 'N/A',
//         ReturnPolicy: "30 Days Return"
//       },
//       debug: {
//         baseKeywords: baseSearchKeywords,
//         baseEssence: baseEssence,
//         bestMatchFound: !!bestMatch,
//         bestMatchDetails: bestMatch ? {
//           title: bestMatch.product.name.slice(0, 50) + '...',
//           store: bestMatch.inventory.storeId,
//           score: bestMatch.matchScore,
//           isExactMatch: bestMatch.isExactMatch,
//           matchType: bestMatch.matchType,
//           categories: bestMatch.matchDetails?.categoryMatches || [],
//           coreMatches: bestMatch.matchDetails?.coreMatches?.length || 0,
//           measurementMatches: bestMatch.matchDetails?.measurementMatches || [],
//           materialMatches: bestMatch.matchDetails?.materialMatches || [],
//           typeMatches: bestMatch.matchDetails?.typeMatches || [],
//           featureMatches: bestMatch.matchDetails?.featureMatches || [],
//           isDifferentStore: bestMatch.isDifferentStore,
//           strategyLevel: bestMatch.strategyLevel
//         } : null,
//         storeDistribution: retailers.reduce((acc, r) => {
//           acc[r.store] = (acc[r.store] || 0) + 1;
//           return acc;
//         }, {}),
//         searchSummary: {
//           enhancedExactSearchUsed: true,
//           fallbackSearchUsed: bestMatch ? bestMatch.strategyLevel > 1 : false,
//           totalStoresSearched: 2,
//           matchingAlgorithm: bestMatch ? bestMatch.matchType : 'no_match'
//         }
//       }
//     });

//   } catch (err) {
//     console.error('[getProductDetails Error]', err);
//     res.status(500).json({ 
//       error: 'Internal server error',
//       details: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// // =====================================================
// // ADDITIONAL HELPER FUNCTIONS FOR TESTING/DEBUGGING
// // =====================================================

// // Test function to validate the enhanced matching with specific examples
// export const testProductMatching = async (req, res) => {
//   try {
//     const { lowesTitle, homedepotTitle } = req.body;
    
//     if (!lowesTitle || !homedepotTitle) {
//       return res.status(400).json({ 
//         error: 'Please provide both lowesTitle and homedepotTitle in request body' 
//       });
//     }
    
//     console.log("\n🧪 TESTING ENHANCED MATCHING:");
//     console.log(`Lowes: "${lowesTitle}"`);
//     console.log(`Home Depot: "${homedepotTitle}"`);
    
//     const lowesEssence = extractProductEssence(lowesTitle);
//     const homedepotEssence = extractProductEssence(homedepotTitle);
//     const similarity = calculateProductSimilarity(lowesEssence, homedepotTitle);
    
//     const result = {
//       lowesProduct: {
//         title: lowesTitle,
//         normalized: lowesEssence.normalized,
//         essence: lowesEssence.essence,
//         measurements: lowesEssence.measurements,
//         materials: lowesEssence.materials,
//         productType: lowesEssence.productType,
//         features: lowesEssence.features
//       },
//       homedepotProduct: {
//         title: homedepotTitle,
//         normalized: homedepotEssence.normalized,
//         essence: homedepotEssence.essence,
//         measurements: homedepotEssence.measurements,
//         materials: homedepotEssence.materials,
//         productType: homedepotEssence.productType,
//         features: homedepotEssence.features
//       },
//       similarity: {
//         score: similarity.score,
//         matchDetails: similarity.matchDetails,
//         wouldMatch: similarity.score >= 85,
//         matchLevel: similarity.score >= 95 ? 'EXACT' : 
//                    similarity.score >= 85 ? 'VERY_HIGH' :
//                    similarity.score >= 75 ? 'HIGH' :
//                    similarity.score >= 60 ? 'MEDIUM' : 'LOW'
//       }
//     };
    
//     console.log(`\nSimilarity score: ${similarity.score}`);
//     console.log(`Match details:`, similarity.matchDetails);
//     console.log(`Would match: ${result.similarity.wouldMatch ? 'YES' : 'NO'}`);
    
//     res.json(result);
    
//   } catch (err) {
//     console.error('[testProductMatching Error]', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// // Function to analyze and debug product matching for a specific product ID
// export const debugProductMatching = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const baseProduct = await Product.findOne({ productId: id });
//     const baseInventory = await Inventory.findOne({ productId: id });
    
//     if (!baseProduct || !baseInventory) {
//       return res.status(404).json({ error: 'Product not found' });
//     }
    
//     const baseStoreId = baseInventory.storeId;
//     const baseEssence = extractProductEssence(baseProduct.name);
//     const baseKeywords = extractSearchKeywords(baseProduct.name);
    
//     // Find potential matches in other stores for debugging
//     const stores = ['homedepot', "lowe's"];
//     const debugResults = [];
    
//     for (const storeId of stores) {
//       if (storeId === baseStoreId) continue;
      
//       const storeInventory = await Inventory.find({ storeId }).select('productId').lean();
//       const storeProductIds = storeInventory.map(inv => inv.productId).slice(0, 50); // Limit for debugging
      
//       const candidateProducts = await Product.find({
//         productId: { $in: storeProductIds }
//       }).limit(10);
      
//       for (const candidate of candidateProducts) {
//         const similarity = calculateProductSimilarity(baseEssence, candidate.name);
//         const keywordMatch = calculateMatchScore(baseKeywords, candidate.name, { level: 1 });
        
//         debugResults.push({
//           store: storeId,
//           candidate: {
//             productId: candidate.productId,
//             title: candidate.name,
//             essence: extractProductEssence(candidate.name)
//           },
//           scores: {
//             essenceScore: similarity.score,
//             keywordScore: keywordMatch.score,
//             wouldMatchExact: similarity.score >= 85,
//             wouldMatchSimilar: keywordMatch.score >= 40
//           },
//           matchDetails: {
//             essence: similarity.matchDetails,
//             keyword: keywordMatch
//           }
//         });
//       }
//     }
    
//     // Sort by essence score
//     debugResults.sort((a, b) => b.scores.essenceScore - a.scores.essenceScore);
    
//     res.json({
//       baseProduct: {
//         productId: baseProduct.productId,
//         title: baseProduct.name,
//         store: baseStoreId,
//         essence: baseEssence,
//         keywords: baseKeywords
//       },
//       topMatches: debugResults.slice(0, 20),
//       summary: {
//         totalCandidatesAnalyzed: debugResults.length,
//         exactMatches: debugResults.filter(r => r.scores.wouldMatchExact).length,
//         similarMatches: debugResults.filter(r => r.scores.wouldMatchSimilar).length,
//         bestEssenceScore: debugResults.length > 0 ? debugResults[0].scores.essenceScore : 0,
//         bestKeywordScore: Math.max(...debugResults.map(r => r.scores.keywordScore), 0)
//       }
//     });
    
//   } catch (err) {
//     console.error('[debugProductMatching Error]', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
import { Product, Inventory, Image } from '../models/Product.js';
import fetch from 'node-fetch'; // Assuming node-fetch is installed for API calls

// Environment variables - Set API_KEY in .env
const API_BASE_URL = 'https://data.unwrangle.com/api/getter/';
const API_KEY = process.env.UNWRANGLE_API_KEY;

// =====================================================
// PRODUCT TITLE NORMALIZATION USING REGEX
// =====================================================

/**
 * Normalizes product title using regex to clean and standardize for search.
 * @param {string} title - Original product title
 * @returns {string} Normalized title suitable for API search
 */
const normalizeProductTitle = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/\b#\s*\d+\b/g, '') // Remove item numbers like "#12345"
    .replace(/\b\d+\s*#\s*/g, '') // Remove size indicators like "1/2 #"
    .replace(/\bsku\s*[:\-]?\s*\w+/gi, '') // Remove SKU references
    .replace(/\bitem\s*[:\-]?\s*\w+/gi, '') // Remove item references
    .replace(/\b(\d+)\s*\/\s*(\d+)\s*(in|inch|inches|")\b/gi, '$1/$2 inch') // Normalize fractions with spaces
    .replace(/\b(\d+)\s*(in|inch|inches|")\b/gi, '$1 inch')
    .replace(/\b(\d+)\s*(ft|feet|')\b/gi, '$1 ft')
    .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1 x $2')
    .replace(/\b(\d+)\s*[\-\s]*(pack|pc|pcs|piece|pieces)\b/gi, '$1 pack')
    .replace(/\((\d+)[\-\s]*(pack|pc|pcs|piece|pieces)\)/gi, '$1 pack')
    .replace(/\b(two[\-\s]*hole|2[\-\s]*hole)\b/gi, '2 hole')
    .replace(/\b(three[\-\s]*hole|3[\-\s]*hole)\b/gi, '3 hole')
    .replace(/\b(four[\-\s]*hole|4[\-\s]*hole)\b/gi, '4 hole')
    .replace(/\belectrical\s*metallic\s*tube/gi, 'emt')
    .replace(/\bconduit\s*fittings?\b/gi, 'conduit fitting')
    .replace(/\bstrap\s*conduit/gi, 'conduit strap')
    .replace(/\bmetal\s*conduit/gi, 'metal conduit')
    .replace(/\bpvc\s*conduit/gi, 'pvc conduit')
    .replace(/[\s\-:;,./#()]+/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};

// =====================================================
// HELPER: FETCH WITH TIMEOUT
// =====================================================
const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
};

// =====================================================
// THIRD-PARTY API INTEGRATION (with retry + timeout)
// =====================================================

/**
 * Searches the specified store using Unwrangle API (with retries + timeout).
 * @param {string} platform - 'homedepot_search' or 'lowes_search'
 * @param {string} searchTerm - Normalized search term
 * @param {number} page - Page number (default 1)
 * @param {number} retries - Number of retry attempts (default 2)
 * @returns {Promise<array>} Array of product results from API
 */
const searchStoreApi = async (platform, searchTerm, page = 1, retries = 2) => {
  const url = `${API_BASE_URL}?platform=${platform}&search=${encodeURIComponent(
    searchTerm
  )}&page=${page}&api_key=${API_KEY}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {}, 8000);

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      if (!data.success || !data.results) return [];

      return data.results;
    } catch (err) {
      console.error(
        `API attempt ${attempt + 1} failed for "${searchTerm}" (${platform}):`,
        err.message
      );
      if (attempt === retries) {
        console.warn(`Giving up on "${searchTerm}" after ${retries + 1} attempts`);
        return [];
      }
    }
  }
};

/**
 * Finds the first matching product in the other store using direct API search.
 * Falls back to brand + modelNo if full title search fails.
 * @param {object} baseProduct - Base product document from DB
 * @param {string} baseStoreId - 'homedepot' or 'lowes'
 * @returns {Promise<object|null>} First search result adapted as match, or null if none
 */
const findFirstMatchingProduct = async (baseProduct, baseStoreId) => {
  const otherPlatform =
    baseStoreId === 'homedepot' ? 'lowes_search' : 'homedepot_search';
  const otherStoreId = baseStoreId === 'homedepot' ? 'lowes' : 'homedepot';
  const searchTerm = normalizeProductTitle(baseProduct.name);

  // ---------- Primary search (full title) ----------
  let candidates = await searchStoreApi(otherPlatform, searchTerm, 1);

  // ---------- Secondary fallback (brand + modelNo) ----------
  if ((!candidates || candidates.length === 0) && (baseProduct.brand || baseProduct.modelNo)) {
    const fallbackTerm = `${baseProduct.brand || ''} ${baseProduct.modelNo || ''}`.trim();
    if (fallbackTerm) {
      console.log(`Fallback search with brand+model: "${fallbackTerm}"`);
      candidates = await searchStoreApi(otherPlatform, fallbackTerm, 1);
    }
  }

  if (!candidates || candidates.length === 0) {
    console.log(`No search results for "${searchTerm}" or fallback in ${otherPlatform}`);
    return null;
  }

  const firstCandidate = candidates[0];

  return {
    product: {
      productId: firstCandidate.id || firstCandidate.product_id,
      name: firstCandidate.name || firstCandidate.title,
      modelNo: firstCandidate.model_no || firstCandidate.model,
      brand: firstCandidate.brand,
    },
    inventory: {
      storeId: otherStoreId,
      price: firstCandidate.price || firstCandidate.current_price,
      listPrice:
        firstCandidate.list_price ||
        firstCandidate.original_price ||
        firstCandidate.price,
      rating: firstCandidate.rating || 0,
      totalReviews:
        firstCandidate.total_reviews ||
        firstCandidate.review_count ||
        0,
      inventoryQuantity:
        firstCandidate.inventory_quantity || (firstCandidate.in_stock ? 1 : 0),
      url: firstCandidate.url || firstCandidate.product_url,
    },
    matchScore: 100,
    isExactMatch: true,
    matchType: candidates === searchTerm ? 'direct_api_search' : 'fallback_brand_model',
  };
};

// =====================================================
// MAIN CONTROLLER
// =====================================================

/**
 * Controller to get product details and first match from other store via API.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch base product and inventory from DB
    const baseProduct = await Product.findOne({ productId: id });
    const baseInventory = await Inventory.findOne({ productId: id });
    console.log("baseProduct", baseProduct);
    console.log("baseInventory", baseInventory);

    if (!baseProduct || !baseInventory) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const baseStoreId = baseInventory.storeId;

    // Find first match from other store
    const firstMatch = await findFirstMatchingProduct(baseProduct, baseStoreId);

    // Fetch images for base product
    const imageDocs = await Image.find({ productId: id });
    const images = imageDocs.map(img => img.url);

    // Build retailers array
    const retailers = [
      {
        store: baseStoreId === 'homedepot' ? 'Home Depot' : "Lowe's",
        productTitle: baseProduct.name,
        price: baseInventory.price,
        listPrice: baseInventory.listPrice || baseInventory.price,
        savings: ((baseInventory.listPrice || baseInventory.price) - baseInventory.price).toFixed(2),
        isLowest: false,
        offers: 3, // Static or from data
        reviewScore: baseInventory.rating || 0,
        reviewCount: baseInventory.totalReviews || 0,
        stockStatus: baseInventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
        url: baseInventory.url,
        storeLocation: "Niagara Falls #1287", // Static; customize if needed
        distance: "0.1 mi",
        delivery: "Delivery in 2-3 Days, Friday, 27 June", // Update date dynamically if needed
        matchScore: 100,
        productId: baseProduct.productId,
        isBaseProduct: true
      }
    ];

    if (firstMatch) {
      retailers.push({
        store: firstMatch.inventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
        productTitle: firstMatch.product.name,
        price: firstMatch.inventory.price,
        listPrice: firstMatch.inventory.listPrice || firstMatch.inventory.price,
        savings: ((firstMatch.inventory.listPrice || firstMatch.inventory.price) - firstMatch.inventory.price).toFixed(2),
        isLowest: false,
        offers: 3,
        reviewScore: firstMatch.inventory.rating || 0,
        reviewCount: firstMatch.inventory.totalReviews || 0,
        stockStatus: firstMatch.inventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
        url: firstMatch.inventory.url,
        storeLocation: "Niagara Falls #1287",
        distance: "0.1 mi",
        delivery: "Delivery in 2-3 Days, Friday, 27 June",
        matchScore: firstMatch.matchScore,
        productId: firstMatch.product.productId,
        isBaseProduct: false,
        matchType: firstMatch.matchType
      });
    }

    // Calculate lowest price and mark
    const lowestPrice = Math.min(...retailers.map(r => r.price));
    retailers.forEach(r => { r.isLowest = r.price === lowestPrice; });

    // Build response
    res.json({
      productId: baseProduct.productId,
      title: baseProduct.name,
      model: `#${baseProduct.modelNo || 'N/A'}`,
      images,
      rating: baseInventory.rating || 0,
      reviewCount: baseInventory.totalReviews || 0,
      lowestPrice,
      retailers,
      specifications: {
        Model: baseProduct.modelNo || 'N/A',
        Category: baseProduct.category || 'General',
        Brand: baseProduct.brand || 'N/A',
        ReturnPolicy: "30 Days Return"
        // Add more specs if available in DB
      }
    });
  } catch (err) {
    console.error('[getProductDetails Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
