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

// Get all protocols data for all chains
router.get('/best-opportunity', async (req, res) => {
  try {
    const { userAddress } = req.query;

    // If userAddress is provided, check for active position first
    if (userAddress && typeof userAddress === 'string') {
      try {
        // First check if user has an active position on any chain
        const { WithdrawService } = require('../services/withdraw.service');
        const withdrawService = new WithdrawService();
        
        const activePosition = await withdrawService.checkUserPosition(userAddress);
        
        if (activePosition) {
          // User has an active position, return it with current APY data
          const { position, chainDomain } = activePosition;
          
          // Determine protocol name and chain from position data
          const protocolName = getProtocolNameFromPool(position.pool);
          const chainName = getChainNameFromDomain(chainDomain);
          
          // Get current APY data for the user's active position
          let currentApy = 0;
          let poolData = null;
          
          try {
            // Fetch current data based on protocol and chain from active position
            let protocolData = null;
            
            switch (protocolName.toLowerCase()) {
              case 'aave':
                protocolData = await aaveService.getAaveApy(chainName);
                break;
              case 'fluid':
                protocolData = await fluidService.getFluidApy(chainName);
                break;
              case 'morpho':
                protocolData = await morphoService.getMorphoApy(chainName);
                break;
            }
            
            if (protocolData && protocolData.pools.length > 0) {
              // Find the specific pool by vault address
              const pool = protocolData.pools.find(p => 
                p.address?.toLowerCase() === position.vault.toLowerCase()
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
            console.warn(`Failed to fetch current APY for user active position: ${error}`);
            // Use a default APY if we can't fetch current data
            currentApy = 1.0; // 1% default
          }
          
          // Convert amountUsdc from wei to readable format
          const amountUsdc = (parseFloat(position.amountUsdc) / 1e6).toFixed(6);
          
          const activePositionOpportunity = {
            protocol: getProtocolEnumFromPool(position.pool),
            chainId: getChainIdFromDomain(chainDomain),
            apy: currentApy,
            poolApy: poolData?.poolApy || currentApy,
            rewardsApy: poolData?.rewardsApy || 0,
            tvl: poolData?.tvl || 0,
            poolName: poolData?.name || `${protocolName} Pool`,
            poolAddress: position.vault,
            symbol: poolData?.symbol || 'USDC',
            tokens: poolData?.tokens || [{ symbol: 'USDC', name: 'USD Coin' }],
            isActivePosition: true,
            positionDetails: {
              amountUsdc: amountUsdc,
              shares: position.shares,
              positionId: position.positionId,
              pool: position.pool,
              user: position.user,
              vault: position.vault,
              chainDomain: chainDomain,
              chainName: chainName,
              protocolName: protocolName
            }
          };
          
          const response: ApiResponse<typeof activePositionOpportunity> = {
            success: true,
            data: activePositionOpportunity,
            timestamp: new Date().toISOString()
          };
          
          res.json(response);
          return;
        }
        
        // No active position found, check for stored profile positions (fallback)
        const userProfile = await Profile.findOne({ user_address: userAddress });
        
        if (userProfile && userProfile.positions.length > 0) {
          // User has stored positions but no active position, return the first stored one with dynamic APY
          const position = userProfile.positions[0];
          
          // Get current APY data for the user's stored position
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
            console.warn(`Failed to fetch current APY for user stored position: ${error}`);
            // Continue with stored APY
          }
          
          const userStoredOpportunity = {
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
            isStoredPosition: true
          };
          
          const response: ApiResponse<typeof userStoredOpportunity> = {
            success: true,
            data: userStoredOpportunity,
            timestamp: new Date().toISOString()
          };
          
          res.json(response);
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch user position/profile, falling back to best opportunity:', error);
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

/**
 * Helper function to get protocol name from pool ID
 */
function getProtocolNameFromPool(poolId: number): string {
  switch (poolId) {
    case 1: return 'AAVE';
    case 2: return 'Morpho';
    case 3: return 'Fluid';
    default: return `Unknown`;
  }
}

/**
 * Helper function to get protocol enum from pool ID
 */
function getProtocolEnumFromPool(poolId: number): number {
  return poolId; // Pool ID is the same as protocol enum
}

/**
 * Helper function to get chain name from domain ID
 */
function getChainNameFromDomain(domain: number): string {
  switch (domain) {
    case 0: return 'ethereum';
    case 2: return 'optimism';
    case 3: return 'arbitrum';
    case 6: return 'base';
    case 14: return 'world';
    default: return 'unknown';
  }
}

/**
 * Helper function to get chain ID from domain ID
 */
function getChainIdFromDomain(domain: number): number {
  switch (domain) {
    case 0: return 1;     // Ethereum
    case 2: return 10;    // Optimism
    case 3: return 42161; // Arbitrum
    case 6: return 8453;  // Base
    case 14: return 480;  // World
    default: return 0;
  }
}

export default router; 