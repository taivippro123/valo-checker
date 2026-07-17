import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import skinRoutes from './routes/skins.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './config/swagger.js';
import { initCronScheduler } from './jobs/storeCron.js';
import { loadSkinsCache } from './services/storeService.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/skins', skinRoutes);

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

const PORT = process.env.PORT || 5000;

// Initialize caches and start scheduler
const startServer = async () => {
  try {
    // Prime the skins levels cache on start
    await loadSkinsCache(true);
    
    // Start the background cron checker
    initCronScheduler();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting backend server:', error.message);
    process.exit(1);
  }
};

startServer();
