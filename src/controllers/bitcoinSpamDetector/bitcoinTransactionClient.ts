import { AppConfig } from "../../config/config.interface"
import { BitcoinTransaction } from "../../models/bitcoinTransaction"

export class BitcoinTransactionClient {

  constructor(private appConfig: AppConfig) {}

  async fetch(userAddress: string, currentPage: number): Promise<BitcoinTransaction> {
    const url = `https://btcbook.nownodes.io/api/v2/address/${userAddress}?page=${currentPage}&pageSize=50&details=txs`
    const networkResponse = await fetch(url, {
      method: "GET",
      headers: {
          "api-key": this.appConfig.nowNodesAPIKey
      }
    })
    return await networkResponse.json()
  }
}