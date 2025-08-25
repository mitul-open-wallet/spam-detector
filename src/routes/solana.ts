import { Request, Response, Router } from "express";
import { request } from "http";
import { SolanaTransactionAnalyzerFactory } from "../controllers/solanaTransactionsAnalyzerFactory";

interface SolanaData {
    description: string
}

const router = Router();

router.post("/check", async (request: Request, response: Response) => {
    const { txHash, address } = request.body;
    const transactionAnalyzer = SolanaTransactionAnalyzerFactory.create()
    const isSpam = await transactionAnalyzer.detectSpam(txHash, address)
    response.status(200).send({ "isSpam": isSpam })
})

export default router;