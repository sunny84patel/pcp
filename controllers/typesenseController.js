import typesense from '../utils/typesenseClient.js';
import { Product, Inventory, Image } from '../models/Product.js';

export const unifiedProductSearch = async (req, res) => {
    const { query, stores, page = 1, limit = 20, inStockOnly = false } = req.query;

    if (!query) return res.status(400).json({ error: 'Query is required' });

    const filters = [];
    const storeMap = {
        'lowes': "lowe's",
        "lowe's": "lowe's",
        'homedepot': 'homedepot',
        'home depot': 'homedepot'
    };

    let storeIds;
    if (stores) {
        storeIds = stores.split(',').map(s => storeMap[s.trim().toLowerCase()] || s.trim().toLowerCase());
        filters.push(`stores:=[${storeIds.join(',')}]`);
    }

    if (inStockOnly === 'true' || inStockOnly === true) {
        filters.push('inventoryQuantity:>0');
    }

    const filterBy = filters.join(' && ');
    const isNumericQuery = /^\d+$/.test(query.trim());

    // First try Typesense
    try {
        const result = await typesense.collections('products').documents().search({
            q: query,
            query_by: 'name,modelNo,brand,category',
            filter_by: filterBy,
            per_page: Number(limit) + 1,
            page: Number(page)
        });

        const hasNextPage = result.hits.length > limit;
        const limitedHits = hasNextPage ? result.hits.slice(0, limit) : result.hits;
        const results = limitedHits.map(hit => hit.document);

        if (results.length > 0) {
            return res.json({
                results,
                pagination: {
                    currentPage: Number(page),
                    hasNextPage,
                    hasPreviousPage: Number(page) > 1
                },
                source: 'typesense'
            });
        } else {
            console.warn('⚠️ No results from Typesense, falling back to MongoDB');
        }
    } catch (err) {
        console.error('❌ Typesense error:', err);
    }

    // Fallback to MongoDB
    try {
        const inventoryQuery = {};
        if (storeIds && storeIds.length > 0) {
            inventoryQuery.storeId = { $in: storeIds };
        }
        if (inStockOnly === 'true' || inStockOnly === true) {
            inventoryQuery.inventoryQuantity = { $gt: 0 };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const matchingProducts = await Inventory.aggregate([
            { $match: inventoryQuery },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: 'productId',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $or: [
                        { 'product.name': { $regex: query, $options: 'i' } },
                        { 'product.modelNo': { $regex: query, $options: 'i' } },
                        ...(isNumericQuery ? [{ productId: query.trim() }] : [])
                    ]
                }
            },
            {
                $group: {
                    _id: '$productId',
                    productId: { $first: '$productId' },
                    name: { $first: '$product.name' },
                    modelNo: { $first: '$product.modelNo' },
                    brand: { $first: '$product.brand' },
                    category: { $first: '$product.category' },
                    stores: {
                        $push: {
                            storeId: '$storeId',
                            price: '$price',
                            currency: '$currency',
                            inventoryQuantity: '$inventoryQuantity',
                            rating: '$rating',
                            totalReviews: '$totalReviews',
                            url: '$url'
                        }
                    }
                }
            },
            { $sort: { name: 1 } },
            { $skip: skip },
            { $limit: Number(limit) + 1 }
        ]);

        const hasNextPage = matchingProducts.length > limit;
        const limitedProducts = hasNextPage ? matchingProducts.slice(0, limit) : matchingProducts;

        const productIds = limitedProducts.map(p => p.productId);
        const images = await Image.find({ productId: { $in: productIds } }).lean();

        const results = limitedProducts.map(product => {
            const productImages = images
                .filter(img => img.productId === product.productId)
                .map(img => img.url);

            return {
                productId: product.productId,
                name: product.name || 'Unknown Product',
                modelNo: product.modelNo || '',
                brand: product.brand || '',
                category: product.category || '',
                stores: product.stores.map(store => ({
                    ...store,
                    images: productImages
                }))
            };
        });

        return res.json({
            results,
            pagination: {
                currentPage: Number(page),
                hasNextPage
            },
            source: 'mongodb'
        });
    } catch (err) {
        console.error('❌ MongoDB fallback failed:', err);
        return res.status(500).json({ error: 'Search failed from both sources' });
    }
};
