import axios from 'axios';
import dotenv from 'dotenv';
import { AttestationMessage } from '../types';
import { getApiUrl } from '../config/cctp';

dotenv.config();

export class RetrieveService {
    private readonly isTestnet = process.env.NODE_ENV !== 'production'; // Use testnet by default

    /**
     * Get the base URL for CCTP API
     */
    private getBaseUrl(): string {
        return getApiUrl(this.isTestnet);
    }

    /**
     * Retrieve CCTP attestation for a given transaction hash
     * @param transactionHash - The transaction hash from the burn transaction
     * @param chainSource - The source chain name
     * @returns Promise<AttestationMessage> - The attestation message
     */
    async retrieveAttestation(
        transactionHash: string,
        chainSource: string
    ): Promise<AttestationMessage | null> {
        console.log(`Retrieving attestation for transaction: ${transactionHash} from chain: ${chainSource}`);

        if (!transactionHash || transactionHash.length < 10) {
            throw new Error('Invalid transaction hash provided');
        }

        // Map chain name to domain ID
        const domainMapping: Record<string, number> = {
            'ethereum': this.isTestnet ? 0 : 0,
            'arbitrum': this.isTestnet ? 3 : 3,
            'base': this.isTestnet ? 6 : 6,
            'world': 0 // Default to 0 for world chain
        };

        const sourceDomain = domainMapping[chainSource.toLowerCase()] ?? 0;
        const url = `${this.getBaseUrl()}/${sourceDomain}?transactionHash=${transactionHash}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(response.data.messages[0].status);

            // Vérifie si l’attestation est complète
            if (response.data && response.data.messages[0].status === "complete") {
                return {
                    status: response.data.messages[0].status,
                    message: response.data.messages[0].message,
                    attestation: response.data.messages[0].attestation,
                    eventNonce: response.data.messages[0].eventNonce
                };
            } else {
                console.log(`⏳ Attestation not ready yet`);
                return null;  // Pas prête
            }

        } catch (error) {
            console.error(`Error fetching attestation:`, error instanceof Error ? error.message : 'Unknown error');

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    console.log('Transaction not found');
                    return null;  // Transaction introuvable
                }
            }

            throw new Error(`Failed to retrieve attestation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}