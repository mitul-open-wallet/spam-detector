import { SolanaTransactionClientInterface } from "./solanaTransactionClient";
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector";
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector";
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector";
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector";
import { SolanaTransaction } from "../models/solanaTransaction";
import { th } from "zod/v4/locales/index.cjs";

class SolanaTransactionCollection {
    receivedTransactions: SolanaTransaction[] 
    sentTransactions: SolanaTransaction[]

    constructor() {
        this.receivedTransactions = []
        this.sentTransactions = []
    }
}

export interface SpamReport {
    found: {
        txHash: string
        isSpam: boolean
    }[],
    notDetermined?: string[]
}


export class SolanaTransactionAnalyzer {
    solanaTransactionClient: SolanaTransactionClientInterface
    nativeDustingAttackDetector: NativeDustingAttackDetector
    tokenSpamDetector: TokenSpamDetector
    swapSpamDetector: SwapSpamDetector
    nftSpamDetector: NFTSpamDetector

    constructor(
        solanaTransactionClient: SolanaTransactionClientInterface, 
        nativeDustingAttackDetector: NativeDustingAttackDetector,
        nftSpamDetector: NFTSpamDetector, 
        swapSpamDetector: SwapSpamDetector, 
        tokenSpamDetector: TokenSpamDetector
    ) {
        this.solanaTransactionClient = solanaTransactionClient
        this.nativeDustingAttackDetector = nativeDustingAttackDetector
        this.nftSpamDetector = nftSpamDetector
        this.swapSpamDetector = swapSpamDetector
        this.tokenSpamDetector = tokenSpamDetector
    }

    async find(userAddress: string, targetAddress: string) {
        const transactions = await this.solanaTransactionClient.fetch(userAddress)
        const transactionCollection: SolanaTransactionCollection = await transactions.reduce((acc, tx) => {
            const isReceived = this.isUserReceivingFunds(tx, userAddress);
            if (isReceived) {
                acc.receivedTransactions.push(tx);

            } else {
                acc.sentTransactions.push(tx);
            }
            return acc;
        }, new SolanaTransactionCollection());

        const receivedTransactions = transactionCollection.receivedTransactions
        const sentTransactions = transactionCollection.sentTransactions
        
        // const filtered = receivedTransactions
        console.log(`total: ${transactions.length} received: ${receivedTransactions.length} sent: ${sentTransactions.length}`)

        const incomingSpamTransactions: SolanaTransaction[] = await receivedTransactions.reduce(async (accPromise, tx) => {
            const acc = await accPromise;
            const isSpam = await this.categorisedAsSpam(tx, userAddress)
            if (isSpam) {
                acc.push(tx)
            }
            return acc;
        }, Promise.resolve([] as SolanaTransaction[]))

        console.log(`incomingSpamTransactions: ${incomingSpamTransactions.length}`)

        const incomingSpamAddresses = Array.from(
            new Set(
                incomingSpamTransactions.flatMap(item => [...item.nativeTransfers.map(item => item.fromUserAccount.toLowerCase()), ...item.tokenTransfers.map(item => item.fromUserAccount.toLowerCase())])
            )
        )
        // let isSpam = false
        // // not safe
        if (incomingSpamAddresses.includes(targetAddress.toLowerCase())) {
            return true
        }

        // // Future: Could implement sent transaction analysis here if needed
        // return isSpam

        // colect all outgoing addresses and find patterns
        return false
    }

    // fix
    private isUserReceivingFunds(transaction: SolanaTransaction, userAddress: string): boolean {
        const hasIncomingNativeTransfer = transaction.nativeTransfers.some(nativeTransfer => nativeTransfer.toUserAccount === userAddress)
        const hasIncomingTokenTransfer = transaction.tokenTransfers.some(tokenTransfer => tokenTransfer.toUserAccount === userAddress)
    
        const account = transaction.accountData.find(account => account.account === userAddress)
        let isIncomingAccountNativeBalance = account && (account.nativeBalanceChange > 0) 
    
        const tokenBalanceChanges = transaction.accountData.flatMap(account => account.tokenBalanceChanges)
        const tokenBalanceChangeItem = tokenBalanceChanges.find(balanceChange => balanceChange.userAccount === userAddress)
        const hasReceivedToken = tokenBalanceChangeItem && (parseInt(tokenBalanceChangeItem.rawTokenAmount.tokenAmount) > 0)
    
        const nftOwners = transaction.events.compressed?.map(item => item.newLeafOwner)
    
        const nativeInput = transaction.events.swap?.nativeInput
        const hasIncomingNativeTransferEvent = nativeInput?.account === userAddress && parseInt(nativeInput.amount) > 0
        const hasIncomingTokenTransferEvent  = transaction.events.swap?.tokenInputs.some(item => (item.userAccount === userAddress && parseInt(item.rawTokenAmount.tokenAmount) > 0))
        const isNFTBeingReceived = nftOwners?.some(owner => owner === userAddress)

        const response = (hasIncomingNativeTransfer || hasIncomingTokenTransfer) || (isIncomingAccountNativeBalance ?? false) || (hasReceivedToken ?? false) || (isNFTBeingReceived ?? false) || hasIncomingNativeTransferEvent || (hasIncomingTokenTransferEvent ?? false)
        return response
    }

    async isSpam(txHash: string, userAddress: string): Promise<boolean> {
        try {
            const solanaTransaction = await this.solanaTransactionClient.fetchTransactionDetails(txHash)
            const isSpam = await this.categorisedAsSpam(solanaTransaction, userAddress)
            console.log(`Solana: Tx Hash: ${txHash} user address" ${userAddress} isSpam: ${isSpam}`)
            return isSpam
        } catch {
            console.log("error")
            const error = new Error(`Transaction with hash ${txHash} not found for address ${userAddress}`)
            error.name = 'TRANSACTION_NOT_FOUND'
            throw error
        }
    }  

    async isSpamBulk(txHashes: string[], userAddress: string): Promise<SpamReport> {
        const solanaTransactions = await this.solanaTransactionClient.batchFetchTransactions(txHashes)
        const spamList = await Promise.all(
            solanaTransactions.map(async item => {
                return {
                    txHash: item.signature,
                    isSpam: await this.categorisedAsSpam(item, userAddress)
                }
            }
        )
        )
        const found = spamList.map(item => item.txHash)
        const undetermined = txHashes.filter(item => !found.includes(item))
        return {
            found: spamList,
            notDetermined: undetermined
        }
    }

    private async categorisedAsSpam(solanaTransaction: SolanaTransaction, userAddress: string) {
        const isUserReceivingFunds = this.isUserReceivingFunds(solanaTransaction, userAddress)
        if (!isUserReceivingFunds) {
            return false
        }
        const results = await Promise.all([
            this.nativeDustingAttackDetector.detectNativeDustingAttack(userAddress, solanaTransaction),
            this.tokenSpamDetector.detectSuspiciousIncomingTokens(userAddress, solanaTransaction),
            this.swapSpamDetector.analyzeSwapTransactionForSpam(userAddress, solanaTransaction),
            this.nftSpamDetector.analyzeNFTSpam(userAddress, solanaTransaction)
        ])
        return results.some(item => item)
    }
}