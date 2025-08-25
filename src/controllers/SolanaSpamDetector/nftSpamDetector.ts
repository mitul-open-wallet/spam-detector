import { th } from "zod/v4/locales/index.cjs"
import { SolanaMetadataFetcher } from "../solanaMetadataFetcher"
import { SolanaTransaction } from "../../models/solanaTransaction"

export class NFTSpamDetector {

    private solanaMetaDataFetcher: SolanaMetadataFetcher

    constructor(solanaMetaDataFetcher: SolanaMetadataFetcher) {
        this.solanaMetaDataFetcher = solanaMetaDataFetcher
    }

    /**
     * Analyzes compressed NFT transactions to detect spam based on collection metadata
     * @param userAddress - The user's wallet address
     * @param transaction - The Solana transaction to analyze
     * @returns Promise<boolean> - True if spam NFT is detected, false otherwise
     */
    async analyzeNFTSpam(userAddress: string, transaction: SolanaTransaction) {
      const nftMetadata = transaction.events.compressed?.flatMap(compressedNFTData => compressedNFTData.metadata.collection)
      if (nftMetadata) {
        const nftContractAddres = nftMetadata?.map(item => item.key)
        const metadataItems = await this.solanaMetaDataFetcher.batchFetchTokenMetadata(nftContractAddres)
        return metadataItems.some(metadata => metadata.possibleSpam || metadata.isVerifiedContract === false)
      } else {
        return false
      }
    }
}