import { Router, Request, Response } from 'express';
import { DepositService } from '../services/deposit.service';
import { DepositRequest, DepositStatus, SupportedProtocol } from '../types';
import { getDomainFromChainId, getChainDomainMapping } from '../config/chains';

const router: Router = Router();
const depositService = new DepositService();

/**
 * POST /api/bridge/initialize
 * Initialize a bridge request
 */
router.post('/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const depositRequest: DepositRequest = req.body;

    // Validation
    if (typeof depositRequest.srcChainId !== 'number' || typeof depositRequest.destChainId !== 'number' || 
        !depositRequest.userWallet || !depositRequest.amount || 
        !depositRequest.opportunity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: srcChainId (number), destChainId (number), userWallet, amount, opportunity'
      });
      return;
    }

    // Validate opportunity fields
    if (typeof depositRequest.opportunity.chainId !== 'number' || 
        typeof depositRequest.opportunity.protocol !== 'number' || 
        !depositRequest.opportunity.poolAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required opportunity fields: chainId (number), protocol (number), poolAddress (string)'
      });
      return;
    }

    // Validate chainId values are supported
    const supportedChainIds = Object.keys(getChainDomainMapping()).map(Number);
    if (!supportedChainIds.includes(depositRequest.srcChainId) || 
        !supportedChainIds.includes(depositRequest.destChainId)) {
      res.status(400).json({
        success: false,
        error: `Invalid chain IDs. Supported chains: ${supportedChainIds.join(', ')}`
      });
      return;
    }

    // Validate protocol value
    const supportedProtocols = Object.values(SupportedProtocol).filter(v => typeof v === 'number') as number[];
    if (!supportedProtocols.includes(depositRequest.opportunity.protocol)) {
      res.status(400).json({
        success: false,
        error: `Invalid protocol. Supported protocols: ${supportedProtocols.join(', ')} (1=AAVE, 2=MORPHO, 3=FLUID)`
      });
      return;
    }

    // Map chainId to domainId for internal processing
    const srcChainDomain = getDomainFromChainId(depositRequest.srcChainId);
    const dstChainDomain = getDomainFromChainId(depositRequest.destChainId);

    // Convert request to internal format with domains
    const internalDepositRequest = {
      srcChainDomain,
      dstChainDomain,
      userWallet: depositRequest.userWallet,
      amount: depositRequest.amount,
      opportunity: {
        protocol: depositRequest.opportunity.protocol,
        apy: 0, // Will be filled later
        chainId: depositRequest.opportunity.chainId,
        poolAddress: depositRequest.opportunity.poolAddress
      },
      bridgeTransactionHash: depositRequest.bridgeTransactionHash
    };

    const initDeposit: DepositStatus = await depositService.initializedDeposit(internalDepositRequest);

    const depositStatus: DepositStatus = await depositService.waitForConfirmationAndProcess(
      initDeposit.bridgeTransactionHash
    );

    res.json({
      success: true,
      data: depositStatus,
      message: 'Deposit request initialized'
    });

  } catch (error) {
    console.error('Error initializing deposit:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize deposit'
    });
  }
});


/**
 * GET /api/deposit/status/tx/:transactionHash
 * Get deposit status by transaction hash
 */
router.get('/status/tx/:transactionHash', async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionHash } = req.params;

    if (!transactionHash) {
      res.status(400).json({
        success: false,
        error: 'Transaction hash is required'
      });
      return;
    }

    const depositStatus = await depositService.getStatusByTransactionHash(transactionHash);

    if (!depositStatus) {
      res.status(404).json({
        success: false,
        error: 'Deposit status not found for this transaction hash'
      });
      return;
    }
    res.json({
      success: true,
      data: depositStatus,
      message: 'Deposit status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting deposit status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deposit status'
    });
  }
});

export default router;