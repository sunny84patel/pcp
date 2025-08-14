// ============================
// ✅ models/Product.js
// ============================
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Product Schema
const ProductSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true, index: true },
  modelNo: { type: String, index: true },
  brand: { type: String, default: null },
  category: { type: String, default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Store Schema (string _id like 'homedepot')
const StoreSchema = new Schema({
  _id: { type: String, required: true }, // e.g., 'lowes', 'homedepot'
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Inventory Schema
const InventorySchema = new Schema({
  productId: { type: String, ref: 'Product', required: true, index: true },
  storeId: { type: String, ref: 'Store', required: true, index: true },
  price: { type: Number, required: true },
  listPrice: { type: Number },
  priceReduced: { type: Number },
  currency: { type: String, required: true },
  inventoryQuantity: { type: Number, default: null },
  rating: { type: Number, default: null },
  totalReviews: { type: Number, default: null },
  url: { type: String, required: true },
  itemNumber: { type: String, default: null },
  vendorNumber: { type: String, default: null },
  upc: { type: String, default: null },
  saleEndDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Image Schema
const ImageSchema = new Schema({
  url: { type: String, required: true, unique: true },
  productId: { type: String, ref: 'Product', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// SearchResult Schema
const SearchResultSchema = new Schema({
  storeId: { type: String, ref: 'Store', required: true, index: true },
  searchQuery: { type: String, required: true, index: true },
  storeNo: { type: String, default: null },
  zipcode: { type: String, default: null },
  page: { type: Number, required: true },
  totalResults: { type: Number, required: true },
  noOfPages: { type: Number, required: true },
  resultCount: { type: Number, required: true },
  inStockOnly: { type: Boolean, default: false },
  maxPages: { type: Number, default: null },
  productIds: [{ type: String, ref: 'Product' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
InventorySchema.index({ productId: 1, storeId: 1 }, { unique: true });
SearchResultSchema.index({ storeId: 1, searchQuery: 1, page: 1 }, { unique: true });
ImageSchema.index({ url: 1, productId: 1 }, { unique: true });

// Models
export const Product = mongoose.model('Product', ProductSchema);
export const Store = mongoose.model('Store', StoreSchema);
export const Inventory = mongoose.model('Inventory', InventorySchema);
export const Image = mongoose.model('Image', ImageSchema);
export const SearchResult = mongoose.model('SearchResult', SearchResultSchema);
