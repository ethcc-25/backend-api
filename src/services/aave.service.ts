import { ethers } from 'ethers';
import axios from 'axios';
import { AaveData, PoolData } from '../types';
import { cache } from '../utils/cache';
import { getChainConfig, getSupportedChainsForProtocol } from '../config/chains';

export class AaveService {
  private static getProvider(chainName: string) {
    const chainConfig = getChainConfig(chainName);
    if (!chainConfig) {
      throw new Error(`Chain ${chainName} not found in configuration`);
    }
    
    const network = ethers.providers.getNetwork(chainConfig.chainId);
    network.name = chainConfig.name.toLowerCase();
    
    const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl, network);
    
    // Add timeout to prevent hanging
    provider.pollingInterval = 10000; // 10 seconds
    
    return provider;
  }

  private static readonly DEFILLAMA_API_URL = 'https://yields.llama.fi/pools';

  async getAaveApy(chainName: string): Promise<AaveData> {
    const cacheKey = `aave-${chainName}`;
    const cached = cache.get<AaveData>(cacheKey);
    if (cached) {
      return cached;
    }

    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.aave) {
      throw new Error(`Chain ${chainName} not supported for AAVE`);
    }

    try {
      const data = await AaveService.getAaveApy(chainName);
      
      const aaveData: AaveData = {
        protocolName: 'AAVE',
        pools: data.pools,
        timestamp: new Date().toISOString(),
        chain_id: chainConfig.chainId
      };

      cache.set(cacheKey, aaveData, 300); // Cache for 5 minutes
      return aaveData;
    } catch (error) {
      console.error(`Error fetching AAVE data for ${chainName}:`, error);
      throw error;
    }
  }

  static async getAaveApy(chainName: string): Promise<AaveData> {
    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.aave) {
      throw new Error(`Chain ${chainName} not supported for AAVE`);
    }

    try {
      const provider = this.getProvider(chainName);
      const abi = new ethers.utils.Interface([
        "function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"
      ]);
      
      const contract = new ethers.Contract(chainConfig.contracts.aave.poolAddress, abi, provider);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Contract call timeout after 15 seconds')), 15000);
      });
      
      const reserveData = await Promise.race([
        contract.getReserveData(chainConfig.contracts.aave.usdcAddress),
        timeoutPromise
      ]);
      
      const poolApy = ethers.utils.formatUnits(reserveData[2].toString(), 25);

      // Get TVL from DefiLlama
      let tvl = 0;
      try {
        const defiLlamaResponse = await axios.get(this.DEFILLAMA_API_URL);
        const chainNameMapping = {
          'ethereum': 'Ethereum',
          'arbitrum': 'Arbitrum',
          'base': 'Base'
        };
        const usdcPool = defiLlamaResponse.data.data.find((pool: any) => 
          pool.chain === chainNameMapping[chainName as keyof typeof chainNameMapping] && 
          pool.project === "aave-v3" && 
          pool.symbol === "USDC"
        );
        tvl = usdcPool?.tvlUsd || 0;
      } catch (error) {
        console.warn('Failed to fetch TVL from DefiLlama:', error);
      }

      const combinedApy = parseFloat(poolApy);
      
      return {
        protocolName: 'AAVE',
        pools: [{
          symbol: 'USDC',
          name: 'USDC',
          poolApy: parseFloat(poolApy),
          rewardsApy: 0,
          combinedApy: combinedApy,
          tvl: tvl,
          tokens: [{
            symbol: 'USDC',
            name: 'USDC',
            address: chainConfig.contracts.aave.usdcAddress
          }],
          chain_id: chainConfig.chainId,
          address: chainConfig.contracts.aave.poolAddress
        }],
        timestamp: new Date().toISOString(),
        chain_id: chainConfig.chainId
      };
    } catch (error) {
      console.error(`Error fetching ${chainName} Aave APY:`, error);
      throw error;
    }
  }

  async getAllChainsData(): Promise<AaveData[]> {
    const supportedChains = getSupportedChainsForProtocol('aave');
    const results: AaveData[] = [];

    for (const chainName of supportedChains) {
      try {
        const data = await this.getAaveApy(chainName);
        results.push(data);
      } catch (error) {
        console.error(`Error fetching AAVE data for ${chainName}:`, error);
        // Continue with other chains even if one fails
      }
    }

    return results;
  }
}