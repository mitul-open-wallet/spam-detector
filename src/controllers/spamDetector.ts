import { Blockchain, NativeOrContract } from "../models/blockchian"
import { TransactionsFetcher } from "./transactionsFetcher"
import { RedisClient } from "../redis/redisClient"
import { AppConfig } from "../config/config.interface"
import { EvmWalletHistoryTransaction } from "@moralisweb3/common-evm-utils";

export class SpamDetector {

    transactionsFetcher: TransactionsFetcher
    redisClient: RedisClient

    constructor(appConfig: AppConfig) {
        this.transactionsFetcher = TransactionsFetcher.getInstance()
        this.redisClient = RedisClient.getInstance(appConfig)
    }

    async isSpam(txHash: string, userAddress: string, blockchain?: Blockchain): Promise<boolean> {
        let transaction: EvmWalletHistoryTransaction | null
        try {
            transaction = await this.redisClient.queryTransaction(txHash)
        } catch (error) {
            transaction = await this.transactionsFetcher.findTransaction(txHash, userAddress, blockchain)
            if (transaction) {
                await this.redisClient.saveTransaction(txHash, transaction)
            }
        }
        if (transaction) {
            const isSpam = this.transactionsFetcher.isSuspicious(transaction!)
            return isSpam
        }
        return false
    }

    async findInfections(userAdrress: string, targetAddress: string | undefined = undefined): Promise<NativeOrContract[]> {
        const infections = await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
        console.log(`${infections.length} found for address: ${userAdrress}`)
        return infections
    }

    async findAccidentalTransactions(userAddress: string) {
        return await this.transactionsFetcher.findAccidentalTransactions(userAddress)
    }

    async validTransactions(userAddress: string) {
        return await this.transactionsFetcher.validTransactions(userAddress)
    }
}