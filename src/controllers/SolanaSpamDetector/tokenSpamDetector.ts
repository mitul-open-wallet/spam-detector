import { SolanaTransaction } from "../../models/solanaTransaction"
import { SolanaMetadataFetcherInterface } from "../solanaMetadataFetcher"

export class TokenSpamDetector {
    private solanaMetaDataFetcher: SolanaMetadataFetcherInterface

    constructor(solanaMetaDataFetcher: SolanaMetadataFetcherInterface) {
        this.solanaMetaDataFetcher = solanaMetaDataFetcher
    }

    /**
     * Detects suspicious incoming token transfers by analyzing token metadata
     * @param userAddress - The user's wallet address
     * @param transaction - The Solana transaction to analyze
     * @returns Promise<boolean> - True if suspicious incoming tokens are detected, false otherwise
     */
    async detectSuspiciousIncomingTokens(userAddress: string, transaction: SolanaTransaction): Promise<boolean> {
      const tokenTransferItems = transaction.tokenTransfers.filter(transfer => transfer.toUserAccount === userAddress)
      if (tokenTransferItems.length === 0) {
        return false
      }
      const uniqueMintAddresses = Array.from(new Set(tokenTransferItems.map(item => item.mint)))
      const tokenMetadata = await this.solanaMetaDataFetcher.batchFetchTokenMetadata(uniqueMintAddresses)
      return tokenMetadata.some(metadata => metadata.possibleSpam || metadata.isVerifiedContract === false)
    }


}