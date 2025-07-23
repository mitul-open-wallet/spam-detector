import { AlgorithmController } from "./controllers/algorithm"

let array = "mitochondria" //[0, 1, 2, 3, 4, 5, 6, 7, 8]
let mid = array.length / 2
let count = array.length - 1

let s1 = array.substring(0, mid)
let s2 = array.substring(mid, count)

console.log(`${s1} ${s2}`)

const sourceAddress = "0x47dB8388C399221bE760E1AA2eD610CF9E46bDD5"
const destinationAddress = "0x47DB2595898d1C0fefB370709C79485843F5BDD5"

const fraudEngine = new AlgorithmController();

// let r1 = fraudEngine.computeLongestMatch(sourceAddress, destinationAddress)
// console.log(JSON.stringify(r1))

// let r2 = fraudEngine.computePrefixSuffixMatch(sourceAddress, destinationAddress)
// console.log(JSON.stringify(r2))

// let r3 = fraudEngine.detectVisualTricks(sourceAddress, destinationAddress)
// console.log(JSON.stringify(r3))

// let r4 = fraudEngine.totalCharacterMatch(sourceAddress, destinationAddress)
// console.log(JSON.stringify(r4))

// let r5 = fraudEngine.weightedMatch(sourceAddress, destinationAddress)
// console.log(JSON.stringify(r5))
