import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { searchHomeDepot } from '../lib/homeDepotApi.js';
import { searchLowes } from '../lib/lowesApi.js';
import { Product, Store, Inventory, Image } from '../models/Product.js';

dotenv.config();

const apiKey = process.env.UNWRANGLE_API_KEY;
const mongoUri = process.env.MONGO_URI;
console.log('MONGODB_URI:', mongoUri);

const searchTerms = ['Bolts'];

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
    images: (item.thumbnails || []).map((url) => ({ url, productId }))
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
      category: item.category || null
    },
    inventory: {
      productId,
      storeId: 'lowes',
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
    images: (item.images || []).map((url) => ({ url, productId }))
  };
};

const insertNormalizedData = async (data, storeName) => {
  const storeId = storeName.toLowerCase().replace(/[^a-z0-9]/gi, '');

  await Store.updateOne(
    { _id: storeId },
    { $set: { name: storeName } },
    { upsert: true }
  );

  for (const { product, inventory, images } of data) {
    await Product.updateOne(
      { productId: product.productId },
      { $set: product },
      { upsert: true }
    );

    await Inventory.updateOne(
      { productId: inventory.productId, storeId: inventory.storeId },
      { $set: inventory },
      { upsert: true }
    );

    for (const image of images) {
      await Image.updateOne(
        { url: image.url },
        { $setOnInsert: image },
        { upsert: true }
      );
    }
  }
};

const run = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Ensure output directory exists
    await mkdir('./output', { recursive: true });

    for (const term of searchTerms) {
      console.log(`🔍 Searching for: ${term}`);
      const [hdResults, lowesResults] = await Promise.all([
        searchHomeDepot(term, apiKey),
        searchLowes(term, apiKey)
      ]);

      const normalizedHD = (hdResults.results || []).map(normalizeHomeDepot);
      const normalizedLowes = (lowesResults.results || []).map(normalizeLowes);

      // Save Home Depot results
      const safeTerm = term.replace(/\s+/g, '_').toLowerCase();
      const hdFilePath = path.join('./output', `${safeTerm}_homedepot.json`);
      await writeFile(hdFilePath, JSON.stringify(normalizedHD, null, 2));
      console.log(`📁 Saved Home Depot results to ${hdFilePath}`);

      // Save Lowe’s results
      const lowesFilePath = path.join('./output', `${safeTerm}_lowes.json`);
      await writeFile(lowesFilePath, JSON.stringify(normalizedLowes, null, 2));
      console.log(`📁 Saved Lowe's results to ${lowesFilePath}`);

      // Insert into MongoDB
      await insertNormalizedData(normalizedHD, 'Home Depot');
      await insertNormalizedData(normalizedLowes, 'Lowe\'s');

      console.log(`✅ Finished importing category: ${term}`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
};

run();



// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// dotenv.config();

// const mongoUri = process.env.MONGO_URI;

// const runFix = async () => {
//   try {
//     await mongoose.connect(mongoUri);
//     const db = mongoose.connection.db;

//     // Delete bad store
//     await db.collection('stores').deleteOne({ _id: "lowe's" });

//     // Insert correct store
//     await db.collection('stores').insertOne({
//       _id: "lowes",
//       name: "Lowe's",
//       createdAt: new Date(),
//       updatedAt: new Date()
//     });

//     // Update inventories
//     const res = await db.collection('inventories').updateMany(
//       { storeId: "lowe's" },
//       { $set: { storeId: "lowes" } }
//     );

//     console.log(`✅ Updated ${res.modifiedCount} inventory records.`);
//   } catch (err) {
//     console.error('❌ Fix failed:', err);
//   } finally {
//     await mongoose.disconnect();
//     console.log('🔌 MongoDB disconnected');
//   }
// };

// runFix();
