import { NativeOrContract, ContractItem } from "../models/blockchian";
import { TransactionsFetcher } from "./transactionsFetcher";

export class ACDCContest {
    transactionFetchrer: TransactionsFetcher

    constructor(transactionFetchrer: TransactionsFetcher) {
        this.transactionFetchrer = transactionFetchrer
    }

    async pullReceivedTransactions(userAddress: string) {
        const allTransactions = (await this.transactionFetchrer.walletTransactions(userAddress))
        .filter(tx => tx.direction === "receive")

        const nativeTransactions =
        allTransactions.filter(tx => this.isContract(tx) === false)

        const contractTransactions =
        allTransactions
        .filter(tx => this.isContract(tx))
        .filter(tx => !tx.isSuspicious)

        let total = nativeTransactions.length + contractTransactions.length
        let allEligibleTransactions = [...nativeTransactions, ...contractTransactions]
        return allEligibleTransactions.map(tx => tx.sender)
    }

    private isContract(item: NativeOrContract): item is ContractItem {
        return ("isSuspicious" in item && "contractAddress" in item)
    }
}