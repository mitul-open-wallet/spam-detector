import { NativeOrContract } from "../models/blockchian"
import { TransactionsFetcher } from "./transactionsFetcher"

export class SpamDetector {

    transactionsFetcher: TransactionsFetcher

    constructor() {
        this.transactionsFetcher = TransactionsFetcher.getInstance()
    }

    async isSpam(txHash: string, userAdrress: string): Promise<boolean> {
        const transaction = await this.transactionsFetcher.findTransaction(txHash, userAdrress)
        
        if ((transaction.possibleSpam) || (transaction.methodLabel === "airdrop") || (transaction.category === "airdrop")) {
            return true
        }
        if (transaction.nativeTransfers.length === 0 
            && transaction.erc20Transfers.length === 0 
            && transaction.nftTransfers.length === 0 
            && transaction.contractInteractions === undefined) {
                return true
        }
        return transaction.erc20Transfers.some(item =>
            this.transactionsFetcher.isSuspiciousTransfer(item)
        ) || transaction.nftTransfers.some(item => 
            this.transactionsFetcher.isSuspiciousTransfer(item)
        )
    }

    async findInfections(userAdrress: string, targetAddress: string): Promise<NativeOrContract[]> {
        return await this.transactionsFetcher.detectPoisonedTransactions(userAdrress, targetAddress)
    }
}