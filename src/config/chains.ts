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
      },
      fluid: {
        apiUrl: 'https://api.fluid.instadapp.io/v2/lending/1/users/0x0000000000000000000000000000000000000000/positions'
      },
      morpho: {
        apiUrl: 'https://api.morpho.org/graphql',
        pools: [
          {
            address: '0xd63070114470f685b75B74D60EEc7c1113d33a3D',
            name: 'Mev Capital USDC',
          },
          {
            address: '0x0F359FD18BDa75e9c49bC027E7da59a4b01BF32a',
            name: 'Relend USDC'
          },
          {
            address: '0xBEeFFF209270748ddd194831b3fa287a5386f5bC',
            name: 'Smokehouse USDC'
          }
        ]
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
      },
      fluid: {
        apiUrl: 'https://api.fluid.instadapp.io/v2/lending/42161/users/0x0000000000000000000000000000000000000000/positions'
      },
      morpho: {
        apiUrl: 'https://api.morpho.org/graphql',
        pools: [
          // Pas de pools USDC disponibles sur Arbitrum pour le moment
        ]
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
      fluid: {
        apiUrl: 'https://api.fluid.instadapp.io/v2/lending/8453/users/0x8Acf3088E8922e9Ec462B1D592B5e6aa63B8d2D5/positions'
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