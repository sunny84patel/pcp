// models/Wishlist.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const WishlistSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  products: [{ type: String, ref: "Product" }], // productId (string, not ObjectId)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Wishlist = mongoose.model("Wishlist", WishlistSchema);
