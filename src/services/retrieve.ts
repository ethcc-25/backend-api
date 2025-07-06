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
     * @param sourceDomain - The source chain domain ID
     * @returns Promise<AttestationMessage> - The attestation message
     */
    async retrieveAttestation(
        transactionHash: string,
        sourceDomain: number
    ): Promise<AttestationMessage | null> {
        console.log(`Retrieving attestation for transaction: ${transactionHash} from domain: ${sourceDomain}`);

        if (!transactionHash || transactionHash.length < 10) {
            throw new Error('Invalid transaction hash provided');
        }

        // Validate sourceDomain parameter
        if (typeof sourceDomain !== 'number') {
            throw new Error('Source domain must be a number');
        }

        if (sourceDomain == 10){
            sourceDomain = 2; // Use Optimism domain ID for CCTP
        }

        const url = `${this.getBaseUrl()}/${sourceDomain}?transactionHash=${transactionHash}`;

        console.log('attestation done', url);

        try {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log(response.data.messages[0].status);

            // Vérifie si l'attestation est complète
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