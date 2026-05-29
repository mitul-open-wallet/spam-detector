import { AddressType, getAddressInfo, Network } from "bitcoin-address-validation"

export class BitcoinAddressSimilarityChecker {
  static match(addressType: AddressType, address1: string, address2: string): boolean {
    // Determine start index based on address type
    let startIndex: number = 0
    switch (addressType) {
      case AddressType.p2pkh:
        startIndex = 1
        break
      case AddressType.p2sh:
        startIndex = 3
        break
      case AddressType.p2tr:
      case AddressType.p2wpkh:
      case AddressType.p2wsh:
        startIndex = 4
        break
    }

    const matchLength = 4
    const threshold = 50
    const minLength = startIndex + matchLength

    // Early return if addresses are too short
    if (address1.length < minLength || address2.length < minLength) {
      return false
    }

    // Extract prefix substrings
    const prefix1 = address1.substring(startIndex, startIndex + matchLength)
    const prefix2 = address2.substring(startIndex, startIndex + matchLength)

    // Extract suffix substrings (from the end)
    const suffix1 = address1.substring(address1.length - matchLength)
    const suffix2 = address2.substring(address2.length - matchLength)

    // Count matching characters in prefix
    let prefixMatchCounter = 0
    for (let i = 0; i < matchLength; i++) {
      if (prefix1[i] === prefix2[i]) {
        prefixMatchCounter++
      }
    }

    // Count matching characters in suffix
    let suffixMatchCounter = 0
    for (let i = 0; i < matchLength; i++) {
      if (suffix1[i] === suffix2[i]) {
        suffixMatchCounter++
      }
    }

    // Calculate match percentages
    const prefixMatch = (prefixMatchCounter / matchLength) * 100
    const suffixMatch = (suffixMatchCounter / matchLength) * 100

    // Return true if both prefix and suffix meet threshold
    return prefixMatch >= threshold && suffixMatch >= threshold
  }
}