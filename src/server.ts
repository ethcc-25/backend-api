import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import routes from './routes';
import { getSupportedChains } from './config/chains';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'DeFi APY Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      all: '/api/all',
      aave: '/api/aave'
    },
    supportedChains: getSupportedChains()
  });
});

// Swagger documentation
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'DeFi APY API',
      version: '1.0.0',
      description: 'Backend server for fetching APY data from AAVE protocol',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    paths: {
      '/api/all': {
        get: {
          summary: 'Get all protocols data',
          description: 'Returns APY data from all supported protocols across all chains',
          responses: {
            200: {
              description: 'Successful response',
            },
          },
        },
      },
      '/api/aave': {
        get: {
          summary: 'Get AAVE data for all chains',
          description: 'Returns AAVE APY data for all supported chains',
          responses: {
            200: {
              description: 'Successful response',
            },
          },
        },
      },
      '/api/aave/{chain}': {
        get: {
          summary: 'Get AAVE data for specific chain',
          description: 'Returns AAVE APY data for a specific chain',
          parameters: [
            {
              name: 'chain',
              in: 'path',
              required: true,
              description: 'Chain name (ethereum, arbitrum, base)',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            200: {
              description: 'Successful response',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    timestamp: Date.now()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Supported chains: ${getSupportedChains().join(', ')}`);
}); 