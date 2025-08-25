import { SolanaMetadata } from "../models/solanaTransaction"

export class SolanaMetadataFetcher {

    private metadataCache = new Map<string, SolanaMetadata>()

    async fetchTokenMetadata(contractAddress: string): Promise<SolanaMetadata> {
        if (this.metadataCache.has(contractAddress)) {
            return this.metadataCache.get(contractAddress)!
        }
        const url = `https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/metadata`
        let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjEwYTkwZGFjLTVlN2EtNGRjYy05MDk1LTQ5NmFlMDI3NzFkMyIsIm9yZ0lkIjoiMzY5ODAwIiwidXNlcklkIjoiMzgwMDYxIiwidHlwZUlkIjoiN2NkN2E2NDUtZGEzNC00ZmQ0LWFkZWQtNmEzNDQ1NzgxYTIyIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDM2NzA4MDAsImV4cCI6NDg1OTQzMDgwMH0.hTn488sD4BMlf7X6vtQL2onz953keGu3XH4u6NCn6nA' "
        let response = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-Key": apiKey
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