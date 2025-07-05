/**
 * CCTP (Cross-Chain Transfer Protocol) Configuration
 * Contains domain mappings and URLs for different chains
 */

export interface CCTPDomainConfig {
  domain: number;
  name: string;
  description: string;
  testnet: boolean;
}

export const CCTP_DOMAINS: { [key: string]: CCTPDomainConfig } = {
  'ethereum-sepolia': {
    domain: 0,
    name: 'Ethereum Sepolia',
    description: 'Ethereum testnet',
    testnet: true
  },
  'avalanche-fuji': {
    domain: 1,
    name: 'Avalanche Fuji',
    description: 'Avalanche testnet',
    testnet: true
  },
  'arbitrum-sepolia': {
    domain: 3,
    name: 'Arbitrum Sepolia',
    description: 'Arbitrum testnet',
    testnet: true
  },
  'base-sepolia': {
    domain: 6,
    name: 'Base Sepolia',
    description: 'Base testnet',
    testnet: true
  },
  'polygon-amoy': {
    domain: 7,
    name: 'Polygon Amoy',
    description: 'Polygon testnet',
    testnet: true
  }
};

/**
 * Get domain ID from chain name
 */
export function getDomainId(chainName: string): number {
  const domain = CCTP_DOMAINS[chainName.toLowerCase()];
  if (!domain) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }
  return domain.domain;
}

/**
 * Get supported domains list
 */
export function getSupportedDomains(): { [key: string]: CCTPDomainConfig } {
  return CCTP_DOMAINS;
}

/**
 * Get API URL for CCTP
 */
export function getApiUrl(isTestnet: boolean = true): string {
  return isTestnet 
    ? 'https://iris-api-sandbox.circle.com/v2/messages'
    : 'https://iris-api.circle.com/v2/messages';
} 