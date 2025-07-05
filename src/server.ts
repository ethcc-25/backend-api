import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import profileRoutes from './routes/profile';
import retrieveRoutes from './routes/retrieve';
import bridgeRoutes from './routes/bridge';
import connectDB from './config/database';
import { cache } from './utils/cache';

// Chargement des variables d'environnement depuis .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/retrieve', retrieveRoutes);
app.use('/api/bridge', bridgeRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'DeFi APY Server',
    version: '1.0.0',
    description: 'A comprehensive DeFi APY aggregator supporting AAVE, Fluid, and Morpho protocols across multiple chains, with MongoDB profile management',
    endpoints: {
      health: 'GET /api/health - Health check',
      chains: 'GET /api/chains - Get supported chains',
      bestOpportunity: 'GET /api/best-opportunity - Get the best yield opportunity across all protocols and chains',
      aave: {
        all: 'GET /api/aave - Get AAVE data for all chains',
        chain: 'GET /api/aave/:chain - Get AAVE data for specific chain'
      },
      fluid: {
        all: 'GET /api/fluid - Get Fluid data for all chains',
        chain: 'GET /api/fluid/:chain - Get Fluid data for specific chain'
      },
      morpho: {
        all: 'GET /api/morpho - Get Morpho data for all chains',
        chain: 'GET /api/morpho/:chain - Get Morpho data for specific chain'
      },
      cache: {
        stats: 'GET /api/cache/stats - Get cache statistics',
        clear: 'DELETE /api/cache - Clear cache'
      },
      profile: {
        create: 'POST /api/profile - Create or update profile',
        get: 'GET /api/profile/:user_address - Get profile',
        getAll: 'GET /api/profile - Get all profiles',
        delete: 'DELETE /api/profile/:user_address - Delete profile'
      },
      cctp: {
        info: 'GET /api/retrieve - CCTP API information',
        attestation: 'GET /api/retrieve/attestation/:transactionHash - Retrieve CCTP attestation (waits for completion)',
        status: 'GET /api/retrieve/status/:transactionHash - Get current attestation status (no waiting)',
        attestationPost: 'POST /api/retrieve/attestation - Retrieve CCTP attestation via POST request',
        domains: 'GET /api/retrieve/domains - Get supported CCTP domain mappings',
        test: 'GET /api/retrieve/test/:transactionHash - Test endpoint to see raw Circle API response'
      },
      bridge: {
        info: 'GET /api/bridge - Bridge API information',
        initialize: 'POST /api/bridge/initialize - Initialize bridge request',
        waitConfirmation: 'POST /api/bridge/wait-confirmation - Wait for CCTP confirmation and process deposit',
        status: 'GET /api/bridge/status/:id - Get bridge status by ID',
        statusByTx: 'GET /api/bridge/status/tx/:txHash - Get bridge status by transaction hash',
        history: 'GET /api/bridge/history/:userWallet - Get user bridge history'
      }
    },
    supportedChains: ['ethereum', 'arbitrum', 'base'],
    supportedProtocols: ['aave', 'fluid', 'morpho']
  });
});

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
  console.log(`🚀 DeFi APY Server running on port ${PORT}`);
  
  // Connect to MongoDB after server starts
  console.log('Connecting to MongoDB...');
  connectDB();
  
  console.log(`📡 API documentation available at http://0.0.0.0:${PORT}/`);
  console.log(`📊 MongoDB profiles API available at http://0.0.0.0:${PORT}/api/profile`);
});

export default server; 