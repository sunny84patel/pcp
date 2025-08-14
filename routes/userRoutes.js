import express from 'express';
import { updateUser, deleteUser } from '../controllers/userController.js';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';
import { getAllUsers } from '../controllers/userController.js';
const router = express.Router();

// 📝 Update own profile
router.put('/update', authenticate, updateUser);

// ❌ Delete user (admin only)
router.delete('/delete/:id', authenticate, authorizeAdmin, deleteUser);
router.get('/all', authenticate, authorizeAdmin, getAllUsers);
export default router;
