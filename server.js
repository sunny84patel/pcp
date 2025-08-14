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

// CORS setup
const allowedOrigins = [
  'http://localhost:5000',              // Local frontend
  'https://pcp-pied.vercel.app'         // Deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error(err));

app.use(express.json());

// Routes
app.use('/api', productRoutes);
app.use('/api', productdetailRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);

// Run locally OR export for Vercel
export default app;
