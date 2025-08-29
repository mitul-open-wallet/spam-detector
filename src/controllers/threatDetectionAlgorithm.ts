
export enum AttributeType {
    prefixSuffixMatch,
    rawCharacterMatch,
    longestMatch,
    visualTricks,
    wightedMatch
}

export type ThreatElement = PrefixSuffixMatchPercentage | CharacterMatch | LongestMatch | VisualTricks | WeightedMatch

/**
 * Base interface for address comparison operations.
 * Contains the two Ethereum addresses being analyzed for potential poisoning attacks.
 */
export interface BaseAddressSimilarity {
    attributeType: AttributeType
    threshold: number
    description: string
}

/**
 * Result interface for prefix and suffix matching analysis.
 * Uses positional comparison technique to calculate similarity percentages
 * for the first 4 and last 4 characters of Ethereum addresses, which are
 * the most visually prominent parts users typically verify.
 */
export interface PrefixSuffixMatchPercentage extends BaseAddressSimilarity {
    prefix: number
    suffix: number
}

/**
 * Result interface for total character matching analysis.
 * Uses position-by-position comparison technique to count exact character
 * matches between two addresses, providing a basic similarity metric.
 */
export interface CharacterMatch extends BaseAddressSimilarity {
    count: number
    matchPercentage: number
}

/**
 * Result interface for longest consecutive sequence matching analysis.
 * Uses sequential pattern detection technique to identify the longest
 * continuous character sequences that match between addresses, useful
 * for detecting sophisticated poisoning attacks with long similar segments.
 */
export interface LongestMatch extends BaseAddressSimilarity {
    matchingSequence: string[]
}

/**
 * Result interface for visual similarity detection analysis.
 * Uses character substitution mapping technique to identify visually
 * similar characters (e.g., '0' vs 'O', '1' vs 'l') that attackers use
 * to create deceptive addresses that appear legitimate to human users.
 */
export interface VisualTricks extends BaseAddressSimilarity {
    visualTricks: string[]
}

/**
 * Result interface for weighted similarity scoring analysis.
 * Uses position-based weighting technique where characters at visually
 * prominent positions (beginning and end) receive higher weights,
 * providing a more sophisticated similarity score than simple character counting.
 */
export interface WeightedMatch extends BaseAddressSimilarity {
    score: number
}


export class AlgorithmController {

    /**
     * Computes the prefix and suffix match percentage between two Ethereum addresses.
     * This method is used to detect address poisoning attacks where malicious addresses
     * are crafted to have similar prefixes and suffixes to legitimate addresses.
     * 
     * @param subject1 - The first Ethereum address to compare (including 0x prefix)
     * @param subject2 - The second Ethereum address to compare (including 0x prefix)
     * @returns Object containing source address, destination address, prefix match percentage, and suffix match percentage
     * @throws Error if addresses have different lengths
     */
    async computePrefixSuffixMatch(subject1: string, subject2: string): Promise<PrefixSuffixMatchPercentage> {
        this.preCheck(subject1, subject2)
        let s1 = subject1.substring(2);
        let s2 = subject2.substring(2);
        let target = 4;

        let s1Prefix = s1.substring(0, target);
        let s2Prefix = s2.substring(0, target);


        let endIndex = Math.min(s1.length, s2.length);
        let suffixStartIndex = endIndex - target;

        let s1Suffix = s1.substring(suffixStartIndex, endIndex);
        let s2Suffix = s2.substring(suffixStartIndex, endIndex);

        if (subject1.length !== subject2.length) {
            throw new Error("address mismatch, length does not match");
        }

        let matchContainer: string[] = [];

        let matchContainer1: string[] = [];

        for (let i = 0; i < s1Prefix.length; i++) {
            if (s1Prefix[i] === s2Prefix[i]) {
                matchContainer.push(s1Prefix[i]);
            }
        }

        for (let i = 0; i < s1Suffix.length; i++) {
            if (s1Suffix[i] === s2Suffix[i]) {
                matchContainer1.push(s1Suffix[i]);
            }
        }

        // prefix match percentage
        let prefixMatchPercentage = (matchContainer.length / target) * 100
        let suffixMatchPercentage = (matchContainer1.length / target) * 100
        return {
            attributeType: AttributeType.prefixSuffixMatch,
            prefix: prefixMatchPercentage, 
            suffix: suffixMatchPercentage,
            threshold: 100,
            description: "Computes the prefix and suffix match percentage between two Ethereum addresses. This method is used to detect address poisoning attacks where malicious addresses are crafted to have similar prefixes and suffixes to legitimate addresses."
        }
    }

    /**
     * Calculates a weighted similarity score between two Ethereum addresses.
     * This method assigns higher weights to character positions that are more
     * visually prominent (beginning and end of address), making it effective
     * for detecting address poisoning attacks that rely on visual similarity.
     * 
     * @param address1 - The first Ethereum address to compare
     * @param address2 - The second Ethereum address to compare  
     * @returns Object containing source address, destination address, and weighted similarity score (0-100)
     */
    async weightedMatch(address1: string, address2: string): Promise<WeightedMatch> {
        let maxWeight = this.findMaxWeight(address1)
        let addressWeight = this.findWeight(address1, address2)
        let score = (addressWeight / maxWeight) * 100
        return {
            attributeType: AttributeType.wightedMatch,
            score: score,
            threshold: 40,
            description: "Calculates a weighted similarity score between two Ethereum addresses. This method assigns higher weights to character positions that are more visually prominent (beginning and end of address), making it effective for detecting address poisoning attacks that rely on visual similarity."
        }
    }

    /**
     * Calculates the maximum possible weight for an address based on position-based weighting.
     * Used as the denominator in weighted similarity calculations.
     * 
     * @param addr1 - The Ethereum address to calculate max weight for
     * @returns The maximum possible weight value
     */
    private findMaxWeight(address: string) {
        let slicedAdrress = address.substring(2);

        let firstHalf = slicedAdrress.substring(0, slicedAdrress.length / 2)
        let secondHalf = slicedAdrress.substring(slicedAdrress.length / 2)

        let weight: number[] = []

        for (let i = 0; i < firstHalf.length; i++) {
            weight.push(this.weight(i))
        }

        for (let i = 0; i < secondHalf.length; i++) {
            weight.push(this.weight(i))
        }

        return weight.reduce((acc, current) => acc + current, 0)
    }

    /**
     * Reverses a string by splitting into characters, reversing the array, and joining back.
     * 
     * @param str - The string to reverse
     * @returns The reversed string
     */
    private reverseString(str: string): string {
        return str.split('').reverse().join('');
    }

    /**
     * Assigns positional weights to characters in an address for weighted similarity calculations.
     * Higher weights are given to positions that are more visually prominent to users.
     * 
     * @param i - The character position index
     * @returns The weight value for the given position
     */
    private weight(i: number): number {
        if (i < 0 || i >= 20) return 0;
        if (i < 4) return 5;
        if (i < 8) return 4;
        if (i < 12) return 3;
        if (i < 16) return 2;
        return 1;
    }

    /**
     * Calculates the actual weighted similarity between two addresses by comparing
     * characters at corresponding positions and summing their weights.
     * 
     * @param addr1 - The first address to compare
     * @param addr2 - The second address to compare
     * @returns The total weight of matching characters
     */
    private findWeight(addr1: string, addr2: string) {
        this.preCheck(addr1, addr2)
        let address1 = addr1.substring(2)
        let address2 = addr2.substring(2)

        let address1FirsthHalf = address1.substring(0, address1.length / 2)
        let address1SecondHalf = address1.substring(address1.length / 2, address1.length)

        let address2FirsthHalf = address2.substring(0, address2.length / 2)
        let address2SecondHalf = address2.substring(address2.length / 2, address2.length)

        let weights: number[] = []

        for (let i = 0; i < address1FirsthHalf.length; i++) {
            if ((address1FirsthHalf[i] === address2FirsthHalf[i])){
                weights.push(this.weight(i))
            } 
        }

        for (let i = 0; i < address1FirsthHalf.length; i++) {
            if (this.reverseString(address1SecondHalf)[i] === this.reverseString(address2SecondHalf)[i]) {
                weights.push(this.weight(i))
            }
        }
        return weights.reduce((acc, current) => acc + current, 0)
    }

    /**
     * Identifies the longest consecutive matching character sequences between two addresses.
     * This method is particularly useful for detecting sophisticated address poisoning attacks
     * where attackers create addresses with long matching subsequences to fool users.
     * 
     * @param realAddress - The legitimate Ethereum address to compare against
     * @param destinationAddress - The potentially malicious address to analyze
     * @returns Object containing source address, destination address, and array of matching sequences
     */
    async computeLongestMatch(realAddress: string, destinationAddress: string): Promise<LongestMatch> {
        this.preCheck(realAddress, destinationAddress)
        const snippedRealAddress = realAddress.substring(2)
        const snippeddDestinationAddress = destinationAddress.substring(2)
        let longestSequences: string[] = [];
        let lastKnownIndex = 0;
        let lastItem = "";

        function add(item: string) {
            if (item.length > 1) {
                longestSequences.push(item);
            }
        }
        for (let i = 0; i < snippedRealAddress.length; i++) {
            if (snippedRealAddress[i] === snippeddDestinationAddress[i]) {
                if (((i - lastKnownIndex) === 1) || (lastKnownIndex === 0)) {
                    lastItem += snippedRealAddress[i];
                } else {
                    add(lastItem);
                    lastItem = "";
                }
            } else {
                add(lastItem);
                lastItem = "";
            }
            if (i === realAddress.length - 1) {
                add(lastItem);
            }
            lastKnownIndex = i;
        }

        return {
            attributeType: AttributeType.longestMatch,
            matchingSequence: longestSequences,
            threshold: 3,
            description: "Calculates the maximum possible weight for an address based on position-based weighting. Used as the denominator in weighted similarity calculations."
        }
    }

    /**
     * Counts the total number of characters that match at corresponding positions
     * between two Ethereum addresses. This provides a basic similarity metric
     * for detecting address poisoning attacks.
     * 
     * @param realAddress - The legitimate Ethereum address to compare against
     * @param fakeAddress - The potentially malicious address to analyze
     * @returns Object containing source address, destination address, and total character match count
     * @throws Error if addresses have different lengths
     */
    async totalCharacterMatch(realAddress: string, fakeAddress: string): Promise<CharacterMatch> {
        this.preCheck(realAddress, fakeAddress)
        const realAddressToMatch = realAddress.substring(2)
        const fakeAddressToMatch = fakeAddress.substring(2)
        let matchList: string[] = [];
        for (let i = 0; i < realAddressToMatch.length; i++) {
            if (realAddressToMatch[i] === fakeAddressToMatch[i]) {
                matchList.push(realAddressToMatch[i]);
            }
        }
        return {
            attributeType: AttributeType.rawCharacterMatch,
            count: matchList.length,
            matchPercentage: (matchList.length / realAddressToMatch.length) * 100,
            threshold: 25,
            description: "Counts the total number of characters that match at corresponding positions between two Ethereum addresses. This provides a basic similarity metric for detecting address poisoning attacks"
        }
    }

    /**
     * Validates that two strings have the same length before performing comparisons.
     * Throws an error if lengths don't match to prevent invalid comparisons.
     * 
     * @param string1 - The first string to check
     * @param string2 - The second string to check
     * @throws Error if strings have different lengths
     */
    private preCheck(string1: string, string2: string) {
        if (string1.length !== string2.length) {
            throw new Error("can't perform computation on two items with non matching string length")
        }
    }

    /**
     * Detects visual tricks used in address poisoning attacks, such as character
     * substitutions that appear similar to the human eye (e.g., '0' vs 'O', '1' vs 'l').
     * This method identifies positions where visually similar characters are used
     * to create deceptive addresses.
     * 
     * @param sourceAddress - The legitimate Ethereum address to compare against
     * @param destinationAddress - The potentially malicious address to analyze
     * @returns Object containing source address, destination address, and array of detected visual tricks
     * @throws Error if addresses have different lengths
     */
    async detectVisualTricks(sourceAddress: string, destinationAddress: string): Promise<VisualTricks> {
        this.preCheck(sourceAddress, destinationAddress)
        const tricks: string[] = [];

        // Check for character substitutions that look similar
        const similarChars: Record<string, string[]> = {
            '0': ['o', 'O'],
            '1': ['l', 'I'],
            '5': ['S'],
            '6': ['G'],
            '8': ['B'],
            'a': ['@'],
            'e': ['3'],
            'o': ['0'],
            'l': ['1', 'I']
        };

        for (let i = 0; i < Math.min(sourceAddress.length, destinationAddress.length); i++) {
            const char1 = sourceAddress[i].toLowerCase();
            const char2 = destinationAddress[i].toLowerCase();

            if (char1 !== char2) {
                if (similarChars[char1]?.includes(char2) || similarChars[char2]?.includes(char1)) {
                    tricks.push(`visual_substitution_${char1}_${char2}_at_${i}`);
                }
            }
        }

        return {
            attributeType: AttributeType.visualTricks,
            visualTricks: tricks,
            threshold: 3,
            description: "Detects visual tricks used in address poisoning attacks, such as character substitutions that appear similar to the human eye (e.g., '0' vs 'O', '1' vs 'l'). This method identifies positions where visually similar characters are used to create deceptive addresses"
        };
    }
}