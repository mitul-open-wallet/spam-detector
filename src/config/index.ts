import dotenv from "dotenv";
import { AppConfig } from "./config.interface";

dotenv.config()

export const appConfig: AppConfig = (() => {
    return {
        port: process.env.PORT ?? "3000",
        moralisAPIKey: process.env.MORALIS_API_KEY ?? ""
    }
})()