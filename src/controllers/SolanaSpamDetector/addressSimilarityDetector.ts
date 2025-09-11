export interface SolanaThreatSummary {
    threatItems: SolanaThreatItem[],
    isSafe: boolean
}

export type SolanaThreatType = "matching-suffix-prefix" | "character-subsitution" | "matching-sequences" | "dusting-attack"

export interface SolanaThreatItem {
    source: string
    tragetAddress: string
    description: string,
    type: SolanaThreatType
}

/**
 * Detector for identifying potentially malicious Solana addresses that are similar to legitimate ones.
 * Uses various techniques including prefix/suffix matching, character substitution detection,
 * and sequence matching to identify potential address spoofing attempts.
 */
export class AddressSimilarityDetector {
    confusingPairs = [
        ['0', 'O'], ['0', 'o'], ['O', 'o'],
        ['1', 'l'], ['1', 'I'], ['l', 'I'],
        ['5', 'S'], ['5', 's'],
        ['6', 'G'], ['6', 'b'],
        ['8', 'B'],
        ['9', 'g'], ['9', 'q'],
        ['m', 'n'], ['r', 'n'],
        ['u', 'v'], ['w', 'vv']
    ];

    private confusingPairsMap = new Map<string, string[]>();

    /**
     * Initializes the detector and builds the confusing pairs map for character substitution detection.
     */
    constructor() {
        this.buildConfusingPairsMap();
    }

    /**
     * Builds a bidirectional map of visually similar characters that could be used in spoofing attacks.
     * Each character maps to an array of characters it could be confused with.
     * @private
     */
    private buildConfusingPairsMap() {
        for (const [char1, char2] of this.confusingPairs) {
            if (!this.confusingPairsMap.has(char1)) {
                this.confusingPairsMap.set(char1, []);
            }
            if (!this.confusingPairsMap.has(char2)) {
                this.confusingPairsMap.set(char2, []);
            }
            this.confusingPairsMap.get(char1)!.push(char2);
            this.confusingPairsMap.get(char2)!.push(char1);
        }
    }

    /**
     * Compares two addresses to determine if they are suspiciously similar.
     * Checks for matching prefixes/suffixes and middle sections that could indicate spoofing.
     * @param userAddress - The user's legitimate address
     * @param targetAddress - The potentially malicious address to check
     * @returns true if the addresses are suspiciously similar, false otherwise
     */
    compare(userAddress: string, targetAddress: string): boolean {
        const lowerUser = userAddress.toLowerCase();
        const lowerTarget = targetAddress.toLowerCase();

        if (lowerUser === lowerTarget) {
            return false;
        }

        const minLength = Math.min(lowerUser.length, lowerTarget.length);
        if (minLength < 16) {
            return false;
        }

        const prefixMatch = lowerUser.slice(0, 4) === lowerTarget.slice(0, 4);
        const suffixMatch = lowerUser.slice(-4) === lowerTarget.slice(-4);
        
        if (prefixMatch && suffixMatch) {
            return true;
        }

        return lowerUser.slice(8, -8) === lowerTarget.slice(8, -8);
    }
    

    /**
     * Finds character substitutions between two addresses using visually confusing characters.
     * Identifies positions where characters differ but could be visually confused.
     * @param userAddress - The user's legitimate address
     * @param targetAddress - The potentially malicious address to analyze
     * @returns Array of character pairs [userChar, targetChar] where substitutions occurred
     */
    findSubstitutions(userAddress: string, targetAddress: string): string[][] {
        const pattern: string[][] = [];
        const minLength = Math.min(userAddress.length, targetAddress.length);
        
        for (let i = 0; i < minLength; i++) {
            const userChar = userAddress[i];
            const targetChar = targetAddress[i];
            
            if (userChar !== targetChar) {
                const confusingChars = this.confusingPairsMap.get(userChar);
                if (confusingChars?.includes(targetChar)) {
                    pattern.push([userChar, targetChar]);
                }
            }
        }
        
        return pattern;
    }

    /**
     * Computes the longest matching sequences between two addresses.
     * Analyzes consecutive character matches to identify potential spoofing patterns.
     * @param realAddress - The legitimate address to compare against
     * @param destinationAddress - The address to analyze for similarities
     * @returns Object containing matching sequences, longest match length, total matches, and threshold
     */
    computeLongestMatch(realAddress: string, destinationAddress: string) {
        const lowerReal = realAddress.toLowerCase();
        const lowerDest = destinationAddress.toLowerCase();
        const minLength = Math.min(lowerReal.length, lowerDest.length);
        
        if (minLength === 0) {
            return {
                matchingSequence: [],
                longestMatch: 0,
                totalMatches: 0,
                threshold: 3
            };
        }
        
        const sequences: string[] = [];
        let start = -1;
        let longestLength = 0;
        let totalMatches = 0;
        
        for (let i = 0; i < minLength; i++) {
            if (lowerReal[i] === lowerDest[i]) {
                if (start === -1) start = i;
                totalMatches++;
            } else {
                if (start !== -1) {
                    const sequenceLength = i - start;
                    if (sequenceLength > 1) {
                        const sequence = lowerReal.substring(start, i);
                        sequences.push(sequence);
                        longestLength = Math.max(longestLength, sequenceLength);
                    }
                    start = -1;
                }
            }
        }
        
        if (start !== -1) {
            const sequenceLength = minLength - start;
            if (sequenceLength > 1) {
                const sequence = lowerReal.substring(start, minLength);
                sequences.push(sequence);
                longestLength = Math.max(longestLength, sequenceLength);
            }
        }
        
        return {
            matchingSequence: sequences,
            longestMatch: longestLength,
            totalMatches,
            threshold: 3
        };
    }
}