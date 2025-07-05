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
  apy: number;
  poolApy: number;
  rewardsApy: number;
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

// CCTP Attestation types - Based on Circle's official API documentation
export interface DecodedMessage {
  sourceDomain: string;
  destinationDomain: string;
  nonce: string;
  sender: string;
  recipient: string;
  destinationCaller: string;
  minFinalityThreshold?: string; // Only present for V2 messages
  finalityThresholdExecuted?: string; // Only present for V2 messages
  messageBody: string;
}

export interface DecodedMessageBody {
  burnToken: string;
  mintRecipient: string;
  amount: string;
  messageSender: string;
  maxFee?: string; // Only present for V2 messages
  feeExecuted?: string; // Only present for V2 messages
  expirationBlock?: string; // Only present for V2 messages
  hookData?: string; // Only present for V2 messages
}

export interface AttestationMessage {
  message?: string; // The hex-encoded message. 0x if the attestation is not yet available
  eventNonce?: string; // The nonce associated with the message
  attestation?: string; // The attestation. PENDING if the attestation is not yet available
  decodedMessage?: DecodedMessage | null; // Decoded representation of the message. Null or empty if decoding fails
  decodedMessageBody?: DecodedMessageBody | null; // Decoded representation of the message body. Null or empty if decoding fails or is not applicable
  cctpVersion?: number; // The CCTP version of the message
  status: 'pending_confirmations' | string; // The status of the attestation
}

export interface AttestationRequest {
  transactionHash: string;
  sourceDomain?: number;
}

export interface AttestationResponse extends ApiResponse<AttestationMessage> {
  data?: AttestationMessage;
}

// Bridge Flow Types
export interface DepositOpportunity {
  protocol: string;
  apy: number;
  chain: string;
  chainId: number;
  poolAddress?: string;
  poolName?: string;
  symbol?: string;
  poolApy?: number;
  rewardsApy?: number;
  tvl?: number;
  tokens?: Token[];
  additionalData?: any;
}

export interface DepositRequest {
  chainSource: string;
  chainDest: string;
  userWallet: string;
  amount: string;
  opportunity: DepositOpportunity;
  bridgeTransactionHash: string;
}

export interface DepositStatus {
  _id: string;
  chainSource: string;
  chainDest:  string;
  userWallet: string;
  amount: string;
  opportunity: DepositOpportunity;
  bridgeTransactionHash: string;
  status: 'pending_attestation' | 'attestation_received' | 'processing_deposit' | 'deposit_confirmed' | 'completed' | 'failed';
  attestationMessage?: string;
  attestation?: string;
  depositTxHash?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum SupportedProtocol {
  AAVE = 1,
  MORPHO = 2,
  FLUID = 3,
}

export enum SupportedChainDomain {
  ETHEREUM = 0,
  OPTIMISM = 2,
  ARBITRUM = 3,
  BASE = 6,
  WORLDCHAIN = 14,
}