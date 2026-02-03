import { AddressType, getAddressInfo } from "bitcoin-address-validation";
import { appConfig } from "./config";
import { AddressSimilarityDetector } from "./controllers/SolanaSpamDetector/addressSimilarityDetector";
import { BitcoinTransactionManager } from "./controllers/bitcoinSpamDetector/bitcoinTransactionManager";
// const legitimate = "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1";
// const poisoned = "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ5Sqw1";

// let similarityComparator = new AddressSimilarityDetector()
// const similar = similarityComparator.compare(legitimate, poisoned)
// const longestMatch = similarityComparator.computeLongestMatch(legitimate, poisoned)
// const subsitutions = similarityComparator.findSubstitutions(legitimate, poisoned)

// console.log(`isSimilar: ${similar} longest: ${JSON.stringify(longestMatch)} subsitutions: ${subsitutions}`)
const btc = (async () => {
    const manager = new BitcoinTransactionManager(appConfig)
    const userAddress = "bc1qqjnwjfu4zegjk27qcezlgjz89p6eljej6dnw5m"
    const isSpam = await manager.isSpam("bbdc26291ecae7e23ccc3726d025da422acb1213516f4a62177f7452702a356c", userAddress)
    console.log(`isSpam: ${isSpam}`)
    // const transactions = await manager.fetchAll(userAddress)
    // const outgoingAddresses: Set<string> = new Set()
    //  for (const [index, item] of transactions.entries()) {
    //     const txType = manager.identifyTransaction(item, userAddress)
    //     // has to be sent and the net value should ne negative
    //     const details = manager.captureValue(item, userAddress)
    //     const net = Number(details.netValue)/100000000
    //     //console.log(`${index}: ${txType} net amount: ${net}`)
    //     switch (txType) {
    //         case BitcoinTransactionType.self:
    //             break
    //         case BitcoinTransactionType.received:
    //             break
    //         case BitcoinTransactionType.sent:
    //             const outgoing = manager.gatherAllOutgoingAddresses(item)
    //             outgoing.forEach(item => {
    //                 outgoingAddresses.add(item)
    //             })
    //             const all = outgoing.join(", ")
    //             //console.log(`outgoing: ${all}\n`)
    //             break
    //         case BitcoinTransactionType.undetermined:
    //             break
    //     }
    // }

    // //console.log(`unq outg addresses: ${outgoingAddresses.values.length}`)

    // const addressInfoMap = new Map<AddressType, Set<string>>()
    // for (const address of outgoingAddresses) {
    //     const addressInfo = getAddressInfo(address)
    //     let values = addressInfoMap.get(addressInfo.type)

    //     console.log(JSON.stringify(addressInfo))

    //     if (values === undefined) {
    //         console.log("found nothing")
    //         addressInfoMap.set(addressInfo.type, new Set([address]))
    //         console.log(addressInfoMap.get(addressInfo.type))
    //     } else if (values) {
    //         console.log("found something")
    //         values.add(address)
    //         addressInfoMap.set(addressInfo.type, values)
    //         console.log(addressInfoMap.get(addressInfo.type))
    //     }
    // }
    // console.log("address type distribution")
    // console.log(`${JSON.stringify(addressInfoMap)}`)

    // for (const [key, values] of addressInfoMap.entries()) {
    //     console.log(`${key}: ${values.size} addresses`)
    //     console.log(Array.from(values))
    // }
    // console.log(`btc transactions: ${transactions.length}`)
})()