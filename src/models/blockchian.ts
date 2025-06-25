import EvmChain, { EvmAddress } from "@moralisweb3/common-evm-utils";

export enum Blockchain {
    ethereum = "0x1",
    polygon = "0x89",
    base = "0x2105",
    bsc = "0x38",
    arbitrum = "0xa4b1",
    optimism = "0xa",
    cronos = "0x19",
    linea = "0xe708"
}

export interface BlockchainTransactions {
    blockchain: Blockchain
    transactions: EvmChain.EvmWalletHistoryTransaction[]
}

export interface BaseTransactionItem {
    blockchain: Blockchain,
    txHash: string,
    tokenSymbol: string
    value: string
    decimal: number
    direction: string | undefined
    sender: EvmAddress
    recipient: EvmAddress
}

export interface ContractItem extends BaseTransactionItem {
    contractAddress: EvmAddress
    isSuspicious: boolean
}

export type NativeOrContract = BaseTransactionItem | ContractItem