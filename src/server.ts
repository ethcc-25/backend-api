import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import profileRoutes from './routes/profile';
import depositRoutes from './routes/deposit';
import withdrawRoutes from './routes/withdraw';
import connectDB from './config/database';
import { cache } from './utils/cache';
import { CronService } from './services/cron.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const cronService = new CronService();

// Custom request logging middleware
const requestLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Simple rate limiting
const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const key = req.ip;
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;
  
  const cacheKey = `rate_limit:${key}`;
  const requests = cache.get<number>(cacheKey) || 0;
  
  if (requests >= maxRequests) {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil(windowMs / 1000)
    });
    return;
  }
  
  cache.set(cacheKey, requests + 1, windowMs / 1000);
  next();
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// Routes
app.use('/api', routes);
app.use('/api/profile', profileRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdraw', withdrawRoutes);


// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Monde API running on port ${PORT}`);
  cronService.start();
  connectDB();
});

export default server; 