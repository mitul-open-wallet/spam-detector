import dotenv from "dotenv";
import { AppConfig } from "./config.interface";

dotenv.config()

export const appConfig: AppConfig = (() => {
    return {
        port: process.env.PORT ?? "3000",
        moralisAPIKey: process.env.MORALIS_API_KEY ?? "",
        heliumAPIKey: process.env.HELIUM_API_KEY ?? "",
        solanaMetadataURL: (contractAddress: string) => {
            const solanaMetadataURL = "https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/metadata"
            return solanaMetadataURL.replace(`{contractAddress}`, contractAddress)
        },
        heliumBaseURL: (apiKey: string) => {
            const baseURL = "https://api.helius.xyz/v0/transactions?api-key=${heliumAPIKey}"
            return baseURL.replace(`{heliumAPIKey}`, apiKey)
        }
    }
})()