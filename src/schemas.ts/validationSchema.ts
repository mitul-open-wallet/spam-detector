import z from "zod";

const ethereumAddress = z.string()
.min(1, "string must not be empty")
.regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address (0x followed by 40 hex characters)")
.length(42, "ethereum address must have proper length")

const transactionHash = z.string()
.min(1, "string must not be empty")
.regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid tx hash (0x followed by 64 hex characters)")
.length(66, "ethereum address must have proper length")

export const schema = {
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