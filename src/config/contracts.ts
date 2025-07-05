/**
 * Smart Contract Configuration for YieldManager across different chains
 */

export interface ContractConfig {
  address: string;
  chainId: number;
}

export const YIELD_MANAGER_CONTRACTS: Record<string, ContractConfig> = {
  'ethereum': {
    address: process.env.YIELD_MANAGER_ETHEREUM || '0x0000000000000000000000000000000000000000',
    chainId: 1
  },
  'arbitrum': {
    address: process.env.YIELD_MANAGER_ARBITRUM || '0x0000000000000000000000000000000000000000',
    chainId: 42161
  },
  'base': {
    address: process.env.YIELD_MANAGER_BASE || '0x0000000000000000000000000000000000000000',
    chainId: 8453
  },
  'world': {
    address: process.env.YIELD_MANAGER_WORLD || '0x0000000000000000000000000000000000000000',
    chainId: 480
  }
};

export const getYieldManagerContract = (chainName: string): ContractConfig | undefined => {
  return YIELD_MANAGER_CONTRACTS[chainName.toLowerCase()];
};

// YieldManager ABI - processDeposit function
export const YIELD_MANAGER_ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "message",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "attestation",
        "type": "bytes"
      }
    ],
    "name": "processDeposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "positions",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "pool",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "positionId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountUsdc",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "initWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "processWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;