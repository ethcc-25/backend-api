import { Router, Request, Response } from 'express';
import Profile from '../models/Profile';
import DepositStatus from '../models/DepositStatus';
import WithdrawStatus from '../models/WithdrawStatus';
import { WithdrawService } from '../services/withdraw.service';

const router: Router = Router();
const withdrawService = new WithdrawService();

// @route   GET /api/profile/:userAddress
// @desc    Get user profile
// @access  Public
router.get('/:userAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAddress } = req.params;

    // Get complete user profile with position, deposits, withdraws, and net amount
    const completeProfile = await getCompleteUserProfile(userAddress);

    res.json({
      success: true,
      data: completeProfile,
      source: 'MongoDB'
    });
  } catch (error) {
    console.error('Error fetching complete profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * Get complete user profile with all data
 */
async function getCompleteUserProfile(userAddress: string) {
  try {
    // 1. Get active position from smart contract
    const positionResult = await withdrawService.checkUserPosition(userAddress);
    
    // 2. Get deposit history
    const deposits = await DepositStatus.find({ userWallet: userAddress })
      .sort({ createdAt: -1 })
      .lean();
    
    // 3. Get withdraw history
    const withdraws = await WithdrawStatus.find({ userAddress })
      .sort({ createdAt: -1 })
      .lean();
    
    // 4. Calculate net amount (total deposits - total withdraws)
    const totalDeposited = deposits
      .filter(d => d.status === 'completed')
      .reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
    
    const totalWithdrawn = withdraws
      .filter(w => w.status === 'completed')
      .reduce((sum, withdraw) => {
        // Convert amountUsdc from wei to USDC (6 decimals)
        const amountUsdc = parseFloat(withdraw.position.amountUsdc) / 1e6;
        return sum + amountUsdc;
      }, 0);
    
    const netAmount = totalDeposited - totalWithdrawn;
    
    // 5. Format response
    return {
      userAddress,
      activePosition: positionResult ? {
        hasPosition: true,
        position: {
          ...positionResult.position,
          // Convert amounts from wei to readable format
          amountUsdc: (parseFloat(positionResult.position.amountUsdc) / 1e6).toString(),
          shares: positionResult.position.shares
        },
        chainDomain: positionResult.chainDomain,
        chainName: getChainNameFromDomain(positionResult.chainDomain),
        protocolName: getProtocolName(positionResult.position.pool)
      } : {
        hasPosition: false,
        position: null,
        chainDomain: null,
        chainName: null,
        protocolName: null
      },
      deposits: deposits.map(deposit => ({
        id: deposit._id,
        amount: deposit.amount,
        status: deposit.status,
        srcChainDomain: deposit.srcChainDomain,
        dstChainDomain: deposit.dstChainDomain,
        srcChainName: getChainNameFromDomain(deposit.srcChainDomain),
        dstChainName: getChainNameFromDomain(deposit.dstChainDomain),
        protocol: deposit.opportunity.protocol,
        apy: deposit.opportunity.apy,
        bridgeTransactionHash: deposit.bridgeTransactionHash,
        depositTxHash: deposit.depositTxHash,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
        errorMessage: deposit.errorMessage
      })),
      withdraws: withdraws.map(withdraw => ({
        id: withdraw._id,
        amount: (parseFloat(withdraw.position.amountUsdc) / 1e6).toString(),
        status: withdraw.status,
        srcChainDomain: withdraw.srcChainDomain,
        dstChainDomain: withdraw.dstChainDomain,
        srcChainName: getChainNameFromDomain(withdraw.srcChainDomain),
        dstChainName: getChainNameFromDomain(withdraw.dstChainDomain),
        protocol: getProtocolName(withdraw.position.pool),
        initWithdrawTxHash: withdraw.initWithdrawTxHash,
        processWithdrawTxHash: withdraw.processWithdrawTxHash,
        createdAt: withdraw.createdAt,
        updatedAt: withdraw.updatedAt,
        errorMessage: withdraw.errorMessage
      })),
      summary: {
        totalDeposited: totalDeposited.toFixed(6),
        totalWithdrawn: totalWithdrawn.toFixed(6),
        netAmount: netAmount.toFixed(6),
        totalDeposits: deposits.length,
        totalWithdraws: withdraws.length,
        completedDeposits: deposits.filter(d => d.status === 'completed').length,
        completedWithdraws: withdraws.filter(w => w.status === 'completed').length,
        pendingDeposits: deposits.filter(d => !['completed', 'failed'].includes(d.status)).length,
        pendingWithdraws: withdraws.filter(w => !['completed', 'failed'].includes(w.status)).length
      }
    };
  } catch (error) {
    console.error('Error getting complete user profile:', error);
    throw new Error('Failed to get complete user profile');
  }
}

/**
 * Helper function to get chain name from domain ID
 */
function getChainNameFromDomain(domain: number): string {
  switch (domain) {
    case 0: return 'Ethereum';
    case 3: return 'Arbitrum';
    case 6: return 'Base';
    case 14: return 'World';
    default: return `Unknown (${domain})`;
  }
}

/**
 * Helper function to get protocol name from pool ID
 */
function getProtocolName(poolId: number): string {
  switch (poolId) {
    case 1: return 'AAVE';
    case 2: return 'Morpho';
    case 3: return 'Fluid';
    default: return `Unknown (${poolId})`;
  }
}


export default router;