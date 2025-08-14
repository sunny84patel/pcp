import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Routes
import productRoutes from './routes/productRoutes.js';
import productdetailRoutes from './routes/productdetailRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ==================
// MongoDB Connection (Reusable in serverless)
// ==================
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    isConnected = conn.connections[0].readyState === 1;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// ==================
// CORS setup
// ==================
const allowedOrigins = [
  'http://localhost:3000',             // Local frontend
  'https://pcp-pied.vercel.app'        // Deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// ==================
// Export for Vercel or run locally
// ==================

export default app;
