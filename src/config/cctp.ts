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
  },
  // Mainnet domains
  'ethereum': {
    domain: 0,
    name: 'Ethereum',
    description: 'Ethereum mainnet',
    testnet: false
  },
  'avalanche': {
    domain: 1,
    name: 'Avalanche',
    description: 'Avalanche mainnet',
    testnet: false
  },
  'arbitrum': {
    domain: 3,
    name: 'Arbitrum',
    description: 'Arbitrum mainnet',
    testnet: false
  },
  'base': {
    domain: 6,
    name: 'Base',
    description: 'Base mainnet',
    testnet: false
  },
  'polygon': {
    domain: 7,
    name: 'Polygon',
    description: 'Polygon mainnet',
    testnet: false
  }
};

export const CCTP_API_URLS = {
  testnet: 'https://iris-api-sandbox.circle.com/v2/messages',
  mainnet: 'https://iris-api.circle.com/v2/messages'
};

export const CCTP_CONTRACT_ADDRESSES = {
  testnet: {
    ethereum: {
      usdc: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa'
    },
    avalanche: {
      messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275'
    }
  },
  mainnet: {
    // TODO: Add mainnet addresses when needed
  }
};

/**
 * Get domain ID by chain name
 */
export function getDomainId(chainName: string): number {
  const config = CCTP_DOMAINS[chainName];
  if (!config) {
    throw new Error(`Unsupported chain: ${chainName}`);
  }
  return config.domain;
}

/**
 * Get API URL based on environment
 */
export function getApiUrl(isTestnet: boolean = true): string {
  return isTestnet ? CCTP_API_URLS.testnet : CCTP_API_URLS.mainnet;
}

/**
 * Get all supported domain mappings
 */
export function getSupportedDomains(): { [key: string]: number } {
  const domains: { [key: string]: number } = {};
  for (const [chainName, config] of Object.entries(CCTP_DOMAINS)) {
    domains[chainName] = config.domain;
  }
  return domains;
} 