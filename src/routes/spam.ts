import { Router, Request, Response } from 'express';
import { ThreatDetectionEngine } from "../controllers/threatDetectionEngine";
import { schema } from '../schemas.ts/validationSchema';
import validateWithZod from '../middleware/zodValidation';

const router = Router()
const threatDetection = new ThreatDetectionEngine()

router.post("/check", validateWithZod(schema.spam), async (request: Request, response: Response) => {
    const { txHash, address } = request.body;
    try {
        let isSpam = await threatDetection.isSpam(txHash, address);
        response.status(200).send({ isSpam: isSpam });
    } catch (error) {
        console.error("Error checking spam status:", error);
        response.status(500).send({
            error: `Transaction with txHash: ${txHash} is not associated with ${address}`
        });
    }
});

export default router;