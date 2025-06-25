import { NativeOrContract } from "../models/blockchian"
import { TransactionsFetcher } from "./transactionsFetcher"

export class SpamDetector {

    transactionsFetcher: TransactionsFetcher

    constructor() {
        this.transactionsFetcher = TransactionsFetcher.getInstance()
    }

    async isSpam(txHash: string, userAdrress: string): Promise<boolean> {
        const transaction = await this.transactionsFetcher.findTransaction(txHash, userAdrress)
        
        if (transaction.possibleSpam) {
            return true
        }
        
        return transaction.erc20Transfers.some(item => 
            item.possibleSpam || item.verifiedContract === false
        ) || transaction.nftTransfers.some(item => 
            item.possibleSpam || item.verifiedCollection === false
        )
    }

    async findInfections(userAdrress: string, targetAddress: string): Promise<NativeOrContract[]> {
        return await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
    }
}