import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Routes
import productRoutes from './routes/productRoutes.js';
import productdetailRoutes from './routes/productdetailRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import compareRoutes from './routes/compareRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const isProd = NODE_ENV === 'production';

// ==================
// MongoDB Connection (Reusable in serverless)
// ==================
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    const mongoUri = process.env.MONGO_URI;

    const conn = await mongoose.connect(mongoUri);

    isConnected = conn.connections[0].readyState === 1;
    console.log(`✅ MongoDB Connected [${isProd ? 'Production' : 'Development'}]`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// ==================
// CORS setup (hardcoded)
// ==================
const allowedOrigins = [
  'http://localhost:5173',          // Vite dev
  'http://localhost:3000',          // CRA dev (optional, just in case)
  'https://pcp-pied.vercel.app'     // Production frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS not allowed for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ==================
// Middleware: Ensure DB is connected before handling requests
// ==================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ==================
// Routes
// ==================
app.use('/api', productRoutes);
app.use('/api', productdetailRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', compareRoutes);
app.use('/api', wishlistRoutes);

// ==================
// Local development: run server
// ==================
if (!isProd) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ==================
// Always export app (needed for Vercel serverless)
// ==================
export default app;
