import { AlgorithmController, CharacterMatch, LongestMatch, PrefixSuffixMatchPercentage, VisualTricks, WeightedMatch, ThreatElement, AttributeType } from "./threatDetectionAlgorithm";
import { SpamDetector } from "./spamDetector";
import EvmChain, { EvmAddress } from "@moralisweb3/common-evm-utils";
import { NativeOrContract } from "../models/blockchian";

interface ThreatSummary {
    explainer: string,
    profile: ThreatProfile[]
}

interface ThreatProfile {
    validAddress: string
    tragetAddress: string
    threatItems: ThreatItem[]
}

interface ThreatItem {
    description: string,
    type: string
}

export class ThreatDetectionEngine {
    spamDetector: SpamDetector
    algorithm: AlgorithmController

    constructor() {
        this.spamDetector = new SpamDetector()
        this.algorithm = new AlgorithmController()
    }

    /**
     * Determines whether a specific transaction is classified as spam or malicious.
     * 
     * This method analyzes a transaction by its hash and associated user address to detect
     * potentially fraudulent activities such as airdrops, unverified contract interactions,
     * zero-value transfers, or transactions flagged as possible spam by blockchain analysis.
     * 
     * @param txHash - The transaction hash to analyze for spam characteristics
     * @param userAddress - The user's wallet address associated with the transaction
     * @returns A Promise that resolves to true if the transaction is spam, false otherwise
     * 
     * @example
     * ```typescript
     * const engine = new ThreatDetectionEngine();
     * const isSpamTransaction = await engine.isSpam(
     *   "0xabc123...",
     *   "0x1234567890123456789012345678901234567890"
     * );
     * if (isSpamTransaction) {
     *   console.log("This transaction is spam");
     * }
     * ```
     */
    async isSpam(txHash: string, userAddress: string): Promise<boolean> {
        const isSpam = await this.spamDetector.isSpam(txHash, userAddress)
        return isSpam
    }
    
    /**
     * Identifies poisoned or infected transactions associated with a user's wallet address.
     * 
     * This method searches through a user's transaction history to find suspicious transactions
     * that have been flagged as infected, typically involving unverified contracts, possible spam,
     * or other malicious activities. It can optionally filter results for a specific target address.
     * 
     * @param userAdrress - The user's wallet address to search for infected transactions
     * @param targetAddress - Optional specific address to filter infections for. If provided,
     *                       only returns infections involving this target address
     * @returns A Promise that resolves to an array of NativeOrContract objects representing
     *          infected transactions
     * 
     * @example
     * ```typescript
     * const engine = new ThreatDetectionEngine();
     * 
     * // Find all infections for a user
     * const allInfections = await engine.findInfections(
     *   "0x1234567890123456789012345678901234567890"
     * );
     * 
     * // Find infections involving a specific target address
     * const targetInfections = await engine.findInfections(
     *   "0x1234567890123456789012345678901234567890",
     *   "0x0987654321098765432109876543210987654321"
     * );
     * ```
     */
    async findInfections(userAdrress: string, targetAddress: string | undefined = undefined): Promise<NativeOrContract[]> {
        const infections = await this.spamDetector.findInfections(userAdrress, targetAddress)
        console.log(`${infections.length} found for address: ${userAdrress}`)
        return infections
    }
    
    /**
     * Detects transactions that may have been sent to poisoned addresses by mistake.
     * 
     * This method analyzes a user's transaction history to identify cases where they may have
     * accidentally sent funds to fraudulent addresses that are designed to mimic legitimate
     * addresses from their transaction history. It compares outgoing valid transactions with
     * transactions sent to known poisoned addresses to detect potential mistakes.
     * 
     * The detection algorithm:
     * 1. Retrieves all valid outgoing transactions from the user's history
     * 2. Identifies transactions sent to known poisoned/infected addresses
     * 3. Compares recipient addresses to find potential cases where the user may have
     *    confused a legitimate address with a similar-looking poisoned address
     * 
     * @param userAddress - The user's wallet address to analyze for accidental transactions
     * @returns A Promise that resolves to an array of NativeOrContract objects representing
     *          transactions that may have been sent to poisoned addresses by mistake
     * 
     * @example
     * ```typescript
     * const engine = new ThreatDetectionEngine();
     * const accidentalTxs = await engine.findAccidentalTransactions(
     *   "0x1234567890123456789012345678901234567890"
     * );
     * 
     * if (accidentalTxs.length > 0) {
     *   console.log(`Found ${accidentalTxs.length} potentially accidental transactions`);
     *   accidentalTxs.forEach(tx => {
     *     console.log(`Transaction ${tx.txHash} may have been sent to wrong address`);
     *   });
     * }
     * ```
     */
    async findAccidentalTransactions(userAddress: string) {
        return await this.spamDetector.findAccidentalTransactions(userAddress)
    }

    /**
     * Analyzes potential threats by comparing a target address against historical transactions
     * to detect possible address poisoning attacks and suspicious patterns.
     * 
     * @param userAddress - The user's wallet address to analyze historical transactions for
     * @param targetAddress - The target address to check for threats and suspicious patterns
     * @returns A Promise that resolves to a ThreatSummary containing threat analysis results
     * @throws Error if the target address has been involved in address poisoning attempts
     * 
     * @example
     * ```typescript
     * const engine = new ThreatDetectionEngine();
     * const summary = await engine.findThreat(
     *   "0x1234567890123456789012345678901234567890",
     *   "0x0987654321098765432109876543210987654321"
     * );
     * ```
     */
    async findThreat(userAddress: string, targetAddress: string): Promise<ThreatSummary> {
        const infectedTransactions = await this.spamDetector.findInfections(userAddress, targetAddress)
        if (infectedTransactions.length !== 0) {
            //throw Error(`${targetAddress} has been involved in address poisoning attempt, do not send funds to this address`)
            return {
                explainer: `${targetAddress} has been involved in address poisoning attempt, do not send funds to this address`,
                profile: []
            }
        }

        const validTransactions = await this.spamDetector.validTransactions(userAddress)

        const found = validTransactions.some(transaction => {
            if (transaction.direction === "send") {
                return transaction.recipient.lowercase === targetAddress.toLowerCase()
            } else if (transaction.direction === "receive") {
                return transaction.sender.lowercase === targetAddress.toLowerCase()
            }
            return false
        })
        if (found) {
            return {
                explainer: "Since you have transacted with this address before, it appears safe to send funds to this address at this time",
                profile: []
            }
        }

        let threatProfiles: ThreatProfile[] = []
        
        validTransactions.forEach(transaction => {
            let subject: EvmAddress | undefined

            if (transaction.direction === "send") {
                subject = transaction.recipient
            } else if (transaction.direction === "receive") {
                subject = transaction.sender
            } else {
                subject = undefined
            }

            const subjectEthereumAddress = (subject as EvmAddress).lowercase
            let lowerCaseTragetAddress = targetAddress.toLowerCase()

            if (subjectEthereumAddress !== lowerCaseTragetAddress) {
                let sourceAddress = subjectEthereumAddress

                let threats = this.analyseThreat(sourceAddress, lowerCaseTragetAddress)
                .filter(item => item !== undefined)

                if (threats.length !== 0) {
                    threatProfiles.push({
                        validAddress: sourceAddress,
                        tragetAddress: lowerCaseTragetAddress,
                        threatItems: threats
                    })
                }
            }
        })
        return {
            explainer: "Target addresses are fraudulent addresses that are crafted to appear nearly identical to valid addresses from the user's transaction history, typically differing by only a few characters to deceive users into sending funds to the wrong recipient.",
            profile: threatProfiles
        }
    }

    private analyseThreat(source: string, destination: string): ThreatItem[] {
        return [  
            this.algorithm.totalCharacterMatch(source, destination),
            this.algorithm.weightedMatch(source, destination),
            this.algorithm.detectVisualTricks(source, destination),
            this.algorithm.computePrefixSuffixMatch(source, destination),
            this.algorithm.computeLongestMatch(source, destination)
        ].map(item => {
            return this.detectThreatBasedOnThreshold(item)
        })
        .filter(item => {
            return item !== undefined
        })
    }

    private detectThreatBasedOnThreshold(threat: ThreatElement): ThreatItem | undefined {
        switch (threat.attributeType) {
            case AttributeType.longestMatch:
                const longestMatch = threat as LongestMatch
                if (longestMatch.matchingSequence.length > longestMatch.threshold) {
                    return {
                        description: longestMatch.description,
                        type: attributeTypeExplaination(longestMatch.attributeType)
                    }
                }
                break;
            case AttributeType.prefixSuffixMatch:
                const prefixSuffixMatch = threat as PrefixSuffixMatchPercentage
                const threshold = prefixSuffixMatch.threshold
                if (prefixSuffixMatch.prefix >= threshold || prefixSuffixMatch.suffix >= threshold) {
                    return {
                        description: prefixSuffixMatch.description,
                        type: attributeTypeExplaination(prefixSuffixMatch.attributeType)
                    }
                }
                break;
            case AttributeType.rawCharacterMatch:
                const rawCharacterMatch = threat as CharacterMatch
                if (rawCharacterMatch.matchPercentage > rawCharacterMatch.threshold) {
                    return {
                        description: rawCharacterMatch.description,
                        type: attributeTypeExplaination(rawCharacterMatch.attributeType)
                    }
                }
                break;
            case AttributeType.visualTricks:
                const visualTricks = threat as VisualTricks
                if (visualTricks.visualTricks.length > visualTricks.threshold) {
                    return {
                        description: visualTricks.description,
                        type: attributeTypeExplaination(visualTricks.attributeType)
                    }
                }
                break;
            case AttributeType.wightedMatch:
                const wightedMatch = threat as WeightedMatch
                if (wightedMatch.score > wightedMatch.threshold) {
                    return {
                        description: wightedMatch.description,
                        type: attributeTypeExplaination(wightedMatch.attributeType)
                    }
                }
                break;
            default:
                console.warn(`Unknown attribute type: ${threat.attributeType}`);
                return undefined;
        }
        return undefined
    }
}

function attributeTypeExplaination(type: AttributeType) {
    switch (type) {
        case AttributeType.longestMatch:
            return "Longest Match"
        case AttributeType.prefixSuffixMatch:
            return "Prefix or suffix match"
        case AttributeType.rawCharacterMatch:
            return "Character Match"
        case AttributeType.visualTricks:
            return "Visual Tricks"
        case AttributeType.wightedMatch:
            return "Weighted Match"
    }
}