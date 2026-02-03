export interface BitcoinTransaction {
    page: number;
    totalPages: number;
    itemsOnPage: number;
    address: string;
    balance: string;
    totalReceived: string;
    totalSent: string;
    unconfirmedBalance: string;
    unconfirmedTxs: number;
    txs: number;
    transactions: Transaction[];
}

export interface Transaction {
    txid: string;
    version: number;
    vin: Vin[];
    vout: Vout[];
    blockHash: string;
    blockHeight: number;
    confirmations: number;
    blockTime: number;
    size: number;
    vsize: number;
    value: string;
    valueIn: string;
    fees: string;
    hex: string;
}

export interface Vin {
    txid: string;
    vout: number;
    sequence: number;
    n: number;
    addresses: string[];
    isAddress: boolean;
    isOwn?: boolean;
    value: string;
}

export interface Vout {
    value: string;
    n: number;
    spent?: boolean;
    hex: string;
    addresses: string[];
    isAddress: boolean;
    isOwn?: boolean;
}