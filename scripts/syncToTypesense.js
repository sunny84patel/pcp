import mongoose from 'mongoose';
import dotenv from 'dotenv';
import typesense from '../utils/typesenseClient.js';
import { Product, Inventory, Image } from '../models/Product.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

// Ensure valid float and fix price/rating edge cases
function cleanProductData(doc) {
  const parsedPrice = parseFloat(doc.price);
  const parsedRating = parseFloat(doc.rating);

  if (isNaN(parsedPrice)) return null;

  return {
    ...doc,
    price: parsedPrice,
    rating: isNaN(parsedRating) ? 0 : parsedRating
  };
}

async function sync() {
  const inventories = await Inventory.find({}).lean();
  const products = await Product.find({}).lean();
  const images = await Image.find({}).lean();

  const productMap = new Map(products.map(p => [p.productId, p]));
  const imageMap = new Map();

  images.forEach(img => {
    if (!imageMap.has(img.productId)) {
      imageMap.set(img.productId, []);
    }
    imageMap.get(img.productId).push(img.url);
  });

  const productIndexDocs = inventories.map(inv => {
    const product = productMap.get(inv.productId);
    if (!product) return null;

    const doc = {
      productId: product.productId,
      name: product.name,
      modelNo: product.modelNo,
      brand: product.brand,
      category: product.category,
      stores: [inv.storeId],
      price: inv.price,
      rating: inv.rating,
      inventoryQuantity: inv.inventoryQuantity,
      imageUrls: imageMap.get(product.productId) || []
    };

    const cleaned = cleanProductData(doc);
    if (!cleaned) {
      console.warn(`⚠️ Skipping productId: ${product.productId} due to invalid price`);
    }
    return cleaned;
  }).filter(Boolean);

  const result = await typesense
    .collections('products')
    .documents()
    .import(productIndexDocs, { action: 'upsert' });

  const failed = result.filter(line => !line.success);
  console.log(`✅ Imported ${productIndexDocs.length - failed.length} products`);
  console.log(`❌ ${failed.length} products failed`);

  process.exit(0);
}

sync();
