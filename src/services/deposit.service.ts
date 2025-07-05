import { createWalletClient, http, parseAbi, getContract, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, arbitrum, base } from 'viem/chains';
import DepositStatus from '../models/DepositStatus';
import { RetrieveService } from './retrieve';
import { DepositRequest, DepositStatus as IDepositStatus } from '../types';
import { getYieldManagerContract, YIELD_MANAGER_ABI } from '../config/contracts';
import { getChainConfig } from '../config/chains';

export class DepositService {
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
   * Create or update deposit status in database
   */
  private async updateDepositStatus(
    id: string | undefined,
    updates: Partial<IDepositStatus>
  ): Promise<IDepositStatus> {
    try {
      // Try MongoDB first
      if (id) {
        const result = await DepositStatus.findByIdAndUpdate(
          id,
          { ...updates, updatedAt: new Date() },
          { new: true }
        );
        
        if (!result) {
          throw new Error('Deposit status not found');
        }
        
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as unknown as IDepositStatus;
      } else {
        const newDepositStatus = new DepositStatus({
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const result = await newDepositStatus.save();
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as unknown as IDepositStatus;
      }
    } catch (error) {
      console.error('Error updating deposit status:', error);
      throw error;
    }
  }

  /**
   * Get deposit status by ID
   */
  async getStatusDeposit(id: string): Promise<IDepositStatus | null> {
    try {
      // Try MongoDB first
      const status = await DepositStatus.findById(id);
      
      if (!status) {
        return null;
      }
      
      return {
        ...status.toObject(),
        _id: status._id.toString()
      } as unknown as IDepositStatus;
    } catch (error) {
      console.error('Error getting deposit status:', error);
      throw error;
    }
  }

  /**
   * Get deposit status by transaction hash
   */
  async getStatusByTransactionHash(transactionHash: string): Promise<IDepositStatus | null> {
    try {
      // Try MongoDB first
      const status = await DepositStatus.findOne({ bridgeTransactionHash: transactionHash });
      
      if (!status) {
        return null;
      }
      
      return {
        ...status.toObject(),
        _id: status._id.toString()
      } as unknown as IDepositStatus;
    } catch (error) {
      console.error('Error getting deposit status by transaction hash:', error);
      throw error;
    }
  }

  /**
   * Initialize deposit request
   */
  async initializedDeposit(request: DepositRequest): Promise<IDepositStatus> {
    const depositStatus = await this.updateDepositStatus(undefined, {
      ...request,
      status: 'pending_attestation'
    });

    return depositStatus;
  }

  /**
   * Get chain name from domain ID
   */
  private getChainNameFromDomain(domain: number): string {
    switch (domain) {
      case 0:
        return 'ethereum';
      case 2:
        return 'optimism';
      case 3:
        return 'arbitrum';
      case 6:
        return 'base';
      default:
        throw new Error(`Unsupported chain domain: ${domain}`);
    }
  }

  /**
   * Wait for CCTP attestation and process deposit
   */
  async waitForConfirmationAndProcess(
    transactionHash: string
  ): Promise<IDepositStatus> {
    let depositStatus = await this.getStatusByTransactionHash(transactionHash);
    
    if (!depositStatus) {
      throw new Error('Deposit status not found for transaction hash');
    }

    try {
      depositStatus = await this.updateDepositStatus(depositStatus._id, {
        bridgeTransactionHash: transactionHash,
        status: 'pending_attestation'
      });

      console.log(`Waiting for attestation for transaction: ${transactionHash}`);

      // Convert domain to chain name for attestation retrieval
      const sourceChainName = this.getChainNameFromDomain(depositStatus.srcChainDomain);

      // Poll for attestation (max 10 minutes)
      const maxAttempts = 60; // 10 minutes with 10-second intervals
      let attempts = 0;
      let attestationData = null;

      while (attempts < maxAttempts && !attestationData) {
        try {
          attestationData = await this.retrieveService.retrieveAttestation(
            transactionHash,
            sourceChainName
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
        depositStatus = await this.updateDepositStatus(depositStatus._id, {
          status: 'failed',
          errorMessage: 'Attestation timeout or not found'
        });
        throw new Error('Attestation timeout or not found');
      }

      console.log(`Attestation received: ${attestationData}`);

      // Update status with attestation received
      depositStatus = await this.updateDepositStatus(depositStatus._id, {
        status: 'attestation_received',
        attestationMessage: attestationData.message,
        attestation: attestationData.attestation
      });

      // Process deposit on destination chain
      const destChainName = this.getChainNameFromDomain(depositStatus.dstChainDomain);
      const depositTxHash = await this.processDeposit(
        destChainName,
        attestationData.message!,
        attestationData.attestation!
      );

      // Update status with deposit processing
      depositStatus = await this.updateDepositStatus(depositStatus._id, {
        status: 'deposit_confirmed',
        depositTxHash
      });

      // Final status update
      depositStatus = await this.updateDepositStatus(depositStatus._id, {
        status: 'completed'
      });

      return depositStatus;

    } catch (error) {
      console.error('Error in bridge process:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      depositStatus = await this.updateDepositStatus(depositStatus._id, {
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

}