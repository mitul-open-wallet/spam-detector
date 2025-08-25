import { SolanaMetadataFetcher } from "./solanaMetadataFetcher"
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector"
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector"
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector"
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector"
import { SolanaTransactionAnalyzer } from "./solanaTransactionAnalyzer"
import { SolanaTransactionClient } from "./solanaTransactionClient"

interface DetectorDependencies {
    solanaTransactionClient?: SolanaTransactionClient
    nativeDustingAttackDetector?: NativeDustingAttackDetector
    tokenSpamDetector?: TokenSpamDetector
    swapSpamDetector?: SwapSpamDetector
    nftSpamDetector?: NFTSpamDetector
}

export class SolanaTransactionAnalyzerFactory {
    static create(dependencies: DetectorDependencies = {}): SolanaTransactionAnalyzer {
        const metadataFetcher = new SolanaMetadataFetcher()
        const {
            solanaTransactionClient = new SolanaTransactionClient(),
            nativeDustingAttackDetector = new NativeDustingAttackDetector(),
            tokenSpamDetector = new TokenSpamDetector(metadataFetcher),
            swapSpamDetector = new SwapSpamDetector(metadataFetcher),
            nftSpamDetector = new NFTSpamDetector(metadataFetcher)
        } = dependencies

        return new SolanaTransactionAnalyzer(
            solanaTransactionClient,
            nativeDustingAttackDetector,
            nftSpamDetector,
            swapSpamDetector,
            tokenSpamDetector
        )
    }
}