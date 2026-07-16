import { SolanaTransaction } from "../../models/solanaTransaction"

export class NativeDustingAttackDetector {

  /**
   * Determines if a SOL amount is considered "dust" (very small amount used in dusting attacks)
   * @param amount - The SOL amount to check (in lamports)
   * @returns boolean - True if the amount is considered dust, false otherwise
   */
  private isDust(amount: number): boolean {
    const SOLANA_DECIMALS = 9
    const DUST_THRESHOLD_EXPONENT = 6
    const dustThreshold = Math.pow(10, SOLANA_DECIMALS - DUST_THRESHOLD_EXPONENT)
    console.log("isDust", amount, dustThreshold)
    return amount <= dustThreshold
  }

  /**
   * Detects native SOL dusting attacks where multiple recipients receive identical small amounts
   * @param userAddress - The user's wallet address
   * @param transaction - The Solana transaction to analyze
   * @returns Promise<boolean> - True if native dusting attack is detected, false otherwise
   */
  async detectNativeDustingAttack(userAddress: string, transaction: SolanaTransaction): Promise<boolean> {
    const { nativeTransfers } = transaction
    if (!nativeTransfers) {
      return false
    }

    const userTransfer = nativeTransfers.find(
      transfer => transfer.toUserAccount === userAddress
    )

    if (!userTransfer) {
      return false
    }

    let hasSameAmountAcrossAllTransfers = false

    if (nativeTransfers.length > 1) {
      hasSameAmountAcrossAllTransfers = nativeTransfers.every(
        transfer => transfer.amount === userTransfer.amount
      )
    }

    const isDust = this.isDust(userTransfer.amount)

    console.log(`Solana nativeDustingAttackDetector: hasSameAmountAcrossAllTransfers: ${hasSameAmountAcrossAllTransfers}, isDust: ${isDust}`)

    if (hasSameAmountAcrossAllTransfers && isDust) {
      return true
    }
    
    return isDust
  }
}