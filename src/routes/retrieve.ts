import { Router, Request, Response } from 'express';
import { RetrieveService } from '../services/retrieve';
import { AttestationRequest, AttestationResponse } from '../types';
import { CCTP_DOMAINS, getSupportedDomains, getDomainId } from '../config/cctp';

const router: Router = Router();
const retrieveService = new RetrieveService();

/**
 * Helper function to determine domain ID from request
 */
function getDomainFromRequest(sourceDomain: any, domain: any): number {
  // Check if sourceDomain is provided as a number
  if (sourceDomain && !isNaN(Number(sourceDomain))) {
    return Number(sourceDomain);
  }
  
  // Check if domain is provided as a string name
  if (domain && typeof domain === 'string') {
    try {
      return getDomainId(domain);
    } catch (error) {
      // If chain name is not found, default to 0
      console.warn(`Unknown domain: ${domain}, defaulting to 0`);
    }
  }
  
  return 0; // Default to Ethereum Sepolia
}

/**
 * GET /api/retrieve/
 * API information endpoint - MUST BE FIRST
 */
router.get('/', (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      name: 'CCTP Attestation API',
      description: 'API for retrieving CCTP attestations for cross-chain USDC transfers',
      endpoints: {
        'GET /api/retrieve/attestation/:transactionHash': {
          description: 'Retrieve CCTP attestation (waits for completion)',
          query_params: {
            sourceDomain: 'number - Source domain ID (optional, defaults to 0)',
            domain: 'string - Domain name (optional, e.g. "ethereum-sepolia")'
          }
        },
        'GET /api/retrieve/status/:transactionHash': {
          description: 'Get current attestation status (no waiting)',
          query_params: {
            sourceDomain: 'number - Source domain ID (optional, defaults to 0)',
            domain: 'string - Domain name (optional, e.g. "ethereum-sepolia")'
          }
        },
        'POST /api/retrieve/attestation': {
          description: 'Retrieve CCTP attestation via POST request',
          body: {
            transactionHash: 'string - Transaction hash (required)',
            sourceDomain: 'number - Source domain ID (optional, defaults to 0)'
          }
        },
        'GET /api/retrieve/domains': {
          description: 'Get supported domain mappings'
        },
        'GET /api/retrieve/test/:transactionHash': {
          description: 'Test endpoint to see raw Circle API response'
        }
      },
      supported_domains: getSupportedDomains()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/retrieve/domains
 * Get supported domain mappings
 */
router.get('/domains', (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      domains: getSupportedDomains(),
      description: 'Supported CCTP domain mappings for different chains'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/retrieve/attestation/:transactionHash
 * Retrieve CCTP attestation for a transaction (waits for completion)
 */
router.get('/attestation/:transactionHash', async (req: Request, res: Response): Promise<void> => {
    try {
        const { transactionHash } = req.params;
        const { domain } = req.query;

        if (!transactionHash || transactionHash.length < 10) {
            res.status(400).json({
                success: false,
                error: 'Invalid transaction hash provided',
                timestamp: new Date().toISOString()
            } as AttestationResponse);
            return;
        }

        console.log(`Retrieving attestation for transaction: ${transactionHash}, domain: ${domain}`);

        const attestation = await retrieveService.retrieveAttestation(transactionHash, domain as string);

        if (attestation) {
            res.json({
                success: true,
                data: attestation,
                timestamp: new Date().toISOString()
            } as AttestationResponse);
        } else {
            res.status(404).json({
                success: false,
                error: 'Attestation not found or not ready yet',
                timestamp: new Date().toISOString()
            } as AttestationResponse);
        }

    } catch (error) {
        console.error('Error retrieving attestation:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve attestation',
            timestamp: new Date().toISOString()
        } as AttestationResponse);
    }
});



export default router;