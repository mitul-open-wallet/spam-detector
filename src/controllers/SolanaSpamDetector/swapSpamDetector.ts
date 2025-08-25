import { SolanaTransaction } from "../../models/solanaTransaction"
import { SolanaMetadataFetcher, SolanaMetadataFetcherInterface } from "../solanaMetadataFetcher"

export class SwapSpamDetector {
    private solanaMetaDataFetcher: SolanaMetadataFetcherInterface

    constructor(solanaMetaDataFetcher: SolanaMetadataFetcherInterface) {
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

      const mintAddressesFromAccountData = new Set(transaction.accountData
        .flatMap(item => item.tokenBalanceChanges)
        .filter(item => item.userAccount === userAddress)
        .map(item => item.mint)
      )

      const combinedMintAddresses = Array.from(new Set([...Array.from(mintAddresses), ...Array.from(mintAddressesFromAccountData)]))

      const metadataItems = await this.solanaMetaDataFetcher.batchFetchTokenMetadata(combinedMintAddresses)
      return metadataItems.some(metadata => metadata.possibleSpam || metadata.isVerifiedContract === false)
    }
}