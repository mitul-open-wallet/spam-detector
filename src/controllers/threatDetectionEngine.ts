import { BaseAddressSimilarity, AlgorithmController, CharacterMatch, LongestMatch, PrefixSuffixMatchPercentage, VisualTricks, WeightedMatch, ThreatElement, AttributeType } from "./algorithm";
import { SpamDetector } from "./spamDetector";
import EvmChain, { EvmAddress } from "@moralisweb3/common-evm-utils";

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
            throw Error(`${targetAddress} has been involved in address poisoning attempt, do not send funds to this address`)
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
                explainer: "Target addresses are fraudulent addresses that are crafted to appear nearly identical to valid addresses from the user's transaction history, typically differing by only a few characters to deceive users into sending funds to the wrong recipient.",
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

            // source address should not be a part of infected set
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