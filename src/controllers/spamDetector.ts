import { NativeOrContract } from "../models/blockchian"
import { TransactionsFetcher } from "./transactionsFetcher"

export class SpamDetector {

    transactionsFetcher: TransactionsFetcher

    constructor() {
        this.transactionsFetcher = TransactionsFetcher.getInstance()
    }

    async isSpam(txHash: string, userAdrress: string): Promise<boolean> {
        const transaction = await this.transactionsFetcher.findTransaction(txHash, userAdrress)
        const isSuspicious = this.transactionsFetcher.isSuspicious(transaction)
        console.log(`txHash: ${txHash} user-address: ${userAdrress} isSuspicious: ${isSuspicious}`)
        return isSuspicious
    }

    async findInfections(userAdrress: string, targetAddress: string): Promise<NativeOrContract[]> {
        return await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
    }
}