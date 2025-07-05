import { MorphoData, PoolData } from '../types';
import { cache } from '../utils/cache';
import { getChainConfig, getSupportedChainsForProtocol } from '../config/chains';
import axios from 'axios';

export class MorphoService {
  private static readonly MORPHO_SUBGRAPH_URL = 'https://api.morpho.org/graphql';

  async getMorphoApy(chainName: string): Promise<MorphoData> {
    const cacheKey = `morpho-${chainName}`;
    const cached = cache.get<MorphoData>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.morpho) {
      throw new Error(`Chain ${chainName} not supported for Morpho`);
    }

    try {
      const data = await this.fetchMorphoData(chainName);
      
      cache.set(cacheKey, data, 300); // Cache for 5 minutes
      return data;
    } catch (error) {
      console.error(`Error fetching Morpho data for ${chainName}:`, error);
      throw error;
    }
  }

  private async fetchMorphoData(chainName: string): Promise<MorphoData> {
    const chainConfig = getChainConfig(chainName);
    if (!chainConfig || !chainConfig.contracts.morpho) {
      throw new Error(`Chain ${chainName} not supported for Morpho`);
    }

    const pools = chainConfig.contracts.morpho.pools;
    const chainId = chainConfig.chainId;
    
    if (!pools || pools.length === 0) {
      return {
        protocolName: 'Morpho',
        pools: [],
        timestamp: new Date().toISOString(),
        chain_id: chainId
      };
    }

    // Special handling for 'world' blockchain with hardcoded random APY
    if (chainName.toLowerCase() === 'world') {
      const poolsData = pools.map((pool) => {
        // Generate random APY between 1% and 2%
        const randomApy = Math.random() * 1 + 1; // 1% to 2%
        const randomTvl = Math.random() * 10000000 + 1000000; // Random TVL between 1M and 11M
        
        return {
          symbol: 'USDC',
          name: pool.name,
          apy: randomApy,
          poolApy: randomApy,
          rewardsApy: 0,
          tvl: randomTvl,
          tokens: [{
            symbol: 'USDC',
            name: 'USD Coin'
          }],
          chain_id: chainId,
          address: pool.address
        };
      });

      return {
        protocolName: 'Morpho',
        pools: poolsData,
        timestamp: new Date().toISOString(),
        chain_id: chainId
      };
    }

    const query = `
      query VaultDetails($address: String!, $chainId: Int!) {
        vaultByAddress(address: $address, chainId: $chainId) {
          address
          symbol
          name
          liquidity { underlying usd }
          asset { address symbol decimals chain { id network } }
          state { 
            fee
            apy 
            netApy 
            totalAssets 
            totalAssetsUsd 
            timestamp 
            rewards { 
              asset { name } 
              supplyApr 
            } 
          }
        }
      }`;

    try {
      const poolsData = await Promise.all(
        pools.map(async (pool) => {
          try {
            const res = await axios.post(MorphoService.MORPHO_SUBGRAPH_URL, {
              query,
              variables: { address: pool.address, chainId },
            }, {
              timeout: 10000,
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DeFi-APY-Server/1.0'
              }
            });

            const vault = res.data.data.vaultByAddress;
            if (!vault) {
              return null;
            }
            
            // Calculate APY after fee deduction only if fee is provided
            const apy = vault.state.apy*100;
            const netApy = vault.state.fee ? apy * (1 - vault.state.fee) : apy;
            
            
            return {
              symbol: 'USDC',
              name: pool.name,
              apy: apy,
              poolApy: netApy,
              rewardsApy: 0,
              tvl: vault.liquidity.usd,
              tokens: [{
                symbol: 'USDC',
                name: 'USD Coin'
              }],
              chain_id: chainId,
              address: pool.address
            };
          } catch (error) {
            console.error(`Error fetching vault ${pool.address}:`, error);
            return null;
          }
        })
      );

      const validPools = poolsData.filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        protocolName: 'Morpho',
        pools: validPools,
        timestamp: new Date().toISOString(),
        chain_id: chainId
      };
    } catch (error) {
      console.error(`Error fetching Morpho data for ${chainName}:`, error);
      return {
        protocolName: 'Morpho',
        pools: [],
        timestamp: new Date().toISOString(),
        chain_id: chainId
      };
    }
  }

  async getAllChainsData(): Promise<MorphoData[]> {
    const supportedChains = getSupportedChainsForProtocol('morpho');
    const results: MorphoData[] = [];

    for (const chainName of supportedChains) {
      try {
        const data = await this.getMorphoApy(chainName);
        results.push(data);
      } catch (error) {
        console.error(`Error fetching Morpho data for ${chainName}:`, error);
        // Add empty data for failed chains
        const chainConfig = getChainConfig(chainName);
        if (chainConfig) {
          results.push({
            protocolName: 'Morpho',
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