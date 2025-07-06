import { optimism } from 'viem/chains';
import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism-rpc.publicnode.com',
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