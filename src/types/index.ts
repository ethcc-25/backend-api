import { Request } from 'express';

export interface ProtocolData {
  protocolName: string;
  chainName: string;
  apy: number;
  tvl: number;
  timestamp: number;
}

export interface PoolData {
  name: string;
  address: string;
  apy: number;
  tvl: number;
}

export interface AaveData extends ProtocolData {
  protocolName: 'AAVE';
  poolAddress: string;
  reserveData: {
    liquidityRate: string;
    totalLiquidity: string;
  };
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contracts: {
    aave: {
      poolAddress: string;
      usdcAddress: string;
    };
  };
}

export interface ApiResponse {
  success: boolean;
  data: {
    aave: AaveData[];
  };
  timestamp: number;
}

export interface ChainApiResponse {
  success: boolean;
  data: AaveData;
  timestamp: number;
}

export type SupportedProtocols = 'aave';

export interface AllProtocolsData {
  aave: AaveData[];
}

export interface CustomRequest extends Request {
  params: {
    chain: string;
  };
} 