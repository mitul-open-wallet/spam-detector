import z from "zod";

// More specific regex patterns for different lengths
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SOLANA_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

const solanaAddress = z.string()
.min(1, "must not be empty")
.regex(SOLANA_ADDRESS_REGEX, "length should be between 32 and 44 chars and must be base58 encoded")
.refine(address => address.length >=32 && address.length <= 44, {
    message: "Must be between 32 and 44 characters"
})

const solanaSignature = z.string()
.min(1, "must not be empty")
.regex(SOLANA_SIGNATURE_REGEX, "length should be between 87 and 88 chars and must be base58 encoded")
.refine(address => address.length >=87 && address.length <= 88, {
    message: "Must be between 87 and 88 characters"
})

const ethereumAddress = z.string()
.min(1, "string must not be empty")
.regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address (0x followed by 40 hex characters)")
.length(42, "ethereum address must have proper length")

const transactionHash = z.string()
.min(1, "string must not be empty")
.regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid tx hash (0x followed by 64 hex characters)")
.length(66, "ethereum address must have proper length")

export const schema = {

    solanaBatch: z.object({
        txHashes: z.array(solanaSignature).min(1, "At least one transaction hash is required"),
        address: solanaAddress
    }),

    solana: z.object({
        txHash: solanaSignature,
        address: solanaAddress
    }),
    
    spam: z.object({
        txHash: transactionHash,
        address: ethereumAddress
    }),

    accidentalTransfer: z.object({
        userAddress: ethereumAddress
    }),

    infections: z.object({
        userAddress: ethereumAddress,
        targetAddress: ethereumAddress.optional()
    }),

    threatDetection: z.object({
        userAddress: ethereumAddress,
        targetAddress: ethereumAddress
    })
}