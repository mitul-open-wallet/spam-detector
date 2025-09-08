import { SolanaTransactionClientInterface } from "./solanaTransactionClient";
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector";
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector";
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector";
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector";
import { SolanaTransaction } from "../models/solanaTransaction";
import { th } from "zod/v4/locales/index.cjs";
import { AddressSimilarityDetector, SolanaThreatItem, SolanaThreatSummary } from "./SolanaSpamDetector/addressSimilarityDetector";

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
    addressSimilarityDetector: AddressSimilarityDetector

    constructor(
        solanaTransactionClient: SolanaTransactionClientInterface, 
        nativeDustingAttackDetector: NativeDustingAttackDetector,
        nftSpamDetector: NFTSpamDetector, 
        swapSpamDetector: SwapSpamDetector, 
        tokenSpamDetector: TokenSpamDetector,
        addressSimilarityDetector: AddressSimilarityDetector
    ) {
        this.solanaTransactionClient = solanaTransactionClient
        this.nativeDustingAttackDetector = nativeDustingAttackDetector
        this.nftSpamDetector = nftSpamDetector
        this.swapSpamDetector = swapSpamDetector
        this.tokenSpamDetector = tokenSpamDetector
        this.addressSimilarityDetector = addressSimilarityDetector
    }

    async findThreat(userAddress: string, targetAddress: string): Promise<SolanaThreatSummary> {
        const transactions = await this.solanaTransactionClient.fetch(userAddress)
        const lowerTargetAddress = targetAddress.toLowerCase()
        
        const transactionCollection = transactions.reduce((acc, tx) => {
            if (this.isUserReceivingFunds(tx, userAddress)) {
                acc.receivedTransactions.push(tx)
            } else {
                acc.sentTransactions.push(tx)
            }
            return acc
        }, new SolanaTransactionCollection())

        const spamResults = await Promise.all(
            transactionCollection.receivedTransactions.map(tx => this.categorisedAsSpam(tx, userAddress))
        )
        
        const incomingSpamTransactions = transactionCollection.receivedTransactions.filter((_, index) => spamResults[index])

        const incomingSpamAddresses = new Set<string>()
        incomingSpamTransactions.forEach(item => {
            item.nativeTransfers.forEach(transfer => incomingSpamAddresses.add(transfer.fromUserAccount.toLowerCase()))
            item.tokenTransfers.forEach(transfer => incomingSpamAddresses.add(transfer.fromUserAccount.toLowerCase()))
        })

        const validOutgoingAddresses = new Set<string>()
        transactionCollection.sentTransactions.forEach(item => {
            item.nativeTransfers.forEach(transfer => validOutgoingAddresses.add(transfer.toUserAccount))
            item.tokenTransfers.forEach(transfer => validOutgoingAddresses.add(transfer.toUserAccount))
        })

        const threatItems: SolanaThreatItem[] = []
        
        if (incomingSpamAddresses.has(lowerTargetAddress)) {
            threatItems.push({
                source: targetAddress,
                tragetAddress: targetAddress,
                description: "",
                type: "dusting-attack"
            })
        }

        const validOutgoingAddressArray = Array.from(validOutgoingAddresses)
        if (validOutgoingAddressArray.some(addr => addr.toLowerCase() === lowerTargetAddress)) {
            return {
                threatItems: [],
                isSafe: true
            }
        }

        const threatProfile = validOutgoingAddressArray.flatMap(item => 
            this.checkSimilarity(item, targetAddress)
        )
        
        const allThreats = [...threatItems, ...threatProfile]
        return {
            threatItems: allThreats,
            isSafe: allThreats.length === 0
        }
    }

    checkSimilarity(validOutgoingAddress: string, targetAddress: string): SolanaThreatItem[] {
        const lowerValidOutgoingAddress = validOutgoingAddress.toLowerCase()
        const lowerTragetAddress = targetAddress.toLowerCase()

        if (lowerValidOutgoingAddress === lowerTragetAddress) {
            return []
        }

        const threatItems: SolanaThreatItem[] = []
        const baseThreatItem = {
            source: validOutgoingAddress,
            tragetAddress: targetAddress,
            description: ""
        }

        const match = this.addressSimilarityDetector.compare(lowerValidOutgoingAddress, lowerTragetAddress)
        if (match) {
            threatItems.push({
                ...baseThreatItem,
                type: "matching-suffix-prefix"
            })
        }

        const longestMatch = this.addressSimilarityDetector.computeLongestMatch(lowerValidOutgoingAddress, lowerTragetAddress)
        if (longestMatch.totalMatches === longestMatch.threshold) {
            threatItems.push({
                ...baseThreatItem,
                type: "matching-sequences"
            })
        }

        const closeSubsitutions = this.addressSimilarityDetector.findSubstitutions(lowerValidOutgoingAddress, lowerTragetAddress)
        if (closeSubsitutions.length > 0) {
            const substitutionCount = closeSubsitutions.reduce((count, item) => count + item.length, 0)
            if (substitutionCount > 6) {
                threatItems.push({
                    ...baseThreatItem,
                    type: "character-subsitution"
                })
            }
        }

        return threatItems
    }

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