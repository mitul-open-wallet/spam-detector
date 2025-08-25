import { SolanaTransaction } from "../../models/solanaTransaction"

export class NativeDustingAttackDetector {

    /**
     * Determines if a SOL amount is considered "dust" (very small amount used in dusting attacks)
     * @param amount - The SOL amount to check (in lamports)
     * @returns boolean - True if the amount is considered dust, false otherwise
     */
    private isDust(amount: number): boolean {
        const SOLANA_DECIMALS = 9
        const DUST_THRESHOLD_EXPONENT = 7
        const dustThreshold = Math.pow(10, SOLANA_DECIMALS - DUST_THRESHOLD_EXPONENT)
  
        return amount <= dustThreshold
    }

    /**
     * Detects native SOL dusting attacks where multiple recipients receive identical small amounts
     * @param userAddress - The user's wallet address
     * @param transaction - The Solana transaction to analyze
     * @returns Promise<boolean> - True if native dusting attack is detected, false otherwise
     */
    async detectNativeDustingAttack(userAddress: string, transaction: SolanaTransaction): Promise<boolean> {
    console.log(JSON.stringify(transaction))
      const { nativeTransfers } = transaction
      
      if (!nativeTransfers || nativeTransfers.length <= 1) {
        return false
      }
      
      const userTransfer = nativeTransfers.find(
        transfer => transfer.toUserAccount === userAddress
      )
      
      if (!userTransfer) {
        return false
      }
      
      const hasSameAmountAcrossAllTransfers = nativeTransfers.every(
        transfer => transfer.amount === userTransfer.amount
      )
      
      return hasSameAmountAcrossAllTransfers && this.isDust(userTransfer.amount)
    }
}