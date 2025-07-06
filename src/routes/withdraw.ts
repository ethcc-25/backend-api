import { Router, Request, Response } from 'express';
import { WithdrawService } from '../services/withdraw.service';
import { WithdrawRequest, WithdrawStatus } from '../types';

const router: Router = Router();
const withdrawService = new WithdrawService();

/**
 * POST /api/withdraw/initialize/:userAddress
 * Initialize withdraw process for a user (returns immediately after initWithdraw)
 */
router.post('/initialize/:userAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAddress } = req.params;

    // Validation
    if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
      res.status(400).json({
        success: false,
        error: 'Invalid user address format'
      });
      return;
    }

    console.log(`Starting withdraw initialization for user: ${userAddress}`);

    // Initialize the withdraw process (returns immediately after initWithdraw)
    const withdrawStatus: WithdrawStatus = await withdrawService.initializeWithdrawProcess(userAddress);

    res.json({
      success: true,
      data: withdrawStatus,
      message: 'Withdraw process initialized successfully. Attestation will be processed automatically.'
    });

  } catch (error) {
    console.error('Error in withdraw initialization:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize withdraw process'
    });
  }
});


/**
 * GET /api/withdraw/status/:withdrawId
 * Get withdraw status by ID
 */
router.get('/status/:withdrawId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { withdrawId } = req.params;

    if (!withdrawId) {
      res.status(400).json({
        success: false,
        error: 'Withdraw ID is required'
      });
      return;
    }

    const withdrawStatus = await withdrawService.getWithdrawStatus(withdrawId);

    if (!withdrawStatus) {
      res.status(404).json({
        success: false,
        error: 'Withdraw status not found'
      });
      return;
    }

    res.json({
      success: true,
      data: withdrawStatus,
      message: 'Withdraw status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting withdraw status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get withdraw status'
    });
  }
});

/**
 * GET /api/withdraw/user/:userAddress
 * Get all withdraw statuses for a user
 */
router.get('/user/:userAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAddress } = req.params;

    if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
      res.status(400).json({
        success: false,
        error: 'Invalid user address format'
      });
      return;
    }

    const withdrawStatuses = await withdrawService.getWithdrawStatusByUser(userAddress);

    res.json({
      success: true,
      data: withdrawStatuses,
      count: withdrawStatuses.length,
      message: 'User withdraw history retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user withdraw history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user withdraw history'
    });
  }
});

/**
 * GET /api/withdraw/check-position/:userAddress
 * Check if user has a position (without initiating withdraw)
 */
router.get('/check-position/:userAddress', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userAddress } = req.params;

    if (!userAddress || !userAddress.startsWith('0x') || userAddress.length !== 42) {
      res.status(400).json({
        success: false,
        error: 'Invalid user address format'
      });
      return;
    }

    const positionResult = await withdrawService.checkUserPosition(userAddress);

    if (!positionResult) {
      res.json({
        success: true,
        data: {
          hasPosition: false,
          position: null,
          chainDomain: null
        },
        message: 'No position found for this user'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasPosition: true,
        position: positionResult.position,
        chainDomain: positionResult.chainDomain
      },
      message: 'Position found'
    });
  } catch (error) {
    console.error('Error checking user position:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check user position'
    });
  }
});

export default router;