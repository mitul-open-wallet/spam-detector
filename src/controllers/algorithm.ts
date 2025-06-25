export class AlgorithmController {

    computePrefixSuffixMatch(subject1: string, subject2: string) {
        let s1 = subject1.substring(2);
        let s2 = subject2.substring(2);
        let target = 4;

        let s1Prefix = s1.substring(0, target);
        let s2Prefix = s2.substring(0, target);

        let endIndex = s1.length - 1;
        let suffixStartIndex = endIndex - target;

        let s1Suffix = s1.substring(suffixStartIndex, endIndex);
        let s2Suffix = s2.substring(suffixStartIndex, endIndex);

        console.log(`1: ${s1Prefix} 2: ${s2Prefix}`);
        console.log(`1: ${s1Suffix} 2: ${s2Suffix}`);

        if (subject1.length !== subject2.length) {
            throw new Error("address mismatch, length does not match");
        }

        let matchContainer: string[] = [];
        let matchCounterPrefix = 0;

        let matchContainer1: string[] = [];
        let matchCounterSuffix = 0;
        for (let i = 0; i < s1Prefix.length; i++) {
            if (s1Prefix[i] === s2Prefix[i]) {
                matchCounterPrefix += 1;
                matchContainer.push(s1Prefix[i]);
            }
        }

        for (let i = 0; i < s1Suffix.length; i++) {
            if (s1Suffix[i] === s2Suffix[i]) {
                matchCounterSuffix += 1;
                matchContainer1.push(s1Suffix[i]);
            }
        }

        // prefix match percentage
        let prefixMatchPercentage = (matchContainer.length / target) * 100
        let suffixMatchPercentage = (matchContainer1.length / target) * 100

        console.log(`% match prefix ${prefixMatchPercentage} suffix ${suffixMatchPercentage}`)



        // suffix match percentage

        console.log(`match count prefix: ${matchCounterPrefix} ${matchContainer}`);
        console.log(`match count suffix: ${matchCounterSuffix} ${matchContainer1}`);
    }

    weightedMatch(address1: string, address2: string) {
        let maxWeight = this.findMaxWeight(address1)
        let addressWeight = this.findWeight(address1, address2)
        let score = (addressWeight / maxWeight) * 100
        console.log(`max: ${maxWeight} address weight: ${addressWeight} score: ${score}`)
    }

    findMaxWeight(addr1: string) {
        let adrress = addr1.substring(2);

        let firstHalf = adrress.substring(0, adrress.length / 2)
        let secondHalf = adrress.substring(adrress.length / 2)

        let weight: number[] = []

        for (let i = 0; i < firstHalf.length; i++) {
            weight.push(this.weight(i))
        }

        for (let i = 0; i < secondHalf.length; i++) {
            weight.push(this.weight(i))
        }

        return weight.reduce((acc, current) => acc + current, 0)
    }

    reverseString(str: string): string {
        return str.split('').reverse().join('');
    }

    private weight(i: number): number {
        if (i < 0 || i >= 20) return 0;
        if (i < 4) return 5;
        if (i < 8) return 4;
        if (i < 12) return 3;
        if (i < 16) return 2;
        return 1;
    }

    findWeight(addr1: string, addr2: string) {
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
    

    computeLongestMatch(realAddress: string, fakeAddress: string) {
        let longestSequences: string[] = [];
        let lastKnownIndex = 0;
        let lastItem = "";

        function add(item: string) {
            if (item.length > 1) {
                longestSequences.push(item);
            }
        }
        for (let i = 0; i < realAddress.length; i++) {
            console.log(`last: ${lastKnownIndex} current: ${i}`);
            if (realAddress[i] === fakeAddress[i]) {
                if (((i - lastKnownIndex) === 1) || (lastKnownIndex === 0)) {
                    lastItem += realAddress[i];
                    console.log(`last item: ${lastItem}`);
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
        console.log(longestSequences);
    }

    totalWordMatch(realAddress: string, fakeAddress: string) {
        let matchList: string[] = [];
        for (let i = 0; i < realAddress.length; i++) {
            if (realAddress[i] === fakeAddress[i]) {
                matchList.push(realAddress[i]);
            }
        }
    }

    detectVisualTricks(addr1: string, addr2: string): string[] {
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

        for (let i = 0; i < Math.min(addr1.length, addr2.length); i++) {
            const char1 = addr1[i].toLowerCase();
            const char2 = addr2[i].toLowerCase();

            if (char1 !== char2) {
                if (similarChars[char1]?.includes(char2) || similarChars[char2]?.includes(char1)) {
                    tricks.push(`visual_substitution_${char1}_${char2}_at_${i}`);
                }
            }
        }

        return tricks;
    }
}