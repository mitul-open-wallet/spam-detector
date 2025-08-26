import dotenv from "dotenv";
import { AppConfig } from "./config.interface";

dotenv.config()

export const appConfig: AppConfig = (() => {
    return {
        port: process.env.PORT ?? "3000",
        moralisAPIKey: process.env.MORALIS_API_KEY ?? "",
        heliumAPIKey: process.env.HELIUM_API_KEY ?? "",
        solanaMetadataURL: (contractAddress: string) => {
            var metadataURL = process.env.SOLANA_METADATA_URL
            if (metadataURL) {
                return metadataURL.replace(`{contractAddress}`, contractAddress)
            }
            return ""
        },
        heliumBaseURL: (apiKey: string) => {
            var baseURL = process.env.HELIUM_BASE_URL ?? ""
            if (baseURL) {
               return baseURL.replace(`{heliumAPIKey}`, apiKey)
            }
            return ""
        }
    }
})()