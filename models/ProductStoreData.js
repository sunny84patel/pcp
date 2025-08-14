import mongoose from 'mongoose';

const ProductStoreSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  store: { type: String, enum: ['home_depot', 'lowes'], required: true },
  storeProductId: String,
  price: Number,
  originalPrice: Number,
  discount: Number,
  url: String,
  images: [String],
  inStock: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now }
});

ProductStoreSchema.index({ productId: 1, store: 1 });

export default mongoose.model('ProductStoreData', ProductStoreSchema);
