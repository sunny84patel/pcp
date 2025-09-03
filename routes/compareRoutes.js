// routes/compareRoutes.js
import express from "express";
import { compareProducts } from "../controllers/compareController.js";

const router = express.Router();

router.post("/compare", compareProducts);

export default router;
