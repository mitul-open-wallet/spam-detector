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
        const infections = await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
        console.log(`${infections.length} found for address: ${userAdrress}`)
        return infections
    }

    async findAccidentalTransactions(userAddress: string) {
        return await this.transactionsFetcher.findAccidentalTransactions(userAddress)
    }
}