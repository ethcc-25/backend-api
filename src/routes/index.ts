import { Router } from 'express';
import { AaveService } from '../services/aave.service';
import { FluidService } from '../services/fluid.service';
import { MorphoService } from '../services/morpho.service';
import { ApiResponse, AllProtocolsData, SupportedProtocol } from '../types';
import { getSupportedChains, getSupportedChainsForProtocol, getChainById } from '../config/chains';
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
  const { protocol } = req.query;
  
  let chains: string[];
  if (protocol && typeof protocol === 'string') {
    // Get chains for specific protocol
    if (['aave', 'fluid', 'morpho'].includes(protocol)) {
      chains = getSupportedChainsForProtocol(protocol as 'aave' | 'fluid' | 'morpho');
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid protocol. Supported protocols: aave, fluid, morpho',
        timestamp: new Date().toISOString()
      });
      return;
    }
  } else {
    // Get all chains
    chains = getSupportedChains();
  }
  
  const response: ApiResponse<{ chains: string[], byProtocol?: any }> = {
    success: true,
    data: {
      chains,
      byProtocol: !protocol ? {
        aave: getSupportedChainsForProtocol('aave'),
        fluid: getSupportedChainsForProtocol('fluid'),
        morpho: getSupportedChainsForProtocol('morpho')
      } : undefined
    },
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

// Get all protocols data for all chains
router.get('/best-opportunity', async (req, res) => {
  try {
    const [aaveData, fluidData, morphoData] = await Promise.all([
      aaveService.getAllChainsData(),
      fluidService.getAllChainsData(),
      morphoService.getAllChainsData()
    ]);

    // Flatten all pools from all protocols and chains
    const allPools: Array<{
      protocol: SupportedProtocol;
      chainId: number;
      pool: any;
    }> = [];

    // Add AAVE pools
    aaveData.forEach(chainData => {
      chainData.pools.forEach(pool => {
        allPools.push({
          protocol: SupportedProtocol.AAVE,
          chainId: chainData.chain_id,
          pool
        });
      });
    });

    // Add Fluid pools
    fluidData.forEach(chainData => {
      chainData.pools.forEach(pool => {
        allPools.push({
          protocol: SupportedProtocol.FLUID,
          chainId: chainData.chain_id,
          pool
        });
      });
    });

    // Add Morpho pools
    morphoData.forEach(chainData => {
      chainData.pools.forEach(pool => {
        allPools.push({
          protocol: SupportedProtocol.MORPHO,
          chainId: chainData.chain_id,
          pool
        });
      });
    });

    console.log(allPools);

    // Find the best opportunity (highest combinedApy)
    let bestOpportunity = null;
    let maxApy = 0;

    allPools.forEach(({ protocol, chainId, pool }) => {
      if (pool.apy > maxApy) {
        maxApy = pool.apy;
        bestOpportunity = {
          protocol,
          chainId,
          apy: pool.apy,
          poolApy: pool.poolApy,
          rewardsApy: pool.rewardsApy,
          tvl: pool.tvl,
          poolName: pool.name,
          poolAddress: pool.address,
          symbol: pool.symbol,
          tokens: pool.tokens
        };
      }
    });

    const response: ApiResponse<typeof bestOpportunity> = {
      success: true,
      data: bestOpportunity,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching best opportunity:', error);
    const response: ApiResponse<never> = {
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