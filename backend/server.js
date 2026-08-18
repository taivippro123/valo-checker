import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import skinRoutes from './routes/skins.js';
import storeRoutes from './routes/store.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/user.js';
import contactRoutes from './routes/contact.js';
import surveyRoutes from './routes/survey.js';
import shareRoutes from './routes/share.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './config/swagger.js';
import { loadSkinsCache } from './services/storeService.js';
import { startAdminAutomation } from './services/adminRuntimeService.js';
import { startShareStatsFlusher } from './services/shareStatsService.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Backend chạy sau nginx/Cloudflare trên VPS. Không khai báo trust proxy thì
// express-rate-limit chỉ thấy IP của proxy, dồn toàn bộ user vào chung một
// bucket giới hạn -> vài người dùng là cả site bị chặn.
// Đặt 0 nếu chạy trực tiếp không qua proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Middleware
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Ngrok-Skip-Browser-Warning'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Ngrok-Skip-Browser-Warning');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});
// Đặt trước express.json() toàn cục: router share tự khai báo limit 1mb
// vì payload storefront (kèm bundle) có thể vượt mức mặc định 100kb.
app.use('/api/share', shareRoutes);

app.use(express.json());

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/survey', surveyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Valorant Store Checker API is active.' });
});

// Custom error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 4000;

// Initialize caches
const startServer = async () => {
  try {
    await loadSkinsCache(true);
    await startAdminAutomation();
    startShareStatsFlusher();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting backend server:', error.message);
    process.exit(1);
  }
};

startServer();
