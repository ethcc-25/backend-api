import { Router } from 'express';
import { AaveService } from '../services/aave.service';
import { getSupportedChains } from '../config/chains';
import { 
  ApiResponse, 
  ChainApiResponse, 
  CustomRequest,
  AllProtocolsData
} from '../types';

const router = Router();
const aaveService = new AaveService();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    supportedChains: getSupportedChains()
  });
});

// Get all protocols data for all chains
router.get('/all', async (req, res) => {
  try {
    const [aaveData] = await Promise.all([
      aaveService.getAllChainsData()
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        aave: aaveData
      },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching all protocols data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    });
  }
});

// Get AAVE data for all chains
router.get('/aave', async (req, res) => {
  try {
    const data = await aaveService.getAllChainsData();
    
    const response: ApiResponse = {
      success: true,
      data: {
        aave: data
      },
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching AAVE data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    });
  }
});

// Get AAVE data for specific chain
router.get('/aave/:chain', async (req: CustomRequest, res) => {
  try {
    const { chain } = req.params;
    const data = await aaveService.getAaveApy(chain);
    
    const response: ChainApiResponse = {
      success: true,
      data: data,
      timestamp: Date.now()
    };

    res.json(response);
  } catch (error) {
    console.error(`Error fetching AAVE data for ${req.params.chain}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    });
  }
});

export default router; 