import { optimism } from 'viem/chains';
import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arbitrum-one-rpc.publicnode.com',
    contracts: {
      aave: {
        poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool on Arbitrum
        usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // USDC on Arbitrum
      }
    }
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || 'https://base-rpc.publicnode.com',
    contracts: {
      aave: {
        poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Aave V3 Pool on Base
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
      },
      morpho: {
        apiUrl: 'https://api.morpho.org/graphql',
        pools: [
          {
            address: '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183',
            name: 'Steakouse - USDC',
          },
          {
            address: '0x616a4E1db48e22028f6bbf20444Cd3b8e3273738',
            name: 'Seamless USDC Vault',
          },
          {
            address: '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca',
            name: 'Moonwell Flagship USDC',
          },
          {
            address: '0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A',
            name: 'Spark - USDC',
          }
        ]
      }
    }
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism-rpc.publicnode.com',
    contracts: {
      aave: {
        poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool on Optimism
        usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' // USDC on Optimism
      },
      morpho: {
        apiUrl: 'https://api.morpho.org/graphql',
        pools: [
          {
            address: '0x3520E1a10038131A3C00Bf2158835A75e929642d',
            name: 'USDC',
          }
        ]
      }
    }
  },
  world: {
    chainId: 4,
    name: 'World',
    rpcUrl: 'https://world-rpc.example.com',
    contracts: {
      morpho: {
        apiUrl: 'https://api.morpho.org/graphql',
        pools: [
          {
            address: '0x1234567890123456789012345678901234567890',
            name: 'World USDC',
          }
        ]
      }
    }
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism-mainnet.publicnode.com',
    contracts: {
      aave: {
        poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool on Optimism
        usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' // USDC on Optimism
      }
    }
  }
};

export const getSupportedChains = (): string[] => {
  return Object.keys(CHAIN_CONFIGS);
};

export const getChainConfig = (chainName: string): ChainConfig | undefined => {
  return CHAIN_CONFIGS[chainName.toLowerCase()];
};

export const getChainById = (chainId: number): ChainConfig | undefined => {
  return Object.values(CHAIN_CONFIGS).find(config => config.chainId === chainId);
};

/**
 * Get supported chains for a specific protocol
 */
export const getSupportedChainsForProtocol = (protocol: 'aave' | 'fluid' | 'morpho'): string[] => {
  return Object.entries(CHAIN_CONFIGS)
    .filter(([_, config]) => config.contracts[protocol])
    .map(([chainName, _]) => chainName);
};
/**
 * Map chainId to CCTP domain ID
 */
export const getChainDomainMapping = (): Record<number, number> => {
  return {
    1: 0,     // Ethereum → Domain 0
    42161: 3, // Arbitrum → Domain 3
    8453: 6,  // Base → Domain 6
    10: 2,    // Optimism → Domain 2
    480: 14,  // World → Domain 14
    103: 15   // WorldLand → Domain 15 (custom domain)
  };
};

/**
 * Get CCTP domain ID from chain ID
 */
export const getDomainFromChainId = (chainId: number): number => {
  const mapping = getChainDomainMapping();
  const domain = mapping[chainId];
  
  if (domain === undefined) {
    throw new Error(`Unsupported chainId: ${chainId}. Supported chains: ${Object.keys(mapping).join(', ')}`);
  }
  
  return domain;
};

/**
 * Get chain ID from CCTP domain ID
 */
export const getChainIdFromDomain = (domain: number): number => {
  const mapping = getChainDomainMapping();
  const chainId = Object.keys(mapping).find(key => mapping[parseInt(key)] === domain);
  
  if (!chainId) {
    throw new Error(`Unsupported domain: ${domain}. Supported domains: ${Object.values(mapping).join(', ')}`);
  }
  
  return parseInt(chainId);
};