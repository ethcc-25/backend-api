import axios from 'axios';
import { FluidData, PoolData } from '../types';
import { cache } from '../utils/cache';
import { getChainConfig, getSupportedChainsForProtocol } from '../config/chains';

export class FluidService {
  async getFluidApy(chainName: string): Promise<FluidData> {
    const cacheKey = `fluid-${chainName}`;
    const cached = cache.get<FluidData>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.fluid) {
      throw new Error(`Chain ${chainName} not supported for Fluid`);
    }

    try {
      const data = await this.fetchFluidData(chainName);
      cache.set(cacheKey, data, 300); // Cache for 5 minutes
      return data;
    } catch (error) {
      console.error(`Error fetching Fluid data for ${chainName}:`, error);
      throw error;
    }
  }

  private async fetchFluidData(chainName: string): Promise<FluidData> {
    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.fluid) {
      throw new Error(`Chain ${chainName} not supported for Fluid`);
    }

    try {
      const apiUrl = chainConfig.contracts.fluid.apiUrl;
      const res = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DeFi-APY-Server/1.0'
        }
      });

      // Filter for USDC pools only (fUSDC tokens)
      const pools = res.data.data?.filter((item: any) => item.token?.symbol === 'fUSDC') || [];
      
      const formattedPools: PoolData[] = pools.map((item: any) => {
        const token = item.token;
        return {
          symbol: token.asset.symbol,
          name: token.name,
          apy: Number(token.supplyRate) / 100,
          poolApy: Number(token.supplyRate) / 100,
          rewardsApy: 0,
          tvl: Number(token.totalAssets) / 1e6,
          tokens: [{
            symbol: token.asset.symbol,
            name: token.asset.name
          }],
          chain_id: chainConfig.chainId,
          address: token.address
        };
      });

      return {
        protocolName: 'Fluid',
        pools: formattedPools,
        timestamp: new Date().toISOString(),
        chain_id: chainConfig.chainId
      };
    } catch (error) {
      console.error(`Error fetching Fluid data for ${chainName}:`, error);
      return {
        protocolName: 'Fluid',
        pools: [],
        timestamp: new Date().toISOString(),
        chain_id: chainConfig.chainId
      };
    }
  }

  async getAllChainsData(): Promise<FluidData[]> {
    const supportedChains = getSupportedChainsForProtocol('fluid');
    const results: FluidData[] = [];

    for (const chainName of supportedChains) {
      try {
        const data = await this.getFluidApy(chainName);
        results.push(data);
      } catch (error) {
        console.error(`Error fetching Fluid data for ${chainName}:`, error);
        // Add empty data for failed chains
        const chainConfig = getChainConfig(chainName);
        if (chainConfig) {
          results.push({
            protocolName: 'Fluid',
            pools: [],
            timestamp: new Date().toISOString(),
            chain_id: chainConfig.chainId
          });
        }
      }
    }

    return results;
  }
}