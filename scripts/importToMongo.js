import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import path from 'path';
import { Product, Store, Inventory, Image } from '../models/Product.js';

dotenv.config();
const mongoUri = process.env.MONGO_URI;

// ✅ Index management after image insert
const ensureImageIndex = async () => {
    try {
        const indexes = await Image.collection.indexes();

        for (const idx of indexes) {
            const isUrlOnly = JSON.stringify(idx.key) === JSON.stringify({ url: 1 });
            const isUnique = idx.unique === true;
            if (isUrlOnly && isUnique) {
                console.log(`⚠️ Dropping old unique index on url (name: ${idx.name})...`);
                await Image.collection.dropIndex(idx.name);
            }
        }

        const hasUrlProductIndex = indexes.find((idx) =>
            JSON.stringify(idx.key) === JSON.stringify({ url: 1, productId: 1 })
        );

        if (!hasUrlProductIndex) {
            console.log('📌 Creating unique index on { url, productId }...');
            await Image.collection.createIndex({ url: 1, productId: 1 }, { unique: true });
        } else {
            console.log('✅ Index on { url, productId } already exists.');
        }
    } catch (err) {
        console.error('❌ Index creation error:', err.message);
    }
};

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

export const insertNormalizedData = async (data, storeName) => {
    const storeId = storeName.toLowerCase().replace(/\s+/g, '');
    console.log("storeId:", storeId);

    await Store.updateOne(
        { _id: storeId },
        { $setOnInsert: { name: storeName } },
        { upsert: true }
    );

    const productOps = [];
    const inventoryOps = [];
    const imageOps = [];

    for (const { product, inventory, images } of data) {
        productOps.push({
            updateOne: {
                filter: { productId: product.productId },
                update: { $set: product },
                upsert: true
            }
        });

        inventoryOps.push({
            updateOne: {
                filter: { productId: inventory.productId, storeId },
                update: { $set: inventory },
                upsert: true
            }
        });

        for (const image of images) {
            if (!image.url || !image.productId) {
                console.warn(`⚠️ Skipping invalid image: ${JSON.stringify(image)}`);
                continue;
            }

            imageOps.push({
                updateOne: {
                    filter: { url: image.url, productId: image.productId },
                    update: { $set: image },
                    upsert: true
                }
            });
        }
    }

    if (productOps.length) {
        console.log(`🛒 Inserting ${productOps.length} products...`);
        await Product.bulkWrite(productOps);
    }

    if (inventoryOps.length) {
        console.log(`🏬 Inserting ${inventoryOps.length} inventories...`);
        await Inventory.bulkWrite(inventoryOps);
    }

    if (imageOps.length) {
        console.log(`🖼️ Inserting ${imageOps.length} images...`);
        await Image.bulkWrite(imageOps);

        // ✅ Create index AFTER images collection is created
        await ensureImageIndex();
    }

    console.log(`✅ Inserted for ${storeName}: ${productOps.length} products, ${inventoryOps.length} inventories, ${imageOps.length} images.`);
};

const run = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const searchTerms = ['Ceiling','Dinning', 'Electrical', 'Hardware', 'Outdoor', 'Plumbing']; // Add more if needed

        for (const term of searchTerms) {
            const safeTerm = term.replace(/\s+/g, '_').toLowerCase();
            const hdFile = path.join('./output', `${safeTerm}_homedepot_raw.json`);
            const lowesFile = path.join('./output', `${safeTerm}_lowes_raw.json`);

            const hdRaw = JSON.parse(await readFile(hdFile, 'utf8'));
            const lowesRaw = JSON.parse(await readFile(lowesFile, 'utf8'));

            const hdNormalized = (hdRaw.results || []).map(normalizeHomeDepot);
            const lowesNormalized = (lowesRaw.results || []).map(normalizeLowes);

            await insertNormalizedData(hdNormalized, 'Home Depot');
            await insertNormalizedData(lowesNormalized, "Lowe's");
        }

        console.log('🎉 All raw data normalized and inserted into MongoDB.');
    } catch (err) {
        console.error('❌ Import error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 MongoDB disconnected');
    }
};

run();
