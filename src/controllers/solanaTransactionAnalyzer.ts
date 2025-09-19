import { SolanaTransactionClientInterface } from "./solanaTransactionClient";
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector";
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector";
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector";
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector";
import { SolanaTransaction } from "../models/solanaTransaction";
import { AddressSimilarityDetector, SolanaThreatItem, SolanaThreatSummary, SolanaThreatType } from "./SolanaSpamDetector/addressSimilarityDetector";

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


/**
 * Analyzer for detecting spam and threats in Solana transactions.
 * Combines multiple detection strategies including dusting attacks, token spam,
 * swap spam, NFT spam, and address similarity checks.
 */
export class SolanaTransactionAnalyzer {
    solanaTransactionClient: SolanaTransactionClientInterface
    nativeDustingAttackDetector: NativeDustingAttackDetector
    tokenSpamDetector: TokenSpamDetector
    swapSpamDetector: SwapSpamDetector
    nftSpamDetector: NFTSpamDetector
    addressSimilarityDetector: AddressSimilarityDetector

    /**
     * Initializes the transaction analyzer with required detectors and client.
     * @param solanaTransactionClient - Client for fetching Solana transaction data
     * @param nativeDustingAttackDetector - Detector for native SOL dusting attacks
     * @param nftSpamDetector - Detector for NFT-based spam
     * @param swapSpamDetector - Detector for swap-based spam
     * @param tokenSpamDetector - Detector for token spam
     * @param addressSimilarityDetector - Detector for similar addresses used in spoofing
     */
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

    /**
     * Analyzes potential threats between a user's transaction history and a target address.
     * Checks for dusting attacks, address similarity spoofing, and validates against known good addresses.
     * @param userAddress - The user's Solana address to analyze
     * @param targetAddress - The target address to check for threats
     * @returns Promise resolving to threat summary with detected threats and safety status
     */
    async findThreat(userAddress: string, targetAddress: string, enableOutgoingAddressCheck: boolean = false): Promise<SolanaThreatSummary> {    
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

        let threatItems: SolanaThreatItem[] = []
        
        if (incomingSpamAddresses.has(lowerTargetAddress)) {
            threatItems.push({
                source: targetAddress,
                tragetAddress: targetAddress,
                ...this.descriptionForThreatType("dusting-attack")
            })
        }

        if (enableOutgoingAddressCheck) {
            const validOutgoingAddresses = new Set<string>()
            transactionCollection.sentTransactions.forEach(item => {
                item.nativeTransfers.forEach(transfer => validOutgoingAddresses.add(transfer.toUserAccount))
                item.tokenTransfers.forEach(transfer => validOutgoingAddresses.add(transfer.toUserAccount))
            })

            const validOutgoingAddressArray = Array.from(validOutgoingAddresses)

            const threatProfile = validOutgoingAddressArray.flatMap(item => 
                this.checkSimilarity(item, targetAddress)
            )
            threatItems.push(...threatProfile)
        }

        const isSafe = threatItems.length === 0

        console.log(`Threat detection -> userAddress: ${userAddress} targetAddress: ${targetAddress} isSafe: ${isSafe}`)
        
        return {
            threatItems: threatItems,
            isSafe: isSafe
        }
    }

    /**
     * Checks for address similarity threats between a known valid address and target address.
     * Tests for matching prefixes/suffixes, character sequences, and visual character substitutions.
     * @param validOutgoingAddress - A known legitimate address from user's transaction history
     * @param targetAddress - The target address to check for similarity threats
     * @returns Array of detected threat items based on address similarity
     */
    checkSimilarity(validOutgoingAddress: string, targetAddress: string): SolanaThreatItem[] {
        const lowerValidOutgoingAddress = validOutgoingAddress.toLowerCase()
        const lowerTragetAddress = targetAddress.toLowerCase()

        if (lowerValidOutgoingAddress === lowerTragetAddress) {
            return []
        }

        const threatItems: SolanaThreatItem[] = []
        const baseThreatItem = {
            source: validOutgoingAddress,
            tragetAddress: targetAddress
        }

        const match = this.addressSimilarityDetector.compare(lowerValidOutgoingAddress, lowerTragetAddress)
        if (match) {
            threatItems.push({
                ...baseThreatItem,
                ...this.descriptionForThreatType("matching-suffix-prefix")
            })
        }

        const longestMatch = this.addressSimilarityDetector.computeLongestMatch(lowerValidOutgoingAddress, lowerTragetAddress)
        if (longestMatch.totalMatches === longestMatch.threshold) {
            threatItems.push({
                ...baseThreatItem,
                ...this.descriptionForThreatType("matching-sequences")
            })
        }

        const closeSubsitutions = this.addressSimilarityDetector.findSubstitutions(lowerValidOutgoingAddress, lowerTragetAddress)
        if (closeSubsitutions.length > 0) {
            const substitutionCount = closeSubsitutions.reduce((count, item) => count + item.length, 0)
            if (substitutionCount > 6) {
                threatItems.push({
                    ...baseThreatItem,
                    ...this.descriptionForThreatType("character-subsitution")
                })
            }
        }

        return threatItems
    }

    private descriptionForThreatType(type: SolanaThreatType) {
        let description: string
        switch (type) {
            case "character-subsitution":
                description = "Address uses similar characters to a known address, potentially attempting to deceive through visual substitution"
                break
            case "dusting-attack":
                description = "Address has sent you spam transactions (dusting attack) in the past"
                break
            case "matching-sequences":
                description = "Address contains matching character sequences with a known address, indicating possible spoofing"
                break
            case "matching-suffix-prefix":
                description = "Address has matching prefix or suffix with a known address, potentially attempting address spoofing"
                break
            default:
                description =  "Unknown threat type"
                break
        }
        return {
            type,
            description
        }
    }

    /**
     * Determines if a user is receiving funds in a given transaction.
     * Checks native transfers, token transfers, balance changes, NFT transfers, and swap events.
     * @param transaction - The Solana transaction to analyze
     * @param userAddress - The user's address to check for incoming funds
     * @returns true if the user is receiving funds, false otherwise
     * @private
     */
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

        return (hasIncomingNativeTransfer || hasIncomingTokenTransfer) || (isIncomingAccountNativeBalance ?? false) || (hasReceivedToken ?? false) || (isNFTBeingReceived ?? false) || hasIncomingNativeTransferEvent || (hasIncomingTokenTransferEvent ?? false)
    }

    /**
     * Determines if a specific transaction is spam for a given user.
     * @param txHash - The transaction hash to analyze
     * @param userAddress - The user's address for context
     * @returns Promise resolving to true if transaction is spam, false otherwise
     * @throws Error with name 'TRANSACTION_NOT_FOUND' if transaction cannot be found
     */
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

    /**
     * Analyzes multiple transactions in bulk to determine which are spam.
     * @param txHashes - Array of transaction hashes to analyze
     * @param userAddress - The user's address for context
     * @returns Promise resolving to spam report with found results and undetermined transactions
     */
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

    /**
     * Categorizes a transaction as spam using all available detection methods.
     * Only analyzes transactions where the user is receiving funds.
     * @param solanaTransaction - The transaction to analyze
     * @param userAddress - The user's address for context
     * @returns Promise resolving to true if any detector identifies the transaction as spam
     * @private
     */
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