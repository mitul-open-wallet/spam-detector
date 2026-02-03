import { AppConfig } from "../../config/config.interface"
import { BitcoinTransactionClient } from "./bitcoinTransactionClient"
import { Transaction } from "../../models/bitcoinTransaction"
import { BitcoinAddressSimilarityChecker } from "./bitcoinAddressSimilarityChecker"
import type { AddressType, AddressInfo } from "bitcoin-address-validation"

type GetAddressInfoFn = (address: string) => AddressInfo

let bitcoinAddressValidation: { getAddressInfo: GetAddressInfoFn } | null = null

async function loadBitcoinAddressValidation() {
  if (!bitcoinAddressValidation) {
    bitcoinAddressValidation = await import("bitcoin-address-validation")
  }
  return bitcoinAddressValidation
}

export enum BitcoinTransactionType {
  self = "sent to self",
  received = "received by user",
  sent = "sent to another wallet",
  undetermined = "not determined"
}

export class BitcoinTransactionManager {

  private client: BitcoinTransactionClient

  constructor(appConfig: AppConfig) {
    this.client = new BitcoinTransactionClient(appConfig)
  }

  async isSpam(txHash: string, receivingAddress: string, sendingAddresses: string[] = []): Promise<boolean> {
    const { getAddressInfo } = await loadBitcoinAddressValidation()
    const allTransactions = await this.fetchAll(receivingAddress)

    // Find the transaction first to avoid unnecessary processing
    const concernedTransaction = allTransactions.find(item => item.txid === txHash)

    let incomingAddresses: string[]

    // Early exit if transaction not found
    if (concernedTransaction) {
        // Verify it's a received transaction
        const txType = this.identifyTransaction(concernedTransaction, receivingAddress)
        if (txType !== BitcoinTransactionType.received) {
            return false
        }

        // Compute received value
        const netIncomingValue = this.captureValue(concernedTransaction, receivingAddress)
        if (netIncomingValue.netValue <= 0) {
            return false
        }

        // Get incoming addresses early - if none, can exit early
        incomingAddresses = this.gatherAllIncomingAddresses(concernedTransaction)
        if (incomingAddresses.length === 0) {
            return false
        }
    } else {
        incomingAddresses = sendingAddresses
    }

    // Group outgoing addresses by type (only once)
    const outgoingTransactionsByType = this.groupSentAdddressesByType(allTransactions, receivingAddress, getAddressInfo)

    // Cache getAddressInfo calls to avoid repeated parsing
    const addressInfoCache = new Map<string, ReturnType<GetAddressInfoFn>>()
    const getAddressInfoCached = (address: string) => {
        let info = addressInfoCache.get(address)
        if (!info) {
            info = getAddressInfo(address)
            addressInfoCache.set(address, info)
        }
        return info
    }

    // Check for address similarity matches
    for (const incomingAddress of incomingAddresses) {
        const info = getAddressInfoCached(incomingAddress)
        const outgoingAddresses = outgoingTransactionsByType.get(info.type)

        if (!outgoingAddresses || outgoingAddresses.size === 0) {
            continue
        }

        // Check if any outgoing address matches
        for (const address of outgoingAddresses) {
            if (BitcoinAddressSimilarityChecker.match(info.type, incomingAddress, address)) {
                return true
            }
        }
    }

    return false
  }


  private groupSentAdddressesByType(userTransactions: Transaction[], userAddress: string, getAddressInfo: GetAddressInfoFn) {
    // Group addresses by type directly to avoid intermediate Set
    const addressInfoMap = new Map<AddressType, Set<string>>()

    for (const item of userTransactions) {
        // Only process sent transactions
        if (this.identifyTransaction(item, userAddress) !== BitcoinTransactionType.sent) {
            continue
        }

        const outgoing = this.gatherAllOutgoingAddresses(item)

        for (const address of outgoing) {
            const addressInfo = getAddressInfo(address)
            const existingSet = addressInfoMap.get(addressInfo.type)

            if (existingSet) {
                existingSet.add(address)
            } else {
                addressInfoMap.set(addressInfo.type, new Set([address]))
            }
        }
    }

    return addressInfoMap
  }

  private async fetchAll(userAddress: string) {
    let currentPage = 1
    let totalPages: number | undefined = undefined
    let transactions: Transaction[] = []
    do {
      try {
        const result = await this.client.fetch(userAddress, currentPage)
        totalPages = result.totalPages
        currentPage += 1
        transactions.push(...result.transactions)
      } catch {
        break
      }
    } while (currentPage <= totalPages)
    return transactions
  }

  private identifyTransaction(tx: Transaction, userAddress: string): BitcoinTransactionType {
    const ownInputs = tx.vin.filter(item => {
      return item.isOwn && item.addresses.some(address => address === userAddress)
    })
    const ownOutputs = tx.vout.filter(item => {
      return item.isOwn && item.addresses.some(address => address === userAddress)
    })

    const otherOutputs = tx.vout.filter(item => {
      return !item.isOwn
    })

    if (ownInputs.length === 0 && ownOutputs.length > 0) {
      return BitcoinTransactionType.received
    }

    if (ownInputs.length > 0 && otherOutputs.length > 0) {
      return BitcoinTransactionType.sent
    }

    if (ownInputs.length > 0 && otherOutputs.length === 0) {
      return BitcoinTransactionType.self
    }

    return BitcoinTransactionType.received
  }

  private captureValue(tx: Transaction, userAddress: string) {
    const inputValue = tx.vin
    .filter(item => item.isOwn && item.addresses.some(address => address === userAddress))
    .reduce((acc: bigint, item) => {
      return acc + BigInt(item.value)
    }, BigInt(0))

    const outputValue = tx.vout
    .filter(item => item.isOwn && item.addresses.some(address => address === userAddress))
    .reduce((acc: bigint, item) => {
      return acc + BigInt(item.value)
    }, BigInt(0))

    return { inputValue, outputValue, netValue: outputValue - inputValue }
  }

  private gatherAllOutgoingAddresses(tx: Transaction) {
    const addresses = tx.vout
    .filter(item => !item.isOwn)
    .flatMap(item => item.addresses)
    return addresses
  }

  private gatherAllIncomingAddresses(tx: Transaction) {
    const addresses = tx.vin
    .filter(item => !item.isOwn)
    .flatMap(item => item.addresses)
    return addresses
  }
}