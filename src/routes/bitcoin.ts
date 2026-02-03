import { BitcoinTransactionManager } from "../controllers/bitcoinSpamDetector/bitcoinTransactionManager";
import { appConfig } from "../config";
import { Request, Response, Router } from "express";
import { error } from "console";

const router = Router()
const bitcoinTransactionManager = new BitcoinTransactionManager(appConfig)

// TODO: Write validation logic for BTC Address
router.post("/check", async (request: Request, response: Response) => {
    const { txHash, receivingAddress, sendingAddresses = [] } = request.body;

    if ((typeof txHash !== "string")) {
        return response.status(400).send({ error: "txHash is not an string" })
    }

    if ((typeof receivingAddress !== "string")) {
        return response.status(400).send({ error: "receivingAddress is not an string" })
    }

    const validArray = (Array.isArray(sendingAddresses) && sendingAddresses.every(address => typeof address === "string"))

    if (!validArray) {
        return response.status(400).send({ error: "sendingAddresses is not an string array" })
    }

    try {
        const isSpam = await bitcoinTransactionManager.isSpam(txHash, receivingAddress, sendingAddresses)
        response.status(200).send({ isSpam: isSpam })
    } catch (error) {
        const err = error instanceof Error ? error : new Error("unknown")
        response.status(404).send({ error : err.message })
    }
})

export default router;