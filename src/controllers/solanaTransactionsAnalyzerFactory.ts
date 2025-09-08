import { appConfig } from "../config"
import { AppConfig } from "../config/config.interface"
import { SolanaMetadataFetcher, SolanaMetadataFetcherInterface } from "./solanaMetadataFetcher"
import { AddressSimilarityDetector } from "./SolanaSpamDetector/addressSimilarityDetector"
import { NativeDustingAttackDetector } from "./SolanaSpamDetector/nativeDustingAttackDetector"
import { NFTSpamDetector } from "./SolanaSpamDetector/nftSpamDetector"
import { SwapSpamDetector } from "./SolanaSpamDetector/swapSpamDetector"
import { TokenSpamDetector } from "./SolanaSpamDetector/tokenSpamDetector"
import { SolanaTransactionAnalyzer } from "./solanaTransactionAnalyzer"
import { SolanaTransactionClient, SolanaTransactionClientInterface } from "./solanaTransactionClient"

interface DetectorDependencies {
    solanaTransactionClient?: SolanaTransactionClientInterface
    metadataFetcher?: SolanaMetadataFetcherInterface
}

export class SolanaTransactionAnalyzerFactory {
    static create(dependencies: DetectorDependencies = {}): SolanaTransactionAnalyzer {
        const {
            solanaTransactionClient = new SolanaTransactionClient(appConfig),
            metadataFetcher = new SolanaMetadataFetcher(appConfig)
        } = dependencies

        return new SolanaTransactionAnalyzer(
            solanaTransactionClient,
            new NativeDustingAttackDetector(),
            new NFTSpamDetector(metadataFetcher),
            new SwapSpamDetector(metadataFetcher),
            new TokenSpamDetector(metadataFetcher),
            new AddressSimilarityDetector()
        )
    }
}