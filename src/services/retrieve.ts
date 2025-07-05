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
     * Get CCTP domain number for a given chain
     */
    private getDomainNumber(chainSource: string): number {
        const domainMapping: Record<string, { testnet: number; mainnet: number }> = {
            'ethereum': { testnet: 0, mainnet: 0 },      // Ethereum Sepolia / Ethereum Mainnet
            'arbitrum': { testnet: 3, mainnet: 3 },      // Arbitrum Sepolia / Arbitrum One
            'base': { testnet: 6, mainnet: 6 },          // Base Sepolia / Base Mainnet
            'avalanche': { testnet: 1, mainnet: 1 },     // Avalanche Fuji / Avalanche C-Chain
            'optimism': { testnet: 2, mainnet: 2 },      // OP Sepolia / Optimism Mainnet
            'polygon': { testnet: 7, mainnet: 7 },       // Polygon Amoy / Polygon PoS
            'world': { testnet: 0, mainnet: 0 }          // Default to Ethereum domain
        };

        const chainConfig = domainMapping[chainSource.toLowerCase()];
        if (!chainConfig) {
            throw new Error(`Unsupported chain: ${chainSource}`);
        }

        return this.isTestnet ? chainConfig.testnet : chainConfig.mainnet;
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

        // Validate chainSource parameter
        if (!chainSource) {
            throw new Error('Chain source parameter is required');
        }

        const sourceDomain = this.getDomainNumber(chainSource);
        console.log(`Using domain ${sourceDomain} for chain ${chainSource} (testnet: ${this.isTestnet})`);

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