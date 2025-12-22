// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ msg: 'Authentication required.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ msg: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];
  if (!token) {
    return res.status(401).json({ msg: 'No token provided.' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured');
      return res.status(500).json({ msg: 'Server configuration error.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate token payload
    if (!decoded.userId) {
      return res.status(403).json({ msg: 'Invalid token payload.' });
    }

    // Normalize the user object - map userId to id for consistency
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role || 'user'
    };
    
    if (!isProd) {
      console.log("Decoded user:", req.user.id);
    }
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Session expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ msg: 'Invalid token.' });
    }
    return res.status(403).json({ msg: 'Authentication failed.' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Admin access required.' });
  }
  next();
};