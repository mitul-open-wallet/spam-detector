import Moralis from "moralis";
import EvmChain, { EvmAddress } from "@moralisweb3/common-evm-utils";
import { BaseTransactionItem, Blockchain, BlockchainTransactions, ContractItem, NativeOrContract } from "../models/blockchian";
import { appConfig } from "../config";
import { json } from "stream/consumers";

export class TransactionsFetcher {

    private chains = [
        Blockchain.ethereum,
        Blockchain.arbitrum,
        Blockchain.base,
        Blockchain.optimism,
        Blockchain.cronos,
        Blockchain.bsc,
        Blockchain.linea,
        Blockchain.polygon
    ]

    private isInitialised = false
    private static instance: TransactionsFetcher

    constructor() {}

    static getInstance() {
        if (!TransactionsFetcher.instance) {
            TransactionsFetcher.instance = new TransactionsFetcher()
        }
        return TransactionsFetcher.instance
    }

    async initDependencies(): Promise<void> {
        if (this.isInitialised) {
            return
        }
        try {
            await Moralis.start({
                apiKey: appConfig.moralisAPIKey
            })
            this.isInitialised = true
        } catch (error) {
            throw error
        }
    }

    async findTransaction(txhash: string, userAddress: string): Promise<EvmChain.EvmWalletHistoryTransaction> {
        if (this.isInitialised === false) {
            throw new Error("Moralis client is not initialised")
        }
        const blockchainTransactions = await this.allTransactions(userAddress)
        const filteredTransactions = blockchainTransactions
        .flatMap(blockchainTransaction => blockchainTransaction.transactions)
        .filter(item => item.hash === txhash)
        if (filteredTransactions.length === 0) {
            const error = new Error(`Transaction with hash '${txhash}' not found for address '${userAddress}'`)
            error.name = 'TRANSACTION_NOT_FOUND'
            throw error
        }
        return filteredTransactions[0]
    }

    private isContract(item: NativeOrContract): item is ContractItem {
        return ("isSuspicious" in item && "contractAddress" in item)
    }

    async findAccidentalTransactions(userAddress: string) {
        let lowercasedUserAddress = userAddress.toLowerCase()
        const validTransactions = await this.validTransactions(lowercasedUserAddress)
        const outgoingValidTransactions = validTransactions.filter(tx => tx.direction === "send")

        const detectPoisonedTransactions = await this.detectPoisonedTransactions(lowercasedUserAddress)
        const sentToPosionedAddress = detectPoisonedTransactions.filter(tx => tx.direction === "send")

        console.log(`poisoned: ${sentToPosionedAddress.length} -- valid: ${outgoingValidTransactions.length}`)

        let currentAddresses: EvmAddress[] = []

        let accidentalTransactions: NativeOrContract[] = []
        sentToPosionedAddress.forEach(tx => {
            let receiver = tx.recipient
            let itemFound = currentAddresses.some(item => item.equals(receiver))
            if (!itemFound) {
                currentAddresses.push(receiver)
                let foundTransaction = outgoingValidTransactions.find(transaction => {
                    let eqCheck = transaction.recipient.equals(receiver)
                    return eqCheck
                })
                if (foundTransaction) {
                    accidentalTransactions.push(foundTransaction)
                }
            }
        })
        return accidentalTransactions
    }

    private async validTransactions(userAddress: string): Promise<NativeOrContract[]> {
        let allTransactions = await this.walletTransactions(userAddress)
        return allTransactions.filter(item => {
            if (this.isContract(item)) {
                return !item.isSuspicious
            }
            return true
        })
    }

    async detectPoisonedTransactions(userAddress: string, targetAddress: string | undefined = undefined): Promise<NativeOrContract[]> {
        const allTransactions = await this.walletTransactions(userAddress)
        let contractTransactions = allTransactions
            .filter(item => this.isContract(item))
            .filter(item => item.isSuspicious)
        if (targetAddress !== undefined) {
            const targetAddressLower = targetAddress.toLowerCase()
            return contractTransactions.filter(item => item.recipient.lowercase === targetAddressLower || item.sender.lowercase === targetAddressLower)
        } else {
            return contractTransactions
        }
    }

    private async walletTransactions(userAddress: string): Promise<NativeOrContract[]> {
        if (!this.isInitialised) {
            throw new Error("Moralis client is not initialised")
        }
        
        const blockchainTransactions = await this.allTransactions(userAddress)
        return blockchainTransactions.flatMap(blockchainTransaction => {
            let chain = blockchainTransaction.blockchain
            return this.collectChainTransactions(chain, blockchainTransaction.transactions, userAddress)
        })
    }

    private collectChainTransactions(blockchain: Blockchain, allTransactions: EvmChain.EvmWalletHistoryTransaction[], userAddress: string): NativeOrContract[] {
        const nativeTxs = allTransactions.flatMap(item => 
            item.nativeTransfers.map(transfer => ({
                blockchain: blockchain,
                txHash: item.hash,
                tokenSymbol: transfer.tokenSymbol,
                value: transfer.value,
                decimal: 18,
                direction: transfer.direction,
                sender: transfer.fromAddress,
                recipient: transfer.toAddress
            } as BaseTransactionItem))
        )

        const erc20Transactions = allTransactions.flatMap(item =>
            item.erc20Transfers.map(transfer => ({
                blockchain: blockchain,
                txHash: item.hash,
                tokenSymbol: transfer.tokenSymbol,
                value: transfer.value,
                decimal: transfer.tokenDecimals,
                direction: userAddress.toLowerCase() === transfer.fromAddress.lowercase ? "send" : "receive",
                sender: transfer.fromAddress,
                recipient: transfer.toAddress,
                contractAddress: transfer.address,
                isSuspicious: this.isSuspicious(item)
            } as ContractItem))
        )

        const nftTransactions = allTransactions.flatMap(item => {
            return item.nftTransfers.map(transfer => ({
                blockchain: blockchain,
                txHash: item.hash,
                tokenSymbol: transfer.collectionLogo,
                value: transfer.value,
                decimal: 0,
                direction: userAddress.toLowerCase() === transfer.fromAddress.lowercase ? "send" : "receive",
                sender: transfer.fromAddress,
                recipient: transfer.toAddress,
                contractAddress: transfer.tokenAddress,
                isSuspicious: this.isSuspicious(item)
            } as ContractItem))
        })

        return [...nativeTxs, ...erc20Transactions, ...nftTransactions]
    }

    isSuspicious(item: EvmChain.EvmWalletHistoryTransaction): boolean {
        if (item.possibleSpam || item.methodLabel === "airdrop" || item.category === "airdrop") {
            return true;
        }

        if (item.nativeTransfers.length === 0 
            && item.erc20Transfers.length === 0 
            && item.nftTransfers.length === 0 
            && item.contractInteractions === undefined) {
            return true;
        }

        return item.erc20Transfers.some(transfer => this.isSuspiciousTransfer(transfer)) ||
           item.nftTransfers.some(transfer => this.isSuspiciousTransfer(transfer));
    }

    private isSuspiciousTransfer(transfer: EvmChain.EvmWalletHistoryErc20Transfer | EvmChain.EvmWalletHistoryNftTransfer): boolean {
        if (transfer.possibleSpam || transfer.value === "0") {
            return true;
        }
        if ('verifiedContract' in transfer) {
            return !transfer.verifiedContract;
        } else if ('verifiedCollection' in transfer) {
            return !transfer.verifiedCollection;
        }
        return false;  
    }

    private async allTransactions(userAddress: string): Promise<BlockchainTransactions[]> {
        let results = await Promise.allSettled(
            this.chains.map(chain => this.fetchTransactions(chain, userAddress))
        );
        let fulfilled = results.filter((result): result is PromiseFulfilledResult<BlockchainTransactions> => {
            return result.status === "fulfilled"
        })
        let transactions = fulfilled.flatMap(result => {
            return result.value
        })
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(`Failed to fetch result for ${this.chains[index]}`)
            }
        })
        return transactions   
    }

    private async fetchTransactions(blockchain: Blockchain, address: string): Promise<BlockchainTransactions>  {
        let cursor: undefined | string = undefined;
        let pageSize = 100;
        let walletTransactions: EvmChain.EvmWalletHistoryTransaction[] = [];
        let itearationIndex = 0;
        do {
            const result = await Moralis.EvmApi.wallets.getWalletHistory({
                "chain": blockchain,
                "order": "DESC",
                "address": address,
                "limit": 100,
                "cursor": cursor
            });
            let history = result.response;
            walletTransactions.push(...history.result);
            itearationIndex += 1;
            if (result.response.pageSize < pageSize) {
                break;
            }
            cursor = result.response.cursor;
        } while (cursor !== undefined);
        return { blockchain: blockchain, transactions: walletTransactions }
    }
}