import { Router, Request, Response } from 'express';
import { RetrieveService } from '../services/retrieve';
import { AttestationRequest, AttestationResponse } from '../types';

const router: Router = Router();
const retrieveService = new RetrieveService();

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