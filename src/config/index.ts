import dotenv from "dotenv";
import { AppConfig } from "./config.interface";

dotenv.config()

export const appConfig: AppConfig = (() => {
    return {
        port: process.env.PORT ?? "3000",
        moralisAPIKey: process.env.MORALIS_API_KEY ?? "",
        heliumAPIKey: process.env.HELIUM_API_KEY ?? "",
        solanaMetadataURL: (contractAddress: string) => {
            return `https://solana-gateway.moralis.io/token/mainnet/${contractAddress}/metadata`
        },
        heliumBaseURL: (apiKey: string) => {
            return `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`
        }
    }
})()