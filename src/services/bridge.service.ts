import { createWalletClient, http, parseAbi, getContract, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, arbitrum, base } from 'viem/chains';
import BridgeStatus from '../models/BridgeStatus';
import { RetrieveService } from './retrieve';
import { BridgeRequest, BridgeStatus as IBridgeStatus } from '../types';
import { getYieldManagerContract, YIELD_MANAGER_ABI } from '../config/contracts';
import { getChainConfig } from '../config/chains';

// In-memory storage fallback
let bridgeStatusStorage: Array<IBridgeStatus & { _id: string }> = [];
let nextId = 1;

export class BridgeService {
  private retrieveService: RetrieveService;
  private privateKey: string;

  constructor() {
    this.retrieveService = new RetrieveService();
    this.privateKey = process.env.PRIVATE_KEY || '';
    
    if (!this.privateKey) {
      console.warn('PRIVATE_KEY not found in environment variables');
    }
  }

  /**
   * Get Viem chain configuration
   */
  private getViemChain(chainName: string) {
    switch (chainName.toLowerCase()) {
      case 'ethereum':
        return mainnet;
      case 'arbitrum':
        return arbitrum;
      case 'base':
        return base;
      case 'world':
        // For World chain, we'll use a custom chain config
        return {
          id: 480,
          name: 'World',
          network: 'world',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: ['https://world-rpc.example.com'] },
            public: { http: ['https://world-rpc.example.com'] }
          }
        };
      default:
        throw new Error(`Unsupported chain: ${chainName}`);
    }
  }

  /**
   * Create or update bridge status in database
   */
  private async updateBridgeStatus(
    id: string | undefined,
    updates: Partial<IBridgeStatus>
  ): Promise<IBridgeStatus> {
    try {
      // Try MongoDB first
      if (id) {
        const result = await BridgeStatus.findByIdAndUpdate(
          id,
          { ...updates, updatedAt: new Date() },
          { new: true }
        );
        
        if (!result) {
          throw new Error('Bridge status not found');
        }
        
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as IBridgeStatus;
      } else {
        const newBridgeStatus = new BridgeStatus({
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const result = await newBridgeStatus.save();
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as IBridgeStatus;
      }
    } catch (error) {
      // Fallback to in-memory storage
      console.log('Using in-memory storage for bridge status');
      
      if (id) {
        const index = bridgeStatusStorage.findIndex(item => item._id === id);
        if (index === -1) {
          throw new Error('Bridge status not found');
        }
        
        bridgeStatusStorage[index] = {
          ...bridgeStatusStorage[index],
          ...updates,
          updatedAt: new Date()
        } as IBridgeStatus & { _id: string };
        
        return bridgeStatusStorage[index];
      } else {
        const newStatus: IBridgeStatus & { _id: string } = {
          ...updates,
          _id: nextId.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        } as IBridgeStatus & { _id: string };
        
        bridgeStatusStorage.push(newStatus);
        nextId++;
        
        return newStatus;
      }
    }
  }

  /**
   * Get bridge status by ID
   */
  async getBridgeStatus(id: string): Promise<IBridgeStatus | null> {
    try {
      // Try MongoDB first
      const status = await BridgeStatus.findById(id);
      
      if (!status) {
        return null;
      }
      
      return {
        ...status.toObject(),
        _id: status._id.toString()
      } as IBridgeStatus;
    } catch (error) {
      // Fallback to in-memory storage
      const status = bridgeStatusStorage.find(item => item._id === id);
      return status || null;
    }
  }

  /**
   * Get bridge status by transaction hash
   */
  async getBridgeStatusByTxHash(txHash: string): Promise<IBridgeStatus | null> {
    try {
      // Try MongoDB first
      const status = await BridgeStatus.findOne({ transactionHash: txHash });
      
      if (!status) {
        return null;
      }
      
      return {
        ...status.toObject(),
        _id: status._id.toString()
      } as IBridgeStatus;
    } catch (error) {
      // Fallback to in-memory storage
      const status = bridgeStatusStorage.find(item => item.transactionHash === txHash);
      return status || null;
    }
  }

  /**
   * Initialize bridge request
   */
  async initializeBridge(request: BridgeRequest): Promise<IBridgeStatus> {
    const bridgeStatus = await this.updateBridgeStatus(undefined, {
      ...request,
      status: 'pending_attestation'
    });

    return bridgeStatus;
  }

  /**
   * Wait for CCTP attestation and process deposit
   */
  async waitForConfirmationAndProcess(
    bridgeId: string,
    transactionHash: string
  ): Promise<IBridgeStatus> {
    let bridgeStatus = await this.getBridgeStatus(bridgeId);
    
    if (!bridgeStatus) {
      throw new Error('Bridge status not found');
    }

    try {
      // Update with transaction hash
      bridgeStatus = await this.updateBridgeStatus(bridgeId, {
        transactionHash,
        status: 'pending_attestation'
      });

      console.log(`Waiting for attestation for transaction: ${transactionHash}`);

      // Poll for attestation (max 10 minutes)
      const maxAttempts = 60; // 10 minutes with 10-second intervals
      let attempts = 0;
      let attestationData = null;

      while (attempts < maxAttempts && !attestationData) {
        try {
          attestationData = await this.retrieveService.retrieveAttestation(
            transactionHash,
            bridgeStatus.chainSource
          );

          if (attestationData && attestationData.status === 'complete') {
            break;
          }

          // Wait 10 seconds before next attempt
          await new Promise(resolve => setTimeout(resolve, 10000));
          attempts++;
        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      if (!attestationData || attestationData.status !== 'complete') {
        bridgeStatus = await this.updateBridgeStatus(bridgeId, {
          status: 'failed',
          errorMessage: 'Attestation timeout or not found'
        });
        throw new Error('Attestation timeout or not found');
      }

      // Update status with attestation received
      bridgeStatus = await this.updateBridgeStatus(bridgeId, {
        status: 'attestation_received',
        attestationMessage: attestationData.message,
        attestation: attestationData.attestation
      });

      // Process deposit on destination chain
      const depositTxHash = await this.processDeposit(
        bridgeStatus.chainDest,
        attestationData.message!,
        attestationData.attestation!
      );

      // Update status with deposit processing
      bridgeStatus = await this.updateBridgeStatus(bridgeId, {
        status: 'deposit_confirmed',
        depositTxHash
      });

      // Final status update
      bridgeStatus = await this.updateBridgeStatus(bridgeId, {
        status: 'completed'
      });

      return bridgeStatus;

    } catch (error) {
      console.error('Error in bridge process:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      bridgeStatus = await this.updateBridgeStatus(bridgeId, {
        status: 'failed',
        errorMessage
      });

      throw error;
    }
  }

  /**
   * Process deposit on destination chain using YieldManager contract
   */
  private async processDeposit(
    chainName: string,
    message: string,
    attestation: string
  ): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }

    const contractConfig = getYieldManagerContract(chainName);
    if (!contractConfig) {
      throw new Error(`YieldManager contract not configured for chain: ${chainName}`);
    }

    const chainConfig = getChainConfig(chainName);
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for: ${chainName}`);
    }

    try {
      // Create account from private key
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      
      // Get chain configuration
      const chain = this.getViemChain(chainName);
      
      // Create wallet client
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(chainConfig.rpcUrl)
      }).extend(publicActions);

      // Get contract instance
      const contract = getContract({
        address: contractConfig.address as `0x${string}`,
        abi: YIELD_MANAGER_ABI,
        client: walletClient
      });

      console.log(`Processing deposit on ${chainName} chain...`);
      console.log(`Contract address: ${contractConfig.address}`);
      console.log(`Message length: ${message.length}`);
      console.log(`Attestation length: ${attestation.length}`);

      // Call processDeposit function
      const txHash = await contract.write.processDeposit([
        message as `0x${string}`,
        attestation as `0x${string}`
      ]);

      console.log(`Deposit transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60000 // 1 minute timeout
      });

      if (receipt.status === 'success') {
        console.log(`Deposit confirmed on block: ${receipt.blockNumber}`);
        return txHash;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Error processing deposit:', error);
      throw new Error(`Failed to process deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user bridge history
   */
  async getUserBridgeHistory(userWallet: string): Promise<IBridgeStatus[]> {
    try {
      // Try MongoDB first
      const history = await BridgeStatus
        .find({ userWallet })
        .sort({ createdAt: -1 });
      
      return history.map(item => ({
        ...item.toObject(),
        _id: item._id.toString()
      })) as IBridgeStatus[];
    } catch (error) {
      // Fallback to in-memory storage
      return bridgeStatusStorage
        .filter(item => item.userWallet === userWallet)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }
}