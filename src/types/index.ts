import { Request } from 'express';

export interface Token {
  symbol: string;
  name?: string;
  address?: string;
  decimals?: number;
}

export interface PoolData {
  symbol: string;
  name?: string;
  poolApy: number;
  rewardsApy: number;
  combinedApy: number;
  tvl: number;
  tokens: Token[];
  chain_id: number;
  address?: string;
}

export interface ProtocolData {
  protocolName: string;
  pools: PoolData[];
  timestamp: string;
  chain_id: number;
}

export interface AaveData extends ProtocolData {
  protocolName: 'AAVE';
}

export interface FluidData extends ProtocolData {
  protocolName: 'Fluid';
}

export interface MorphoData extends ProtocolData {
  protocolName: 'Morpho';
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contracts: {
    aave?: {
      poolAddress: string;
      usdcAddress: string;
    };
    fluid?: {
      apiUrl: string;
    };
    morpho?: {
      apiUrl: string;
      pools: Array<{
        address: string;
        name: string;
      }>;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export type SupportedChains = 'ethereum' | 'arbitrum' | 'base';
export type SupportedProtocols = 'aave' | 'fluid' | 'morpho';

export interface AllProtocolsData {
  aave: AaveData[];
  fluid: FluidData[];
  morpho: MorphoData[];
  timestamp: string;
}

export interface CustomRequest extends Request {
  params: {
    chain: string;
  };
} 