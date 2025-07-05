import { Router, Request, Response } from 'express';
import { DepositService } from '../services/deposit.service';
import { DepositRequest, DepositStatus, SupportedChainDomain } from '../types';

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
    if (typeof depositRequest.srcChainDomain !== 'number' || typeof depositRequest.dstChainDomain !== 'number' || 
        !depositRequest.userWallet || !depositRequest.amount || 
        !depositRequest.opportunity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: srcChainDomain (number), dstChainDomain (number), userWallet, amount, opportunity'
      });
      return;
    }

    // Validate domain values are supported
    const supportedDomains = Object.values(SupportedChainDomain);
    if (!supportedDomains.includes(depositRequest.srcChainDomain) || 
        !supportedDomains.includes(depositRequest.dstChainDomain)) {
      res.status(400).json({
        success: false,
        error: `Invalid chain domains. Supported domains: ${supportedDomains.join(', ')}`
      });
      return;
    }

    const depositStatus: DepositStatus = await depositService.initializedDeposit(depositRequest);

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
 * POST /api/bridge/wait-confirmation
 * Wait for CCTP confirmation and process deposit
 */
router.post('/wait-confirmation', async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      res.status(400).json({
        success: false,
        error: 'transactionHash is required'
      });
      return;
    }

    // This will be a long-running operation
    const depositStatus: DepositStatus = await depositService.waitForConfirmationAndProcess(
      transactionHash
    );

    res.json({
      success: true,
      data: depositStatus,
      message: 'Deposit completed successfully'
    });

  } catch (error) {
    console.error('Error in deposit confirmation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Deposit process failed'
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