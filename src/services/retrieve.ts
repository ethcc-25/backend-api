import axios from 'axios';
import dotenv from 'dotenv';
import { AttestationMessage } from '../types';
import { getApiUrl } from '../config/cctp';

dotenv.config();

export class RetrieveService {
    private readonly maxRetries = 20; // Maximum number of retries
    private readonly retryDelay = 5000; // 5 seconds between retries
    private readonly timeout = 30000; // 30 seconds timeout for HTTP requests
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
     * @param sourceDomain - The source domain ID (defaults to Ethereum Sepolia: 0)
     * @returns Promise<AttestationMessage> - The attestation message
     */
    async retrieveAttestation(
        transactionHash: string, 
        sourceDomain: number = 0
    ): Promise<AttestationMessage> {
        console.log(`Retrieving attestation for transaction: ${transactionHash}`);
        
        if (!transactionHash || transactionHash.length < 10) {
            throw new Error('Invalid transaction hash provided');
        }

        const url = `${this.getBaseUrl()}/${sourceDomain}?transactionHash=${transactionHash}`;
        let retryCount = 0;

        while (retryCount < this.maxRetries) {
            try {
                console.log(`Attempt ${retryCount + 1}/${this.maxRetries} - Fetching attestation...`);
                
                const response = await axios.get(url, {
                    timeout: this.timeout,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                // Check if attestation is available
                if (response.data && response.data.attestation && response.data.attestation !== 'PENDING') {
                    console.log('✅ Attestation retrieved successfully');
                    
                    // Return the complete attestation message from Circle API
                    return {
                        message: response.data.message,
                        eventNonce: response.data.eventNonce,
                        attestation: response.data.attestation,
                        decodedMessage: response.data.decodedMessage,
                        decodedMessageBody: response.data.decodedMessageBody,
                        cctpVersion: response.data.cctpVersion,
                        status: response.data.status
                    };
                } else {
                    console.log(`⏳ Attestation not ready yet (attempt ${retryCount + 1}/${this.maxRetries})`);
                    
                    // If not the last attempt, wait before retrying
                    if (retryCount < this.maxRetries - 1) {
                        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                    }
                }

                retryCount++;
                
                if (retryCount < this.maxRetries) {
                    console.log(`Waiting ${this.retryDelay / 1000} seconds before next attempt...`);
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                }

            } catch (error) {
                console.error(`Error fetching attestation (attempt ${retryCount + 1}):`, error instanceof Error ? error.message : 'Unknown error');
                
                if (axios.isAxiosError(error)) {
                    if (error.response?.status === 429) {
                        console.log('Rate limited, waiting longer...');
                        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * 2));
                    } else if (error.response?.status === 404) {
                        console.log('Transaction not found yet, continuing...');
                    } else if (error.response && error.response.status >= 500) {
                        console.log('Server error, retrying...');
                    } else {
                        throw new Error(`HTTP Error: ${error.response?.status} - ${error.response?.statusText}`);
                    }
                }
                
                retryCount++;
                
                if (retryCount < this.maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        throw new Error(`Failed to retrieve attestation after ${this.maxRetries} attempts. The transaction might not be finalized yet or the transaction hash might be incorrect.`);
    }

    /**
     * Get attestation status without waiting for completion
     * @param transactionHash - The transaction hash from the burn transaction
     * @param sourceDomain - The source domain ID (defaults to Ethereum Sepolia: 0)
     * @returns Promise<AttestationMessage | null> - The attestation message or null if not found
     */
    async getAttestationStatus(
        transactionHash: string, 
        sourceDomain: number = 0
    ): Promise<AttestationMessage | null> {
        console.log(`Getting attestation status for transaction: ${transactionHash}`);
        
        if (!transactionHash || transactionHash.length < 10) {
            throw new Error('Invalid transaction hash provided');
        }

        const url = `${this.getBaseUrl()}/${sourceDomain}?transactionHash=${transactionHash}`;

        try {
            const response = await axios.get(url, {
                timeout: this.timeout,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 && response.data) {
                // Return the complete attestation message from Circle API
                return {
                    message: response.data.message,
                    eventNonce: response.data.eventNonce,
                    attestation: response.data.attestation,
                    decodedMessage: response.data.decodedMessage,
                    decodedMessageBody: response.data.decodedMessageBody,
                    cctpVersion: response.data.cctpVersion,
                    status: response.data.status
                };
            }

            return null;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }
}