import { createWalletClient, http, parseAbi, getContract, publicActions, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, optimism, arbitrum, base, worldchain } from 'viem/chains';
import WithdrawStatus from '../models/WithdrawStatus';
import { RetrieveService } from './retrieve';
import { WithdrawStatus as IWithdrawStatus, Position } from '../types';
import { getYieldManagerContract, YIELD_MANAGER_ABI } from '../config/contracts';
import { getChainConfig, getDomainFromChainId, getChainIdFromDomain } from '../config/chains';

export class WithdrawService {
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
      case 'optimism':
        return optimism;
      case 'arbitrum':
        return arbitrum;
      case 'base':
        return base;
      case 'world':
        return worldchain;
      default:
        throw new Error(`Unsupported chain: ${chainName}`);
    }
  }

  /**
   * Get Viem chain configuration from domain ID
   */
  private getViemChainFromDomain(domain: number) {
    switch (domain) {
      case 0: // Ethereum
        return mainnet;
      case 2: // Optimism
        return optimism;
      case 3: // Arbitrum
        return arbitrum;
      case 6: // Base
        return base;
      case 14: // World
        return worldchain;
      default:
        throw new Error(`Unsupported chain domain: ${domain}`);
    }
  }

  /**
   * Get chain config from domain ID
   */
  private getChainConfigFromDomain(domain: number) {
    switch (domain) {
      case 0: // Ethereum
        return getChainConfig('ethereum');
      case 2: // Optimism
        return getChainConfig('optimism');
      case 3: // Arbitrum
        return getChainConfig('arbitrum');
      case 6: // Base
        return getChainConfig('base');
      case 14: // World
        return getChainConfig('world');
      default:
        throw new Error(`Unsupported chain domain: ${domain}`);
    }
  }

  /**
   * Get YieldManager contract from domain ID
   */
  private getYieldManagerContractFromDomain(domain: number) {
    switch (domain) {
      case 0: // Ethereum
        return getYieldManagerContract('ethereum');
      case 2: // Optimism
        return getYieldManagerContract('optimism');
      case 3: // Arbitrum
        return getYieldManagerContract('arbitrum');
      case 6: // Base
        return getYieldManagerContract('base');
      case 14: // World
        return getYieldManagerContract('world');
      default:
        throw new Error(`Unsupported chain domain: ${domain}`);
    }
  }

  /**
   * Create or update withdraw status in database
   */
  async updateWithdrawStatus(
    id: string | undefined,
    updates: Partial<IWithdrawStatus>
  ): Promise<IWithdrawStatus> {
    try {
      if (id) {
        const result = await WithdrawStatus.findByIdAndUpdate(
          id,
          { ...updates, updatedAt: new Date() },
          { new: true }
        );
        
        if (!result) {
          throw new Error('Withdraw status not found');
        }
        
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as unknown as IWithdrawStatus;
      } else {
        const newWithdrawStatus = new WithdrawStatus({
          ...updates,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const result = await newWithdrawStatus.save();
        return {
          ...result.toObject(),
          _id: result._id.toString()
        } as unknown as IWithdrawStatus;
      }
    } catch (error) {
      console.error('Error updating withdraw status:', error);
      throw error;
    }
  }

  /**
   * Check if user has a position on any supported chain
   */
  async checkUserPosition(userAddress: string): Promise<{ position: Position; chainDomain: number } | null> {
    const supportedDomains = [0, 2, 3, 6]; // Ethereum, Optimism, Arbitrum, Base
    
    for (const domain of supportedDomains) {
      try {
        const contractConfig = this.getYieldManagerContractFromDomain(domain);
        const chainConfig = this.getChainConfigFromDomain(domain);
        
        if (!contractConfig || !chainConfig) {
          continue;
        }

        // Create public client for reading
        const chain = this.getViemChainFromDomain(domain);
        const publicClient = createPublicClient({
          chain,
          transport: http(chainConfig.rpcUrl)
        });

        // Get contract instance for reading
        const contract = getContract({
          address: contractConfig.address as `0x${string}`,
          abi: YIELD_MANAGER_ABI,
          client: publicClient
        });

        console.log(`Checking position for ${userAddress} on domain ${domain}...`);

        // Read position from contract
        const positionData = await contract.read.positions([userAddress as `0x${string}`]);
        
        // Check if position exists (pool > 0 means position exists)
        if (positionData && positionData[0] > 0) {
          const position: Position = {
            pool: Number(positionData[0]),
            positionId: positionData[1] as string,
            user: positionData[2] as string,
            amountUsdc: positionData[3].toString(),
            shares: positionData[4].toString(),
            vault: positionData[5] as string
          };

          console.log(`Position found on domain ${domain}:`, position);
          return { position, chainDomain: domain };
        }
      } catch (error) {
        console.error(`Error checking position on domain ${domain}:`, error);
        // Continue checking other chains
      }
    }

    return null;
  }

  /**
   * Initialize withdraw process for a user
   */
  async initializeWithdrawProcess(userAddress: string): Promise<IWithdrawStatus> {
    try {
      // Check if user has a position
      console.log(`Checking position for user: ${userAddress}`);
      const positionResult = await this.checkUserPosition(userAddress);
      
      if (!positionResult) {
        // Create withdraw status with failed state if no position found
        const withdrawStatus = await this.updateWithdrawStatus(undefined, {
          userAddress,
          srcChainDomain: 0,
          dstChainDomain: 14,
          status: 'failed',
          errorMessage: 'No position found for this user',
          position: {
            pool: 0,
            positionId: '0x0000000000000000000000000000000000000000000000000000000000000000',
            user: userAddress,
            amountUsdc: '0',
            shares: '0',
            vault: '0x0000000000000000000000000000000000000000'
          }
        });
        throw new Error('No position found for this user');
      }

      console.log(`Position found for user: ${userAddress}`, positionResult);

      // Create withdraw status with found position
      let withdrawStatus = await this.updateWithdrawStatus(undefined, {
        userAddress,
        position: positionResult.position,
        srcChainDomain: positionResult.chainDomain,
        dstChainDomain: 14, // Always WORLD
        status: 'initiating_withdraw'
      });

      // Initiate withdraw on the source chain
      console.log(`Initiating withdraw for user: ${userAddress} on domain: ${positionResult.chainDomain}`);
      const initWithdrawTxHash = await this.callInitWithdraw(
        positionResult.chainDomain,
        userAddress
      );

      // Update status with transaction hash and set to pending_attestation
      withdrawStatus = await this.updateWithdrawStatus(withdrawStatus._id, {
        status: 'pending_attestation',
        initWithdrawTxHash
      });

      console.log(`Withdraw initiated for ${userAddress}. Transaction: ${initWithdrawTxHash}. Status set to pending_attestation.`);

      return withdrawStatus;

    } catch (error) {
      console.error('Error in initialize withdraw process:', error);
      throw error;
    }
  }

  /**
   * Call initWithdraw on the source chain
   */
  private async callInitWithdraw(chainDomain: number, userAddress: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }

    const contractConfig = this.getYieldManagerContractFromDomain(chainDomain);
    const chainConfig = this.getChainConfigFromDomain(chainDomain);
    
    if (!contractConfig || !chainConfig) {
      throw new Error(`Contract or chain configuration not found for domain: ${chainDomain}`);
    }

    try {
      // Create account from private key
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      
      // Get chain configuration
      const chain = this.getViemChainFromDomain(chainDomain);
      
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

      console.log(`Calling initWithdraw for ${userAddress} on domain ${chainDomain}...`);

      // Call initWithdraw function
      const txHash = await contract.write.initWithdraw([userAddress as `0x${string}`]);

      console.log(`InitWithdraw transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60000 // 1 minute timeout
      });

      if (receipt.status === 'success') {
        console.log(`InitWithdraw confirmed on block: ${receipt.blockNumber}`);
        return txHash;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Error calling initWithdraw:', error);
      throw new Error(`Failed to call initWithdraw: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a specific withdraw that has received attestation
   */
  async processWithdrawWithAttestation(withdrawId: string, attestationData: any): Promise<IWithdrawStatus> {
    let withdrawStatus = await this.getWithdrawStatus(withdrawId);
    
    if (!withdrawStatus) {
      throw new Error('Withdraw status not found');
    }

    try {
      // Update status with attestation received
      withdrawStatus = await this.updateWithdrawStatus(withdrawStatus._id, {
        status: 'attestation_received',
        attestationMessage: attestationData.message,
        attestation: attestationData.attestation
      });

      // Process withdraw on WORLD chain
      const processWithdrawTxHash = await this.callProcessWithdraw(
        attestationData.message!,
        attestationData.attestation!
      );

      // Update status with process withdraw
      withdrawStatus = await this.updateWithdrawStatus(withdrawStatus._id, {
        status: 'processing_withdraw',
        processWithdrawTxHash
      });

      // Final status update
      withdrawStatus = await this.updateWithdrawStatus(withdrawStatus._id, {
        status: 'completed'
      });

      return withdrawStatus;

    } catch (error) {
      console.error('Error in withdraw process:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      withdrawStatus = await this.updateWithdrawStatus(withdrawStatus._id, {
        status: 'failed',
        errorMessage
      });

      throw error;
    }
  }

  /**
   * Call processWithdraw on WORLD chain with message and attestation
   */
  private async callProcessWithdraw(message: string, attestation: string): Promise<string> {
    if (!this.privateKey) {
      throw new Error('Private key not configured');
    }

    const contractConfig = this.getYieldManagerContractFromDomain(14); // WORLD domain
    const chainConfig = this.getChainConfigFromDomain(14);
    
    if (!contractConfig || !chainConfig) {
      throw new Error('WORLD chain contract configuration not found');
    }

    try {
      // Create account from private key
      const account = privateKeyToAccount(this.privateKey as `0x${string}`);
      
      // Get chain configuration
      const chain = this.getViemChainFromDomain(14); // WORLD
      
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

      console.log('Calling processWithdraw on WORLD chain...');

      // Call processWithdraw function with message and attestation
      const txHash = await contract.write.processWithdraw([
        message as `0x${string}`,
        attestation as `0x${string}`
      ]);

      console.log(`ProcessWithdraw transaction sent: ${txHash}`);

      // Wait for transaction confirmation
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60000 // 1 minute timeout
      });

      if (receipt.status === 'success') {
        console.log(`ProcessWithdraw confirmed on block: ${receipt.blockNumber}`);
        return txHash;
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('Error calling processWithdraw:', error);
      throw new Error(`Failed to call processWithdraw: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get withdraw status by ID
   */
  async getWithdrawStatus(id: string): Promise<IWithdrawStatus | null> {
    try {
      const status = await WithdrawStatus.findById(id);
      
      if (!status) {
        return null;
      }
      
      return {
        ...status.toObject(),
        _id: status._id.toString()
      } as unknown as IWithdrawStatus;
    } catch (error) {
      console.error('Error getting withdraw status:', error);
      throw error;
    }
  }

  /**
   * Get all pending attestation withdraws
   */
  async getPendingAttestationWithdraws(): Promise<IWithdrawStatus[]> {
    try {
      const statuses = await WithdrawStatus.find({ 
        status: 'pending_attestation',
        initWithdrawTxHash: { $exists: true, $ne: null }
      }).sort({ createdAt: 1 }); // Oldest first
      
      return statuses.map(status => ({
        ...status.toObject(),
        _id: status._id.toString()
      })) as unknown as IWithdrawStatus[];
    } catch (error) {
      console.error('Error getting pending attestation withdraws:', error);
      throw error;
    }
  }

  /**
   * Get withdraw status by user address
   */
  async getWithdrawStatusByUser(userAddress: string): Promise<IWithdrawStatus[]> {
    try {
      const statuses = await WithdrawStatus.find({ userAddress }).sort({ createdAt: -1 });
      
      return statuses.map(status => ({
        ...status.toObject(),
        _id: status._id.toString()
      })) as unknown as IWithdrawStatus[];
    } catch (error) {
      console.error('Error getting withdraw status by user:', error);
      throw error;
    }
  }
}