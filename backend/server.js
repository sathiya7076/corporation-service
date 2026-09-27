import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import wasteRoutes from './routes/waste.js';
import trainingRoutes from './routes/training.js';
import facilityRoutes from './routes/facilities.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ================================
   ✅ SECURITY MIDDLEWARE
================================ */

// Helmet
app.use(helmet());

// ✅ CORS (FIXED)
const allowedOrigins = [
  "http://localhost:5173",
  "https://smart-waste-management-for-sustaina-beryl.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ Handle Preflight Requests
app.options('*', cors());

/* ================================
   ✅ RATE LIMITER
================================ */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, try again later.',
});

app.use('/api', limiter);

/* ================================
   ✅ BODY PARSING
================================ */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ================================
   ✅ MONGODB CONNECTION
================================ */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

/* ================================
   ✅ ROUTES
================================ */

app.use('/api/auth', authRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

/* ================================
   ✅ HEALTH CHECK
================================ */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

/* ================================
   ✅ 404 HANDLER
================================ */

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ================================
   ✅ START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});