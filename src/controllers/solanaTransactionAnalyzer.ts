import { SolanaTransactionClientInterface } from "./solanaTransactionClient";
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector";
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector";
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector";
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector";
import { SolanaTransaction } from "../models/solanaTransaction";
import { time } from "console";
import { th } from "zod/v4/locales/index.cjs";

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

    private async isUserReceivingFunds(transaction: SolanaTransaction, userAddress: string): Promise<boolean> {
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

    async isSpam(txHash: string, userAddress: string): Promise<boolean> {
        try {
            console.time();
            const solanaTransaction = await this.solanaTransactionClient.fetchTransactionDetails(txHash)
            console.timeEnd()
            return await this.categosriedAsSpam(solanaTransaction, userAddress)
        } catch {
            console.log("error")
            const error = new Error(`Transaction with hash ${txHash} not found for address ${userAddress}`)
            error.name = 'TRANSACTION_NOT_FOUND'
            throw error
        }
    }  

    async isSpamBulk(txHashes: string[], userAddress: string) {
        const solanaTransactions = await this.solanaTransactionClient.batchFetchTransactions(txHashes)
        const spamList = await Promise.all(
            solanaTransactions.map(async item => {
                return {
                    "txHash": item.signature,
                    "isSpam": this.categosriedAsSpam(item, userAddress)
                }
            }
        )
        )
    }

    private async categosriedAsSpam(solanaTransaction: SolanaTransaction, userAddress: string) {
        const isUserReceivingFunds = await this.isUserReceivingFunds(solanaTransaction, userAddress)
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