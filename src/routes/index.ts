import { Router, Request, Response } from 'express';
import { AaveService } from '../services/aave.service';
import { FluidService } from '../services/fluid.service';
import { MorphoService } from '../services/morpho.service';
import { ApiResponse, AllProtocolsData } from '../types';
import { getSupportedChains } from '../config/chains';
import { cache } from '../utils/cache';

const router: Router = Router();

// Service instances
const aaveService = new AaveService();
const fluidService = new FluidService();
const morphoService = new MorphoService();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Get supported chains
router.get('/chains', (req, res) => {
  const response: ApiResponse<string[]> = {
    success: true,
    data: getSupportedChains(),
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

// Get all protocols data for all chains
router.get('/protocols', async (req, res) => {
  try {
    const [aaveData, fluidData, morphoData] = await Promise.all([
      aaveService.getAllChainsData(),
      fluidService.getAllChainsData(),
      morphoService.getAllChainsData()
    ]);

    const allData: AllProtocolsData = {
      aave: aaveData,
      fluid: fluidData,
      morpho: morphoData,
      timestamp: new Date().toISOString()
    };

    const response: ApiResponse<AllProtocolsData> = {
      success: true,
      data: allData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching all protocols data:', error);
    const response: ApiResponse<AllProtocolsData> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get AAVE data for all chains
router.get('/aave', async (req, res) => {
  try {
    const data = await aaveService.getAllChainsData();
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching AAVE data:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get AAVE data for specific chain
router.get('/aave/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const data = await aaveService.getAaveApy(chain);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error(`Error fetching AAVE data for ${req.params.chain}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get Fluid data for all chains
router.get('/fluid', async (req, res) => {
  try {
    const data = await fluidService.getAllChainsData();
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching Fluid data:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get Fluid data for specific chain
router.get('/fluid/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const data = await fluidService.getFluidApy(chain);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error(`Error fetching Fluid data for ${req.params.chain}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get Morpho data for all chains
router.get('/morpho', async (req, res) => {
  try {
    const data = await morphoService.getAllChainsData();
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching Morpho data:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get Morpho data for specific chain
router.get('/morpho/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const data = await morphoService.getMorphoApy(chain);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    res.json(response);
  } catch (error) {
    console.error(`Error fetching Morpho data for ${req.params.chain}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    res.status(500).json(response);
  }
});

// Get cache statistics
router.get('/cache/stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

// Clear cache
router.delete('/cache', (req, res) => {
  cache.clear();
  res.json({
    success: true,
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
});

export default router; 