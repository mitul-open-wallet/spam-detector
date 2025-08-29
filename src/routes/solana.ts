import { Request, Response, Router } from "express";
import { SolanaTransactionAnalyzerFactory } from "../controllers/solanaTransactionsAnalyzerFactory";
import { schema } from "../schemas.ts/validationSchema";
import validateWithZod from "../middleware/zodValidation";
import { SpamReport } from "../controllers/solanaTransactionAnalyzer";

const router = Router();
const transactionAnalyzer = SolanaTransactionAnalyzerFactory.create()

router.post("/check", validateWithZod(schema.solana), async (request: Request, response: Response) => {
    const { txHash, address } = request.body;
    const isSpam = await transactionAnalyzer.isSpam(txHash, address)
    response.status(200).send({ isSpam: isSpam })
})

router.post("/bulkCheck", validateWithZod(schema.solanaBatch), async (request: Request, response: Response) => {
    const { txHashes, address } = request.body;
    const report: SpamReport = await transactionAnalyzer.isSpamBulk(txHashes, address)
    response.status(200).send(report)
})

export default router;