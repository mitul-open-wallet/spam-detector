export interface SolanaTransaction {
    description: string,
    type: string
    source: string,
    fee: number,
    feePayer: string
    signature: string,
    slot: number,
    timestamp: number,
    tokenTransfers: TokenTransfer[],
    nativeTransfers: NativeTransfer[]
    accountData: AccountDataItem[]
    instructions: Instruction[]
    transactionError: string | null
    events: Events
}


interface TokenTransfer {
    fromTokenAccount: string,
    toTokenAccount: string,
    fromUserAccount: string,
    toUserAccount: string,
    tokenAmount: number,
    mint: string,
    tokenStandard: string
}


interface NativeTransfer {
    fromUserAccount: string,
    toUserAccount: string,
    amount: number
}

interface AccountDataItem {
    account: string,
    nativeBalanceChange: number,
    tokenBalanceChanges: TokenBalanceChangeItem[]
}

interface TokenBalanceChangeItem {
    userAccount: string,
    tokenAccount: string,
    rawTokenAmount: {
        tokenAmount: string,
        decimals: number
    },
    mint: string
}

interface Instruction {
    accounts: string[],
    data: string,
    programId: string,
    innerInstructions: InnerInstructionItem[]
}

interface InnerInstructionItem {
    accounts: string[],
    data: string,
    programId: string,
    innerInstructions: InnerInstructionItem[]  // Recursive structure
}

// events

interface Events {
  swap?: SwapEvent;
  compressed?: CompressedNFTEvent[];
  // Other potential event types would go here
}

interface SwapEvent {
  nativeInput: NativeInput | null;
  nativeOutput: any | null;
  tokenInputs: TokenOutput[];
  tokenOutputs: TokenOutput[];
  nativeFees: any[];
  tokenFees: any[];
  innerSwaps: InnerSwap[];
}

interface NativeInput {
  account: string;    // Account address
  amount: string;     // Amount in lamports as string
}

interface TokenOutput {
  userAccount: string;        // User's wallet address
  tokenAccount: string;       // Token account address
  rawTokenAmount: {
    tokenAmount: string;      // Raw token amount as string
    decimals: number;         // Token decimal places
  };
  mint: string;              // Token mint address
}

interface InnerSwap {
  tokenInputs: TokenTransfer[];
  tokenOutputs: TokenTransfer[];
  tokenFees: any[];
  nativeFees: any[];
  programInfo: ProgramInfo;
}

interface ProgramInfo {
  source: string;           // e.g., "RAYDIUM", "ORCA"
  account: string;          // Program account address
  programName: string;      // e.g., "RAYDIUM_CLMM", "ORCA_WHIRLPOOLS"
  instructionName: string;  // e.g., "SwapEvent"
}

interface CompressedNFTEvent {
  type: "COMPRESSED_NFT_MINT";
  treeId: string;                    // Merkle tree ID
  leafIndex: number;                 // Position in the tree
  seq: number;                       // Sequence number
  assetId: string;                   // Unique asset identifier
  instructionIndex: number;          // Which instruction in the transaction
  innerInstructionIndex: number | null;
  newLeafOwner: string;             // New owner's address
  oldLeafOwner: string | null;      // Previous owner (null for mint)
  newLeafDelegate: string;          // New delegate address
  oldLeafDelegate: string | null;   // Previous delegate (null for mint)
  treeDelegate: string;             // Tree delegate address
  metadata: NFTMetadata;
  updateArgs: any | null;
}

interface NFTMetadata {
  name: string;                     // NFT name
  symbol: string;                   // NFT symbol
  uri: string;                      // Metadata URI
  sellerFeeBasisPoints: number;     // Royalty in basis points
  primarySaleHappened: boolean;     // Whether primary sale occurred
  isMutable: boolean;               // Whether metadata can be updated
  tokenStandard: "NonFungible";     // Token standard
  collection: Collection;
  tokenProgramVersion: "Original";  // Program version
  creators: Creator[];
}

interface Collection {
  key: string;                      // Collection address
  verified: boolean;                // Whether collection is verified
}

interface Creator {
  address: string;                  // Creator's address
  verified: boolean;                // Whether creator is verified
  share: number;                    // Creator's royalty share percentage
}


export interface SolanaMetadata {
    mint: string,
    standard: string,
    name: string,
    symbol: string,
    logo: string,
    decimals: string,
    description: string,
    isVerifiedContract: boolean,
    possibleSpam: boolean
}