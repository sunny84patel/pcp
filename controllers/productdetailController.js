import { Product, Inventory, Image } from '../models/Product.js';

// Enhanced keyword extraction with category detection
const extractSearchKeywords = (title) => {
  const stopWords = ['the', 'a', 'an', 'with', 'for', 'and', 'of', 'to', 'on', 'by', 'pack', 'set', 'kit', 'piece'];
  
  // Category indicators (most important for matching)
  const categoryPatterns = {
    doors: /\b(door|barn\s*door|sliding\s*door|entry\s*door)\b/gi,
    hardware: /\b(hardware|hinge|handle|lock|knob|latch)\b/gi,
    plumbing: /\b(drain|basin|pipe|faucet|toilet|sink|shower)\b/gi,
    electrical: /\b(switch|outlet|wire|cable|light|lamp)\b/gi,
    tools: /\b(drill|saw|hammer|screwdriver|tool)\b/gi,
    paint: /\b(paint|primer|stain|brush|roller)\b/gi,
    flooring: /\b(tile|carpet|wood|laminate|vinyl|floor)\b/gi,
    lighting: /\b(light|fixture|bulb|led|chandelier)\b/gi
  };

  // Brand patterns (high importance)
  const brandPatterns = /\b(dewalt|milwaukee|ryobi|craftsman|kobalt|husky|ridgid|porter\s*cable|black\s*\+\s*decker|stanley|irwin|lennox|carrier|trane|american\s*standard|delta|moen|kohler|pfister|schlage|kwikset|baldwin|yale|august)\b/gi;

  // Normalize title
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[\s\-:;,./#()]+/g, ' ')
    .replace(/\b(\d+)\s*(in|inch|inches|")\b/gi, '$1inch')
    .replace(/\b(\d+)\s*(ft|feet|')\b/gi, '$1ft')
    .replace(/\b(\d+)\s*x\s*(\d+)\b/gi, '$1x$2')
    .replace(/\b(\d+)\s*(pack|pc|pcs|piece|pieces)\b/gi, '$1pack');

  // Extract different types of keywords
  const allWords = normalized
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !stopWords.includes(word))
    .filter((word, index, arr) => arr.indexOf(word) === index);

  // Extract categories
  const categories = [];
  Object.entries(categoryPatterns).forEach(([category, pattern]) => {
    if (pattern.test(title)) {
      categories.push(category);
    }
  });

  // Extract brands
  const brands = [];
  const brandMatches = title.match(brandPatterns) || [];
  brandMatches.forEach(brand => {
    brands.push(brand.toLowerCase().replace(/\s+/g, ''));
  });

  // Extract measurements and specifications
  const measurements = title.match(/\b\d+[\s\-]*(inch|in|"|ft|feet|'|x\d+|pack|pc)\b/gi) || [];
  const colors = title.match(/\b(black|white|brown|gray|grey|silver|gold|bronze|chrome|brass|copper|red|blue|green|yellow|clear|transparent)\b/gi) || [];
  const materials = title.match(/\b(wood|metal|plastic|steel|aluminum|brass|copper|vinyl|leather|fabric|glass|ceramic|stone|concrete)\b/gi) || [];

  // Priority keywords (most important for matching)
  const priorityKeywords = [
    ...brands,
    ...categories,
    ...measurements.map(m => m.toLowerCase().replace(/\s+/g, '')),
    ...colors.map(c => c.toLowerCase()),
    ...materials.map(m => m.toLowerCase())
  ];

  // Core product keywords (excluding common words)
  const coreKeywords = allWords.filter(word => 
    !categories.includes(word) && 
    !brands.includes(word) &&
    !['indoor', 'outdoor', 'standard', 'single', 'double', 'matte', 'finish'].includes(word)
  );

  return {
    allKeywords: allWords,
    priorityKeywords: [...new Set(priorityKeywords)],
    coreKeywords: coreKeywords,
    categories,
    brands,
    measurements: measurements.map(m => m.toLowerCase().replace(/\s+/g, '')),
    colors: colors.map(c => c.toLowerCase()),
    materials: materials.map(m => m.toLowerCase()),
    originalTitle: title,
    normalizedTitle: normalized
  };
};

// Create flexible search strategies
const createSearchStrategies = (searchKeywords) => {
  const strategies = [];
  const { priorityKeywords, categories, brands, measurements, colors, coreKeywords, allKeywords } = searchKeywords;

  // Strategy 1: Brand + Category + Key Measurements (Highest Priority)
  if (brands.length > 0 && categories.length > 0) {
    const keyMeasurements = measurements.slice(0, 2);
    const searchTerms = [...brands, ...categories, ...keyMeasurements];
    strategies.push({
      level: 1,
      searchTerms,
      query: createFlexibleQuery(searchTerms),
      description: `Brand + Category + Measurements: [${searchTerms.join(', ')}]`,
      minMatches: Math.max(2, Math.floor(searchTerms.length * 0.6))
    });
  }

  // Strategy 2: Category + Core Features + Measurements
  if (categories.length > 0) {
    const keyFeatures = coreKeywords.slice(0, 3);
    const keyMeasurements = measurements.slice(0, 2);
    const searchTerms = [...categories, ...keyFeatures, ...keyMeasurements];
    strategies.push({
      level: 2,
      searchTerms,
      query: createFlexibleQuery(searchTerms),
      description: `Category + Features + Measurements: [${searchTerms.join(', ')}]`,
      minMatches: Math.max(2, Math.floor(searchTerms.length * 0.5))
    });
  }

  // Strategy 3: Brand + Core Keywords
  if (brands.length > 0) {
    const keyFeatures = coreKeywords.slice(0, 4);
    const searchTerms = [...brands, ...keyFeatures];
    strategies.push({
      level: 3,
      searchTerms,
      query: createFlexibleQuery(searchTerms),
      description: `Brand + Core Features: [${searchTerms.join(', ')}]`,
      minMatches: Math.max(1, Math.floor(searchTerms.length * 0.4))
    });
  }

  // Strategy 4: Priority Keywords (Most Important Terms)
  if (priorityKeywords.length >= 2) {
    const topPriority = priorityKeywords.slice(0, 5);
    strategies.push({
      level: 4,
      searchTerms: topPriority,
      query: createFlexibleQuery(topPriority),
      description: `Priority Keywords: [${topPriority.join(', ')}]`,
      minMatches: Math.max(1, Math.floor(topPriority.length * 0.4))
    });
  }

  // Strategy 5: Core Product Keywords (Broader Search)
  if (coreKeywords.length >= 2) {
    const topCore = coreKeywords.slice(0, 6);
    strategies.push({
      level: 5,
      searchTerms: topCore,
      query: createFlexibleQuery(topCore),
      description: `Core Keywords: [${topCore.join(', ')}]`,
      minMatches: Math.max(1, Math.floor(topCore.length * 0.3))
    });
  }

  // Strategy 6: Fallback - Any significant keywords
  if (allKeywords.length >= 2) {
    const fallbackTerms = allKeywords.slice(0, 8);
    strategies.push({
      level: 6,
      searchTerms: fallbackTerms,
      query: createFlexibleQuery(fallbackTerms),
      description: `Fallback Search: [${fallbackTerms.join(', ')}]`,
      minMatches: 1
    });
  }

  return strategies;
};

// Create flexible OR-based queries instead of restrictive AND queries
const createFlexibleQuery = (terms) => {
  const escapedTerms = terms.map(term => 
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  
  const orConditions = escapedTerms.map(term => ({
    name: { $regex: `\\b${term}\\b`, $options: 'i' }
  }));

  return { $or: orConditions };
};

// Enhanced scoring system
const calculateMatchScore = (baseKeywords, candidateTitle, strategy) => {
  const candidateKeywords = extractSearchKeywords(candidateTitle);
  
  let score = 0;
  let factors = [];

  // Category match (30% weight) - Most important for product type
  const categoryMatches = baseKeywords.categories.filter(cat => 
    candidateKeywords.categories.includes(cat)
  );
  if (categoryMatches.length > 0) {
    score += 30;
    factors.push(`category_match: ${categoryMatches.join(',')}`);
  }

  // Brand match (25% weight) - Very important for exact products
  const brandMatches = baseKeywords.brands.filter(brand =>
    candidateKeywords.brands.some(candBrand => 
      candBrand.includes(brand) || brand.includes(candBrand)
    )
  );
  if (brandMatches.length > 0) {
    score += 25;
    factors.push(`brand_match: ${brandMatches.join(',')}`);
  }

  // Measurement match (20% weight) - Important for sizing
  const measurementMatches = baseKeywords.measurements.filter(measurement =>
    candidateKeywords.measurements.some(candMeasurement =>
      candMeasurement.includes(measurement) || measurement.includes(candMeasurement)
    )
  );
  if (measurementMatches.length > 0) {
    score += 20;
    factors.push(`measurement_match: ${measurementMatches.join(',')}`);
  }

  // Core keyword overlap (15% weight)
  const coreMatches = baseKeywords.coreKeywords.filter(keyword =>
    candidateKeywords.allKeywords.some(candKeyword =>
      candKeyword.includes(keyword) || keyword.includes(candKeyword)
    )
  );
  const coreMatchRatio = baseKeywords.coreKeywords.length > 0 ? 
    coreMatches.length / baseKeywords.coreKeywords.length : 0;
  score += coreMatchRatio * 15;
  factors.push(`core_keywords: ${coreMatches.length}/${baseKeywords.coreKeywords.length}`);

  // Color/Material match (5% weight)
  const colorMatches = baseKeywords.colors.filter(color =>
    candidateKeywords.colors.includes(color)
  );
  if (colorMatches.length > 0) {
    score += 5;
    factors.push(`color_match: ${colorMatches.join(',')}`);
  }

  // Material match (5% weight)
  const materialMatches = baseKeywords.materials.filter(material =>
    candidateKeywords.materials.includes(material)
  );
  if (materialMatches.length > 0) {
    score += 5;
    factors.push(`material_match: ${materialMatches.join(',')}`);
  }

  // Strategy level bonus (prefer matches from more targeted strategies)
  const levelBonus = Math.max(0, (7 - strategy.level) / 6) * 10;
  score += levelBonus;
  factors.push(`strategy_level: ${strategy.level}`);

  return {
    score: Math.round(score * 100) / 100,
    factors,
    categoryMatches,
    brandMatches,
    measurementMatches,
    coreMatches,
    strategyLevel: strategy.level
  };
};

export const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Step 1: Find base product and inventory
    const baseProduct = await Product.findOne({ productId: id });
    const baseInventory = await Inventory.findOne({ productId: id });

    if (!baseProduct || !baseInventory) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const baseStoreId = baseInventory.storeId;
    const otherStoreId = baseStoreId === 'homedepot' ? "lowe's" : 'homedepot';

    console.log(`\n🔍 PRODUCT MATCHING ANALYSIS`);
    console.log(`Base product: "${baseProduct.name}"`);
    console.log(`From: ${baseStoreId} | Searching in: ${otherStoreId}`);

    // Step 2: Enhanced keyword extraction
    const baseSearchKeywords = extractSearchKeywords(baseProduct.name);
    console.log('\n📝 KEYWORD EXTRACTION:');
    console.log('Categories:', baseSearchKeywords.categories);
    console.log('Brands:', baseSearchKeywords.brands);
    console.log('Measurements:', baseSearchKeywords.measurements);
    console.log('Colors:', baseSearchKeywords.colors);
    console.log('Materials:', baseSearchKeywords.materials);
    console.log('Core Keywords:', baseSearchKeywords.coreKeywords.slice(0, 5));

    // Step 3: Get available products in target store
    const inventoryDocs = await Inventory.find({ storeId: otherStoreId }).select('productId').lean();
    const availableProductIds = inventoryDocs.map(doc => doc.productId);
    console.log(`\n📦 Found ${availableProductIds.length} products in ${otherStoreId} inventory`);

    // Step 4: Create search strategies
    const searchStrategies = createSearchStrategies(baseSearchKeywords);
    let bestMatches = [];
    const minScore = 40; // Lowered threshold for better results

    console.log(`\n🎯 SEARCH STRATEGIES (${searchStrategies.length} total):`);
    searchStrategies.forEach(strategy => {
      console.log(`  Level ${strategy.level}: ${strategy.description}`);
    });

    // Step 5: Execute search strategies
    for (const strategy of searchStrategies) {
      console.log(`\n=== STRATEGY ${strategy.level}: ${strategy.description} ===`);
      
      const matchedProducts = await Product.find({
        $and: [
          strategy.query,
          { productId: { $in: availableProductIds } }
        ]
      }).limit(50); // Increased limit for better coverage

      console.log(`Found ${matchedProducts.length} candidates`);

      // Score and filter matches
      const scoredMatches = [];
      for (const product of matchedProducts) {
        const inventory = await Inventory.findOne({
          productId: product.productId,
          storeId: otherStoreId
        });

        if (inventory) {
          const matchResult = calculateMatchScore(baseSearchKeywords, product.name, strategy);
          
          if (matchResult.score >= minScore) {
            console.log(`✓ "${product.name.slice(0, 60)}..." - Score: ${matchResult.score}`);
            console.log(`  Matches: Categories[${matchResult.categoryMatches.join(',')}] Brands[${matchResult.brandMatches.join(',')}] Core[${matchResult.coreMatches.length}]`);
            
            scoredMatches.push({
              product,
              inventory,
              matchScore: matchResult.score,
              matchDetails: matchResult
            });
          }
        }
      }

      if (scoredMatches.length > 0) {
        scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
        bestMatches = scoredMatches.slice(0, 2); // Take top 2 matches
        console.log(`\n🎉 SUCCESS! Found ${bestMatches.length} good matches from Strategy ${strategy.level}`);
        bestMatches.forEach((match, i) => {
          console.log(`  ${i + 1}. "${match.product.name.slice(0, 50)}..." (Score: ${match.matchScore})`);
        });
        break;
      } else {
        console.log(`❌ No suitable matches at this level`);
      }
    }

    // Step 6: Load images
    const allProductIds = [baseProduct.productId, ...bestMatches.map(m => m.product.productId)];
    const imageDocs = await Image.find({ productId: { $in: allProductIds } });
    const imageMap = {};
    imageDocs.forEach((img) => {
      if (!imageMap[img.productId]) imageMap[img.productId] = [];
      imageMap[img.productId].push(img.url);
    });

    // Step 7: Build retailers array
    const retailers = [];

    // Add base product
    retailers.push({
      store: baseInventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
      productTitle: baseProduct.name,
      price: baseInventory.price,
      listPrice: baseInventory.listPrice || baseInventory.price,
      savings: (baseInventory.listPrice || baseInventory.price) - baseInventory.price,
      isLowest: false,
      offers: 3,
      reviewScore: baseInventory.rating || 0,
      reviewCount: baseInventory.totalReviews || 0,
      stockStatus: baseInventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
      url: baseInventory.url,
      storeLocation: "Niagara Falls #1287",
      distance: "0.1 mi",
      delivery: "Delivery in 2-3 Days, Friday, 27 June",
      matchScore: 100
    });

    // Add matched products
    bestMatches.forEach(match => {
      retailers.push({
        store: match.inventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
        productTitle: match.product.name,
        price: match.inventory.price,
        listPrice: match.inventory.listPrice || match.inventory.price,
        savings: (match.inventory.listPrice || match.inventory.price) - match.inventory.price,
        isLowest: false,
        offers: 3,
        reviewScore: match.inventory.rating || 0,
        reviewCount: match.inventory.totalReviews || 0,
        stockStatus: match.inventory.inventoryQuantity > 0 ? "In stock for Pickup" : "Out of stock",
        url: match.inventory.url,
        storeLocation: "Niagara Falls #1287",
        distance: "0.1 mi",
        delivery: "Delivery in 2-3 Days, Friday, 27 June",
        matchScore: match.matchScore
      });
    });

    // Step 8: Mark lowest price
    const lowestPrice = Math.min(...retailers.map(r => r.price));
    retailers.forEach(r => r.isLowest = r.price === lowestPrice);

    console.log(`\n🏆 FINAL RESULTS:`);
    console.log(`Found ${bestMatches.length} matching products`);
    console.log(`Lowest price: $${lowestPrice}`);
    
    // Step 9: Response
    res.json({
      productId: baseProduct.productId,
      title: baseProduct.name,
      model: `#${baseProduct.modelNo || 'N/A'}`,
      images: imageMap[baseProduct.productId] || [],
      rating: baseInventory.rating || 0,
      reviewCount: baseInventory.totalReviews || 0,
      lowestPrice,
      retailers,
      specifications: {
        Model: baseProduct.modelNo || 'N/A',
        Category: baseSearchKeywords.categories.join(', ') || 'General',
        Features: baseSearchKeywords.coreKeywords.slice(0, 5).join(', '),
        ReturnPolicy: "30 Days Return"
      },
      debug: {
        baseKeywords: baseSearchKeywords,
        searchStrategies: searchStrategies.length,
        totalMatches: bestMatches.length,
        matchDetails: bestMatches.map(m => ({
          title: m.product.name.slice(0, 50) + '...',
          score: m.matchScore,
          categories: m.matchDetails.categoryMatches,
          coreMatches: m.matchDetails.coreMatches.length
        }))
      }
    });

  } catch (err) {
    console.error('[getProductDetails Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};