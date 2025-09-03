import express from "express";
import { addToWishlist, removeFromWishlist, getWishlist } from "../controllers/wishlistController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add product to wishlist
router.post("/add", authenticate, addToWishlist);

// Remove product from wishlist
router.delete("/remove/:productId", authenticate, removeFromWishlist);

// Get all wishlist products for logged-in user
router.get("/", authenticate, getWishlist);

export default router;
