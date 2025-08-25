import { appConfig } from "../config"
import { SolanaMetadata } from "../models/solanaTransaction"


export interface SolanaMetadataFetcherInterface {
    fetchTokenMetadata(contractAddress: string): Promise<SolanaMetadata>
    batchFetchTokenMetadata(mintAddresses: string[]): Promise<SolanaMetadata[]> 
}

export class SolanaMetadataFetcher implements SolanaMetadataFetcherInterface {

    private metadataCache = new Map<string, SolanaMetadata>()

    async fetchTokenMetadata(contractAddress: string): Promise<SolanaMetadata> {
        if (this.metadataCache.has(contractAddress)) {
            return this.metadataCache.get(contractAddress)!
        }
        const url = `https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/metadata`
        let response = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-Key": appConfig.moralisAPIKey
            }
        })
        const result = await response.json()
        this.metadataCache.set(contractAddress, result)
        return result
    }

    async batchFetchTokenMetadata(mintAddresses: string[]): Promise<SolanaMetadata[]> {
      let responses = await Promise.allSettled(
        mintAddresses.map(item => this.fetchTokenMetadata(item))
      )
      return responses.filter(item => item.status === "fulfilled").flatMap(item => item.value)
    } 
}