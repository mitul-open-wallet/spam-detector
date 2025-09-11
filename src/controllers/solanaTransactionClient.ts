import { appConfig } from "../config"
import { AppConfig } from "../config/config.interface"
import { SolanaTransaction } from "../models/solanaTransaction"

export interface SolanaTransactionClientInterface {
    fetchTransactionDetails(txHash: string): Promise<SolanaTransaction>
    batchFetchTransactions(txHashes: string[]): Promise<SolanaTransaction[]>
    fetch(address: string): Promise<SolanaTransaction[]>
}

export class SolanaTransactionClient implements SolanaTransactionClientInterface {

    constructor(private appConfig: AppConfig) {}

    async fetch(address: string): Promise<SolanaTransaction[]> {
      const url = appConfig.heliumTransactionsURL(address, this.appConfig.heliumAPIKey)
      const networkResponse = await fetch(url)
      return await networkResponse.json()
    }

    private async fetchTransaction(txHashes: string[]): Promise<SolanaTransaction[]> {
      const url = appConfig.heliumBaseURL(this.appConfig.heliumAPIKey)
      const networkResponse = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: txHashes
        })
      })
      return await networkResponse.json()
    }

    /**
     * Fetches detailed transaction data from Helius API
     * @param txHash - The transaction hash to fetch details for
     * @returns Promise<SolanaTransaction> - The transaction details from Helius API
     */
    async fetchTransactionDetails(txHash: string): Promise<SolanaTransaction> {
        let data: SolanaTransaction[] = await this.fetchTransaction([txHash])
        return data[0]
    }

    async batchFetchTransactions(txHashes: string[]): Promise<SolanaTransaction[]> {
      return await this.fetchTransaction(txHashes)
    }
}