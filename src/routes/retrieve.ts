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
 * GET /api/retrieve/attestation/:transactionHash
 * Retrieve CCTP attestation for a transaction (waits for completion)
 */
router.get('/attestation/:transactionHash', async (req: Request, res: Response) => {
  try {
    const { transactionHash } = req.params;
    const { sourceDomain, domain } = req.query;

    // Validate transaction hash
    if (!transactionHash || transactionHash.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash provided',
        timestamp: new Date().toISOString()
      } as AttestationResponse);
    }

    // Determine source domain
    const domainId = getDomainFromRequest(sourceDomain, domain);

    console.log(`Retrieving attestation for transaction: ${transactionHash}, domain: ${domainId}`);

    const attestation = await retrieveService.retrieveAttestation(transactionHash, domainId);

    res.json({
      success: true,
      data: attestation,
      timestamp: new Date().toISOString()
    } as AttestationResponse);

  } catch (error) {
    console.error('Error retrieving attestation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve attestation',
      timestamp: new Date().toISOString()
    } as AttestationResponse);
  }
});

/**
 * GET /api/retrieve/status/:transactionHash
 * Get current attestation status without waiting for completion
 */
router.get('/status/:transactionHash', async (req: Request, res: Response) => {
  try {
    const { transactionHash } = req.params;
    const { sourceDomain, domain } = req.query;

    // Validate transaction hash
    if (!transactionHash || transactionHash.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash provided',
        timestamp: new Date().toISOString()
      } as AttestationResponse);
    }

    // Determine source domain
    const domainId = getDomainFromRequest(sourceDomain, domain);

    console.log(`Getting attestation status for transaction: ${transactionHash}, domain: ${domainId}`);

    const attestation = await retrieveService.getAttestationStatus(transactionHash, domainId);

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
    console.error('Error getting attestation status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get attestation status',
      timestamp: new Date().toISOString()
    } as AttestationResponse);
  }
});

/**
 * POST /api/retrieve/attestation
 * Retrieve CCTP attestation via POST request with JSON body
 */
router.post('/attestation', async (req: Request, res: Response) => {
  try {
    const { transactionHash, sourceDomain }: AttestationRequest = req.body;

    // Validate request body
    if (!transactionHash || transactionHash.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash provided',
        timestamp: new Date().toISOString()
      } as AttestationResponse);
    }

    const domainId = sourceDomain || 0; // Default to Ethereum Sepolia

    console.log(`Retrieving attestation for transaction: ${transactionHash}, domain: ${domainId}`);

    const attestation = await retrieveService.retrieveAttestation(transactionHash, domainId);

    res.json({
      success: true,
      data: attestation,
      timestamp: new Date().toISOString()
    } as AttestationResponse);

  } catch (error) {
    console.error('Error retrieving attestation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve attestation',
      timestamp: new Date().toISOString()
    } as AttestationResponse);
  }
});

/**
 * GET /api/retrieve/domains
 * Get supported domain mappings
 */
router.get('/domains', (req: Request, res: Response) => {
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
 * GET /api/retrieve/test/:transactionHash
 * Test endpoint to see the raw response structure from Circle API
 */
router.get('/test/:transactionHash', async (req: Request, res: Response) => {
  try {
    const { transactionHash } = req.params;
    const { sourceDomain, domain } = req.query;

    // Validate transaction hash
    if (!transactionHash || transactionHash.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction hash provided'
      });
    }

    // Determine source domain
    const domainId = getDomainFromRequest(sourceDomain, domain);
    console.log(`Testing with domain: ${domainId}, transaction: ${transactionHash}`);

    // Make direct API call to see raw response
    const axios = require('axios');
    const url = `https://iris-api-sandbox.circle.com/v2/messages/${domainId}?transactionHash=${transactionHash}`;
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      message: 'Raw API response from Circle CCTP',
      data: {
        url: url,
        status: response.status,
        headers: response.headers,
        rawResponse: response.data
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      success: false,
      message: 'Test API call failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/retrieve/
 * API information endpoint
 */
router.get('/', (req: Request, res: Response) => {
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
        }
      },
      supported_domains: getSupportedDomains()
    },
    timestamp: new Date().toISOString()
  });
});

export default router;