import { Router } from 'express';
import { AaveService } from '../services/aave.service';
import { FluidService } from '../services/fluid.service';
import { MorphoService } from '../services/morpho.service';
import { ApiResponse, AllProtocolsData, SupportedProtocol } from '../types';
import { getSupportedChains, getSupportedChainsForProtocol, getChainById } from '../config/chains';
import { cache } from '../utils/cache';
import Profile from '../models/Profile';

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
    const { userAddress } = req.query;

    // If userAddress is provided, check for existing positions
    if (userAddress && typeof userAddress === 'string') {
      try {
        const userProfile = await Profile.findOne({ user_address: userAddress });
        
        if (userProfile && userProfile.positions.length > 0) {
          // User has existing positions, return the first one with dynamic APY
          const position = userProfile.positions[0];
          
          // Get current APY data for the user's position
          let currentApy = position.apy; // fallback to stored APY
          let poolData = null;
          
          try {
            // Fetch current data based on protocol and chain
            let protocolData = null;
            
            switch (position.protocol.toLowerCase()) {
              case 'aave':
                protocolData = await aaveService.getAaveApy(position.chain);
                break;
              case 'fluid':
                protocolData = await fluidService.getFluidApy(position.chain);
                break;
              case 'morpho':
                protocolData = await morphoService.getMorphoApy(position.chain);
                break;
            }
            
            if (protocolData && protocolData.pools.length > 0) {
              // Find the specific pool by address
              const pool = protocolData.pools.find(p => 
                p.address?.toLowerCase() === position.poolAddress.toLowerCase()
              );
              
              if (pool) {
                currentApy = pool.apy;
                poolData = pool;
              } else {
                // If specific pool not found, use the first pool from the protocol
                currentApy = protocolData.pools[0].apy;
                poolData = protocolData.pools[0];
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch current APY for user position: ${error}`);
            // Continue with stored APY
          }
          
          const userOpportunity = {
            protocol: position.protocol,
            chainId: poolData?.chain_id || 0,
            apy: currentApy,
            poolApy: poolData?.poolApy || currentApy,
            rewardsApy: poolData?.rewardsApy || 0,
            tvl: poolData?.tvl || 0,
            poolName: poolData?.name || `${position.protocol} Pool`,
            poolAddress: position.poolAddress,
            symbol: poolData?.symbol || 'USDC',
            tokens: poolData?.tokens || [{ symbol: 'USDC', name: 'USD Coin' }],
            isUserPosition: true
          };
          
          const response: ApiResponse<typeof userOpportunity> = {
            success: true,
            data: userOpportunity,
            timestamp: new Date().toISOString()
          };

          
          res.json(response);
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch user profile, falling back to best opportunity:', error);
        // Continue to best opportunity logic
      }
    }

    // No user address provided or no existing positions, return best opportunity
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

export default router; 