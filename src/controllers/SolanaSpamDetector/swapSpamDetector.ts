import { SolanaTransaction } from "../../models/solanaTransaction"
import { SolanaMetadataFetcher } from "../solanaMetadataFetcher"

export class SwapSpamDetector {
    private solanaMetaDataFetcher: SolanaMetadataFetcher

    constructor(solanaMetaDataFetcher: SolanaMetadataFetcher) {
        this.solanaMetaDataFetcher = solanaMetaDataFetcher
    }

    /**
     * Analyzes swap transactions to detect spam tokens involved in the swap
     * @param userAddress - The user's wallet address
     * @param transaction - The Solana transaction containing swap data
     * @returns Promise<boolean> - True if spam tokens are detected in the swap, false otherwise
     */
    async analyzeSwapTransactionForSpam(userAddress: string, transaction: SolanaTransaction): Promise<boolean> {
      const tokenransfers = transaction.tokenTransfers.filter(transfer => (transfer.toUserAccount === userAddress || transfer.fromUserAccount === userAddress))
      const mintAddresses = new Set(tokenransfers.map(item => item.mint))

      const mintAddresses1 = new Set(transaction.accountData
        .flatMap(item => item.tokenBalanceChanges)
        .filter(item => item.userAccount === userAddress)
        .map(item => item.mint)
      )

      const combinedMintAddresses = Array.from(new Set([...Array.from(mintAddresses), ...Array.from(mintAddresses1)]))

      const metadataItems = await this.solanaMetaDataFetcher.batchFetchTokenMetadata(combinedMintAddresses)
      return metadataItems.some(metadata => metadata.possibleSpam || metadata.isVerifiedContract === false)
    }
}