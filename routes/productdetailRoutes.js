import express from 'express';
import { getProductDetails } from '../controllers/productdetailController.js';
import { getSimilarProducts } from '../controllers/similarController.js';
const router = express.Router();

router.get('/products/:id', getProductDetails);
router.get('/products/:id/similar', getSimilarProducts);

export default router;
