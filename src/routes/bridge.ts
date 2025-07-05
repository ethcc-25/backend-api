import { Router, Request, Response } from 'express';
import { BridgeService } from '../services/bridge.service';
import { BridgeRequest, BridgeStatus } from '../types';

const router: Router = Router();
const bridgeService = new BridgeService();

/**
 * POST /api/bridge/initialize
 * Initialize a bridge request
 */
router.post('/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const bridgeRequest: BridgeRequest = req.body;

    // Validation
    if (!bridgeRequest.chainSource || !bridgeRequest.chainDest || 
        !bridgeRequest.userWallet || !bridgeRequest.amount || 
        !bridgeRequest.opportunity) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: chainSource, chainDest, userWallet, amount, opportunity'
      });
      return;
    }

    const bridgeStatus: BridgeStatus = await bridgeService.initializeBridge(bridgeRequest);

    res.json({
      success: true,
      data: bridgeStatus,
      message: 'Bridge request initialized'
    });

  } catch (error) {
    console.error('Error initializing bridge:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize bridge'
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
    const bridgeStatus: BridgeStatus = await bridgeService.waitForConfirmationAndProcess(
      bridgeId,
      transactionHash
    );

    res.json({
      success: true,
      data: bridgeStatus,
      message: 'Bridge completed successfully'
    });

  } catch (error) {
    console.error('Error in bridge confirmation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Bridge process failed'
    });
  }
});

/**
 * GET /api/bridge/status/:id
 * Get bridge status by ID
 */
router.get('/status/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bridgeStatus: BridgeStatus | null = await bridgeService.getBridgeStatus(id);

    if (!bridgeStatus) {
      res.status(404).json({
        success: false,
        error: 'Bridge status not found'
      });
      return;
    }

    res.json({
      success: true,
      data: bridgeStatus
    });

  } catch (error) {
    console.error('Error fetching bridge status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bridge status'
    });
  }
});

/**
 * GET /api/bridge/status/tx/:txHash
 * Get bridge status by transaction hash
 */
router.get('/status/tx/:txHash', async (req: Request, res: Response): Promise<void> => {
  try {
    const { txHash } = req.params;
    const bridgeStatus: BridgeStatus | null = await bridgeService.getBridgeStatusByTxHash(txHash);

    if (!bridgeStatus) {
      res.status(404).json({
        success: false,
        error: 'Bridge status not found for this transaction'
      });
      return;
    }

    res.json({
      success: true,
      data: bridgeStatus
    });

  } catch (error) {
    console.error('Error fetching bridge status by tx hash:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bridge status'
    });
  }
});

/**
 * GET /api/bridge/history/:userWallet
 * Get user bridge history
 */
router.get('/history/:userWallet', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userWallet } = req.params;
    const history: BridgeStatus[] = await bridgeService.getUserBridgeHistory(userWallet);

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    console.error('Error fetching bridge history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bridge history'
    });
  }
});

/**
 * GET /api/bridge/
 * API information
 */
router.get('/', (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      name: 'CCTP Bridge API',
      description: 'API for managing CCTP USDC bridge operations with yield opportunities',
      endpoints: {
        'POST /api/bridge/initialize': {
          description: 'Initialize a bridge request',
          body: {
            chainSource: 'string - Source chain name',
            chainDest: 'string - Destination chain name',
            userWallet: 'string - User wallet address',
            amount: 'string - Amount to bridge',
            opportunity: 'object - Yield opportunity details'
          }
        },
        'POST /api/bridge/wait-confirmation': {
          description: 'Wait for CCTP confirmation and process deposit',
          body: {
            bridgeId: 'string - Bridge request ID',
            transactionHash: 'string - Source transaction hash'
          }
        },
        'GET /api/bridge/status/:id': {
          description: 'Get bridge status by ID'
        },
        'GET /api/bridge/status/tx/:txHash': {
          description: 'Get bridge status by transaction hash'
        },
        'GET /api/bridge/history/:userWallet': {
          description: 'Get user bridge history'
        }
      },
      statuses: [
        'pending_attestation',
        'attestation_received', 
        'processing_deposit',
        'deposit_confirmed',
        'completed',
        'failed'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

export default router;