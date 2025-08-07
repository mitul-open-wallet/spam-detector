import { Router, Request, Response } from 'express';
import { ThreatDetectionEngine } from "../controllers/threatDetectionEngine";
import validateWithZod from '../middleware/zodValidation';
import { schema } from '../schemas.ts/validationSchema';

const router = Router()
const threatDetection = new ThreatDetectionEngine()

router.post("/check", validateWithZod(schema.infections), async (request: Request, response: Response) => {
    const { userAddress, targetAddress = undefined } = request.body;

    try {
        let infectedTransactions = await threatDetection.findInfections(userAddress, targetAddress);
        response.status(200).send({"infections": infectedTransactions});
    } catch (error) {
        response.status(500).send({
            error: "Internal server error"
        });
    }
});

export default router;
