import { appConfig } from "../config"
import { createClient, RedisClientType } from "redis"
import { AppConfig } from "../config/config.interface"
import { NativeOrContract } from "../models/blockchian"
import EvmChain, { EvmWalletHistoryTransaction } from "@moralisweb3/common-evm-utils"

export class RedisClient {

    private static instance?: RedisClient
    private redisClient: RedisClientType

    private constructor(appConfig: AppConfig) {
        this.redisClient = createClient({
            url: appConfig.redisURL
        })
        this.gatherLogs()
    }

    private gatherLogs() {
        this.redisClient.on("error", (error) => {
            console.error("Redis Client Error:", error)
        })

        this.redisClient.on("connect", () => {
            console.log("Redis Client Connected")
        })

        this.redisClient.on("reconnecting", () => {
            console.log("Redis Client Reconnecting")
        })

        this.redisClient.on("ready", () => {
            console.log("Redis Client Ready")
        })

        this.redisClient.on("error", (err) => {
            console.log("Redis Client Error:", err);
        });
    }

    static getInstance(appConfig: AppConfig) {
        if (!this.instance) {
            this.instance = new RedisClient(appConfig)
        }
        return this.instance
    }

    async connect() {
        try {
            await this.redisClient.connect()
        } catch (error) {
            throw error
        }
    }

    async saveTransaction(txHash: string, transaction: EvmChain.EvmWalletHistoryTransaction) {
        try {
            // TODO:- set TTL while saving data
            await this.redisClient.set(txHash, JSON.stringify(transaction))
        } catch (error) {
            throw error
        }
    }

    async queryTransaction(txHash: string): Promise<EvmChain.EvmWalletHistoryTransaction> {
        try {
            const transaction = await this.redisClient.get(txHash) as string
            if (!transaction) {
                throw new Error("Transaction not found in Redis")
            }
            return EvmWalletHistoryTransaction.fromJSON(JSON.parse(transaction))
        } catch (error) {
            console.log("not found in Redis")
            throw error
        }
    }

    async deleteTransaction(txHash: string) {
        try {
            await this.redisClient.del(txHash)
        } catch (error) {
            throw error
        }
    }
}
