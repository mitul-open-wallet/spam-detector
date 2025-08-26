import { appConfig } from "../config"
import { SolanaMetadata, SolanaTransaction } from "../models/solanaTransaction"

export interface SolanaTransactionClientInterface {
    fetchTransactionDetails(txHash: string): Promise<SolanaTransaction>
}

export class SolanaTransactionClient implements SolanaTransactionClientInterface{

    /**
     * Fetches detailed transaction data from Helius API
     * @param txHash - The transaction hash to fetch details for
     * @returns Promise<SolanaTransaction> - The transaction details from Helius API
     */
    async fetchTransactionDetails(txHash: string): Promise<SolanaTransaction> {
        const networkResponse = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${appConfig.heliumAPIKey}`, {
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

/**
 * Determines if a SOL amount is considered "dust" (very small amount used in dusting attacks)
 * @param amount - The SOL amount to check (in lamports)
 * @returns boolean - True if the amount is considered dust, false otherwise
 */
function isDust(amount: number): boolean {
  const SOLANA_DECIMALS = 9
  const DUST_THRESHOLD_EXPONENT = 7
  const dustThreshold = Math.pow(10, SOLANA_DECIMALS - DUST_THRESHOLD_EXPONENT)
  
  return amount <= dustThreshold
}