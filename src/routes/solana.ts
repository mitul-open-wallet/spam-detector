import { Request, Response, Router } from "express";
import { SolanaTransactionAnalyzerFactory } from "../controllers/solanaTransactionsAnalyzerFactory";
import { schema } from "../schemas.ts/validationSchema";
import validateWithZod from "../middleware/zodValidation";

const router = Router();
const transactionAnalyzer = SolanaTransactionAnalyzerFactory.create()

router.post("/check", validateWithZod(schema.solana), async (request: Request, response: Response) => {
    const { txHash, address } = request.body;
    const isSpam = await transactionAnalyzer.detectSpam(txHash, address)
    response.status(200).send({ isSpam: isSpam })
})

export default router;