import { appConfig } from "../config"
import { AppConfig } from "../config/config.interface"
import { SolanaMetadata, SolanaTransaction } from "../models/solanaTransaction"

export interface SolanaTransactionClientInterface {
    fetchTransactionDetails(txHash: string): Promise<SolanaTransaction>
}

export class SolanaTransactionClient implements SolanaTransactionClientInterface {

    constructor(private appConfig: AppConfig) {}

    /**
     * Fetches detailed transaction data from Helius API
     * @param txHash - The transaction hash to fetch details for
     * @returns Promise<SolanaTransaction> - The transaction details from Helius API
     */
    async fetchTransactionDetails(txHash: string): Promise<SolanaTransaction> {
        const url = appConfig.heliumBaseURL(appConfig.heliumAPIKey)
        const networkResponse = await fetch(url, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactions: [txHash]
          })
        })
        let data: SolanaTransaction[] = await networkResponse.json()
        return data[0]
    }
}