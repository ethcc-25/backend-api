import { Router, Request, Response } from 'express';
import { DepositService } from '../services/deposit.service';
import { DepositRequest, DepositStatus } from '../types';

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
    if (!depositRequest.chainSource || !depositRequest.chainDest || 
        !depositRequest.userWallet || !depositRequest.amount || 
        !depositRequest.opportunity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chainSource, chainDest, userWallet, amount, opportunity'
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
    const { bridgeId, transactionHash } = req.body;

    if (!bridgeId || !transactionHash) {
      res.status(400).json({
        success: false,
        error: 'bridgeId and transactionHash are required'
      });
      return;
    }

    // This will be a long-running operation
    const depositStatus: DepositStatus = await depositService.waitForConfirmationAndProcess(
      bridgeId,
      transactionHash
    );

    res.json({
      success: true,
      data: depositStatus,
      message: 'Deposit completed successfully'
    });

  } catch (error) {
    console.error('Error in bridge confirmation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Deposit process failed'
    });
  }
});



export default router;