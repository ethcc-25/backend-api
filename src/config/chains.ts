import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com',
    contracts: {
      aave: {
        poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Pool
        usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC on Ethereum
      }
    }
  },
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