import { Product, Inventory, Image } from '../models/Product.js';

// Extract exact match query for highest precision
const extractExactMatchQuery = (title) => {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[\s\-:;,./#]+/g, ' ')
    .replace(/\b2 in\b/gi, '2 inch')
    .replace(/\b2-in\b/gi, '2 inch')
    .replace(/\bin\b/gi, 'inch')
    .trim();

  // Try to match the entire normalized title
  return {
    name: { $regex: normalizedTitle.replace(/\s+/g, '.*'), $options: 'i' }
  };
};

// Enhanced fuzzy matching with better keyword extraction
const extractBroaderFuzzyQuery = (title) => {
  const stopWords = ['the', 'a', 'an', 'with', 'for', 'and', 'of', 'to', 'on', 'by', 'pack'];
  
  // Normalize title: replace multiple delimiters with single space, normalize 'in' to 'inch'
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[\s\-:;,./#]+/g, ' ') // Replace delimiters with single space
    .replace(/\b2 in\b/gi, '2 inch') // Normalize '2 in' to '2 inch'
    .replace(/\b2-in\b/gi, '2 inch') // Normalize '2-in' to '2 inch'
    .replace(/\bin\b/gi, 'inch'); // Normalize standalone 'in' to 'inch'

  const words = normalizedTitle
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.includes(word)) // Allow 2-char words like '2'
    .filter(word => !/^\d+$/.test(word) || ['2', '3', '4'].includes(word)); // Allow specific numbers

  console.log('Raw title:', title);
  console.log('Normalized title:', normalizedTitle);
  console.log('Extracted keywords for broader fuzzy search:', words);

  // Use $or for broader matching on product name
  const conditions = words.map(word => ({
    name: { $regex: `\\b${word}\\b`, $options: 'i' } // Use word boundaries
  }));

  return { $or: conditions };
};

// Extract core category/type for fallback matching
const extractCategoryQuery = (title) => {
  const categoryKeywords = [
    'brush', 'paint', 'drill', 'saw', 'hammer', 'screwdriver', 'wrench', 'pliers',
    'light', 'bulb', 'switch', 'outlet', 'wire', 'cable', 'pipe', 'fitting',
    'screw', 'nail', 'bolt', 'nut', 'washer', 'anchor', 'bracket', 'hinge',
    'door', 'window', 'lock', 'handle', 'knob', 'tile', 'flooring', 'carpet',
    'insulation', 'drywall', 'lumber', 'board', 'panel', 'sheet', 'roll',
    'motor', 'pump', 'valve', 'filter', 'hose', 'nozzle', 'sprayer', 'tank'
  ];

  const normalizedTitle = title.toLowerCase();
  const foundCategories = categoryKeywords.filter(keyword => 
    normalizedTitle.includes(keyword)
  );

  if (foundCategories.length > 0) {
    const conditions = foundCategories.map(category => ({
      name: { $regex: `\\b${category}\\b`, $options: 'i' }
    }));
    return { $or: conditions };
  }

  // If no specific categories found, use first few words
  const words = normalizedTitle.split(/\s+/).slice(0, 2);
  const conditions = words.map(word => ({
    name: { $regex: `\\b${word}\\b`, $options: 'i' }
  }));
  return { $or: conditions };
};

// Score matching products based on keyword overlap
const scoreMatch = (originalTitle, candidateTitle) => {
  const extractWords = (title) => {
    return title
      .toLowerCase()
      .replace(/[\s\-:;,./#]+/g, ' ')
      .replace(/\b2 in\b/gi, '2 inch')
      .replace(/\b2-in\b/gi, '2 inch')
      .replace(/\bin\b/gi, 'inch')
      .split(/\s+/)
      .filter(word => word.length > 1);
  };

  const originalWords = extractWords(originalTitle);
  const candidateWords = extractWords(candidateTitle);

  let matchedWords = 0;
  let exactMatches = 0;

  originalWords.forEach(word => {
    const exactMatch = candidateWords.includes(word);
    const partialMatch = candidateWords.some(cWord => 
      cWord.includes(word) || word.includes(cWord)
    );

    if (exactMatch) {
      exactMatches++;
      matchedWords++;
    } else if (partialMatch) {
      matchedWords++;
    }
  });

  return {
    score: matchedWords / originalWords.length,
    matchedWords: matchedWords,
    exactMatches: exactMatches,
    isExactMatch: exactMatches === originalWords.length && originalWords.length === candidateWords.length
  };
};

// Generic fallback to get any products from specified stores
const getFallbackProducts = async (storeIds, productIds, limit = 8, excludeProductIds = []) => {
  console.log(`Getting fallback products from stores: ${storeIds.join(', ')}`);
  
  const fallbackProducts = await Product.find({
    productId: { 
      $in: productIds.slice(0, limit * 3), // Get more to have options
      $nin: excludeProductIds // Exclude already matched products
    }
  }).limit(limit * 2);

  const results = [];
  for (const product of fallbackProducts) {
    for (const storeId of storeIds) {
      const inventory = await Inventory.findOne({
        productId: product.productId,
        storeId: storeId,
      });

      if (inventory && results.length < limit) {
        results.push({ 
          product, 
          inventory, 
          score: 0, 
          matchedWords: 0,
          exactMatches: 0,
          isFallback: true
        });
        break; // Found inventory for this product, move to next product
      }
    }
  }

  return results;
};

// Search for similar products in a specific store
const searchInStore = async (baseProduct, storeId, productIds, excludeProductIds = []) => {
  console.log(`=== Searching in ${storeId} ===`);
  let matchedProducts = [];

  // Step 1: Try exact match first
  console.log('--- Attempting Exact Match ---');
  try {
    const exactQuery = extractExactMatchQuery(baseProduct.name);
    const exactMatches = await Product.find({
      $and: [
        exactQuery,
        { productId: { $in: productIds } },
        { productId: { $nin: excludeProductIds } }
      ]
    }).limit(10);

    console.log(`Exact match found ${exactMatches.length} candidates in ${storeId}`);

    for (const product of exactMatches) {
      try {
        const inventory = await Inventory.findOne({
          productId: product.productId,
          storeId: storeId,
        });

        if (inventory) {
          const matchData = scoreMatch(baseProduct.name, product.name);
          console.log(`${storeId} exact candidate: "${product.name}" - Score: ${matchData.score.toFixed(2)}`);
          
          matchedProducts.push({ 
            product, 
            inventory, 
            ...matchData,
            isExactMatch: true
          });
        }
      } catch (err) {
        console.error(`[Error processing exact match for ${product.productId}]`, err);
      }
    }
  } catch (err) {
    console.error(`[Database Error - Exact match in ${storeId}]`, err);
  }

  // Step 2: Try fuzzy matching if needed
  if (matchedProducts.length < 8) {
    console.log('--- Attempting Fuzzy Match ---');
    try {
      const fuzzyQuery = extractBroaderFuzzyQuery(baseProduct.name);
      const fuzzyMatches = await Product.find({
        $and: [
          fuzzyQuery,
          { productId: { $in: productIds } },
          { productId: { $nin: [...excludeProductIds, ...matchedProducts.map(m => m.product.productId)] } }
        ]
      }).limit(20);

      console.log(`Fuzzy match found ${fuzzyMatches.length} additional candidates in ${storeId}`);

      const minMatchedWords = 2;
      for (const product of fuzzyMatches) {
        try {
          const inventory = await Inventory.findOne({
            productId: product.productId,
            storeId: storeId,
          });

          if (inventory) {
            const matchData = scoreMatch(baseProduct.name, product.name);
            console.log(`${storeId} fuzzy candidate: "${product.name}" - Score: ${matchData.score.toFixed(2)}`);
            
            if (matchData.matchedWords >= minMatchedWords) {
              matchedProducts.push({ 
                product, 
                inventory, 
                ...matchData,
                isExactMatch: false
              });
            }
          }
        } catch (err) {
          console.error(`[Error processing fuzzy match for ${product.productId}]`, err);
        }
      }
    } catch (err) {
      console.error(`[Database Error - Fuzzy match in ${storeId}]`, err);
    }
  }

  // Step 3: Try category-based matching if still needed
  if (matchedProducts.length < 8) {
    console.log('--- Attempting Category Match ---');
    try {
      const categoryQuery = extractCategoryQuery(baseProduct.name);
      const categoryMatches = await Product.find({
        $and: [
          categoryQuery,
          { productId: { $in: productIds } },
          { productId: { $nin: [...excludeProductIds, ...matchedProducts.map(m => m.product.productId)] } }
        ]
      }).limit(15);

      console.log(`Category match found ${categoryMatches.length} additional candidates in ${storeId}`);

      for (const product of categoryMatches) {
        try {
          const inventory = await Inventory.findOne({
            productId: product.productId,
            storeId: storeId,
          });

          if (inventory) {
            const matchData = scoreMatch(baseProduct.name, product.name);
            console.log(`${storeId} category candidate: "${product.name}" - Score: ${matchData.score.toFixed(2)}`);
            
            if (matchData.matchedWords >= 1) {
              matchedProducts.push({ 
                product, 
                inventory, 
                ...matchData,
                isExactMatch: false
              });
            }
          }
        } catch (err) {
          console.error(`[Error processing category match for ${product.productId}]`, err);
        }
      }
    } catch (err) {
      console.error(`[Database Error - Category match in ${storeId}]`, err);
    }
  }

  return matchedProducts;
};

export const getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[getSimilarProducts] Starting search for product ID: ${id}`);

    // Step 1: Find the base product and inventory
    const baseProduct = await Product.findOne({ productId: id }).catch(err => {
      console.error('[Database Error - Product]', err);
      throw new Error('Failed to fetch base product');
    });
    
    const baseInventory = await Inventory.findOne({ productId: id }).catch(err => {
      console.error('[Database Error - Inventory]', err);
      throw new Error('Failed to fetch base inventory');
    });

    console.log('Base product found:', !!baseProduct);
    console.log('Base inventory found:', !!baseInventory);

    if (!baseProduct || !baseInventory) {
      console.log('Product or inventory not found for ID:', id);
      return res.status(404).json({ error: 'Product not found' });
    }

    const baseStoreId = baseInventory.storeId;
    console.log(`Base product: "${baseProduct.name}" from ${baseStoreId}`);
    console.log('Searching for similar products in both stores');

    // Step 2: Get available products from both stores
    const stores = ['homedepot', "lowe's"];
    const storeProductIds = {};
    
    for (const storeId of stores) {
      try {
        const inventoryDocs = await Inventory.find({ storeId }).select('productId').lean();
        storeProductIds[storeId] = inventoryDocs.map(doc => doc.productId);
        console.log(`Found ${storeProductIds[storeId].length} products in ${storeId} inventory`);
      } catch (err) {
        console.error(`[Database Error - ${storeId} inventory lookup]`, err);
        storeProductIds[storeId] = [];
      }
    }

    let allMatchedProducts = [];

    // Step 3: Search in both stores (excluding the original product)
    for (const storeId of stores) {
      if (storeProductIds[storeId].length === 0) {
        console.log(`No products found in ${storeId} inventory`);
        continue;
      }

      const excludeProductIds = [id]; // Always exclude the original product
      const storeMatches = await searchInStore(
        baseProduct, 
        storeId, 
        storeProductIds[storeId], 
        excludeProductIds
      );
      
      console.log(`Found ${storeMatches.length} matches in ${storeId}`);
      allMatchedProducts.push(...storeMatches);
    }

    // Step 4: Add fallback products if we don't have enough matches
    if (allMatchedProducts.length < 8) {
      console.log('=== Using Fallback Products ===');
      try {
        const allProductIds = [...storeProductIds['homedepot'], ...storeProductIds["lowe's"]];
        const excludeProductIds = [id, ...allMatchedProducts.map(m => m.product.productId)];
        
        const fallbackProducts = await getFallbackProducts(
          stores,
          allProductIds,
          8 - allMatchedProducts.length,
          excludeProductIds
        );
        allMatchedProducts.push(...fallbackProducts);
      } catch (err) {
        console.error('[Error in fallback products]', err);
      }
    }

    console.log(`Total matches before sorting: ${allMatchedProducts.length}`);

    // Step 5: Sort all matches by quality
    try {
      allMatchedProducts.sort((a, b) => {
        // Prioritize matches from different stores (cross-store comparisons)
        const aIsDifferentStore = a.inventory.storeId !== baseStoreId;
        const bIsDifferentStore = b.inventory.storeId !== baseStoreId;
        
        if (aIsDifferentStore && !bIsDifferentStore) return -1;
        if (!aIsDifferentStore && bIsDifferentStore) return 1;
        
        // Exact matches first
        if (a.isExactMatch && !b.isExactMatch) return -1;
        if (!a.isExactMatch && b.isExactMatch) return 1;
        
        // Then by exact word matches
        if (a.exactMatches !== b.exactMatches) return b.exactMatches - a.exactMatches;
        
        // Then by total matched words
        if (a.matchedWords !== b.matchedWords) return b.matchedWords - a.matchedWords;
        
        // Finally by score
        return b.score - a.score;
      });

      // Keep top 8 matches
      allMatchedProducts = allMatchedProducts.slice(0, 8);
    } catch (err) {
      console.error('[Error in sorting matches]', err);
      allMatchedProducts = allMatchedProducts.slice(0, 8);
    }

    console.log(`Final ${allMatchedProducts.length} matches:`, allMatchedProducts.map(m => ({
      name: m.product.name,
      store: m.inventory.storeId,
      exactMatches: m.exactMatches || 0,
      matchedWords: m.matchedWords || 0,
      score: (m.score || 0).toFixed(2),
      isExact: m.isExactMatch || false,
      isFallback: m.isFallback || false
    })));

    // Step 6: Fetch images for the matched products
    let imageMap = {};
    try {
      const allProductIds = allMatchedProducts.map(m => m.product.productId);
      const images = await Image.find({ productId: { $in: allProductIds } });
      images.forEach(img => {
        if (!imageMap[img.productId]) imageMap[img.productId] = [];
        imageMap[img.productId].push(img.url);
      });
    } catch (err) {
      console.error('[Error fetching images]', err);
    }

    // Step 7: Build final response
    const results = allMatchedProducts.map(match => {
      try {
        return {
          productId: match.product.productId,
          title: match.product.name || 'Unknown Product',
          model: match.product.modelNo || null,
          store: match.inventory.storeId === 'homedepot' ? 'Home Depot' : "Lowe's",
          price: match.inventory.price || 0,
          listPrice: match.inventory.listPrice || match.inventory.price || 0,
          rating: match.inventory.rating || null,
          thumbnail: imageMap[match.product.productId]?.[0] || null,
          matchScore: Math.round((match.score || 0) * 100),
          matchedWords: match.matchedWords || 0,
          exactMatches: match.exactMatches || 0,
          isExactMatch: match.isExactMatch || false,
          isFallback: match.isFallback || false,
          isDifferentStore: match.inventory.storeId !== baseStoreId
        };
      } catch (err) {
        console.error(`[Error building result for product ${match.product?.productId}]`, err);
        return null;
      }
    }).filter(result => result !== null);

    console.log(`Returning ${results.length} products from both stores to client`);
    
    // Log store distribution
    const storeDistribution = results.reduce((acc, result) => {
      acc[result.store] = (acc[result.store] || 0) + 1;
      return acc;
    }, {});
    console.log('Store distribution:', storeDistribution);
    
    res.json(results);
  } catch (err) {
    console.error('[getSimilarProducts Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};