import { Router, Request, Response } from 'express';
import { ThreatDetectionEngine } from "../controllers/threatDetectionEngine";
import { schema } from '../schemas.ts/validationSchema';
import validateWithZod from '../middleware/zodValidation';
import { appConfig } from '../config';
import { Blockchain } from '../models/blockchian';

const router = Router()
const threatDetection = new ThreatDetectionEngine(appConfig)

router.post("/check", validateWithZod(schema.spam), async (request: Request, response: Response) => {
    const { txHash, address, chain } = request.body;
    console.log(`transaction hash: ${txHash}, address: ${address}, blockchain: ${chain}`)
    try {
        let isSpam = await threatDetection.isSpam(txHash, address, chain as Blockchain);
        response.status(200).send({ isSpam: isSpam });
    } catch (error) {
        response.status(500).send({
            error: `Transaction with txHash: ${txHash} is not associated with ${address}`
        });
    }
});

export default router;