import { AddressSimilarityDetector } from "./controllers/SolanaSpamDetector/addressSimilarityDetector";
const legitimate = "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1";
const poisoned = "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ5Sqw1";

let similarityComparator = new AddressSimilarityDetector()
const similar = similarityComparator.compare(legitimate, poisoned)
const longestMatch = similarityComparator.computeLongestMatch(legitimate, poisoned)
const subsitutions = similarityComparator.findSubstitutions(legitimate, poisoned)

console.log(`isSimilar: ${similar} longest: ${JSON.stringify(longestMatch)} subsitutions: ${subsitutions}`)