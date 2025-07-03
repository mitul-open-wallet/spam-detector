import { NativeOrContract } from "../models/blockchian"
import { TransactionsFetcher } from "./transactionsFetcher"

export class SpamDetector {

    transactionsFetcher: TransactionsFetcher

    constructor() {
        this.transactionsFetcher = TransactionsFetcher.getInstance()
    }

    async isSpam(txHash: string, userAdrress: string): Promise<boolean> {
        const transaction = await this.transactionsFetcher.findTransaction(txHash, userAdrress)
        return this.transactionsFetcher.isSuspicious(transaction)
    }

    async findInfections(userAdrress: string, targetAddress: string | undefined = undefined): Promise<NativeOrContract[]> {
        return await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
    }

    async findAccidentalTransactions(userAddress: string) {
        return await this.transactionsFetcher.findAccidentalTransactions(userAddress)
    }
}