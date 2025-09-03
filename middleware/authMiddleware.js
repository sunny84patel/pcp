// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize the user object - map userId to id for consistency
    req.user = {
      id: decoded.userId,  // ✅ Map userId to id
      userId: decoded.userId,  // Keep original for compatibility
      role: decoded.role
    };
    console.log("Decoded user:", req.user); // 👀 debug
    next();
  } catch (err) {
    return res.status(403).json({ msg: 'Invalid token' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Admin access only' });
  }
  next();
};