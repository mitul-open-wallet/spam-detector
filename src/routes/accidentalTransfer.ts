import { Router, Request, Response } from 'express';
import { ThreatDetectionEngine } from "../controllers/threatDetectionEngine";
import validateWithZod from '../middleware/zodValidation';
import { schema } from '../schemas.ts/validationSchema';

const router = Router()
const threatDetection = new ThreatDetectionEngine()

router.post("/check", validateWithZod(schema.accidentalTransfer), async (request: Request, response: Response) => {
    const { userAddress } = request.body;

    try {
        let transfers = await threatDetection.findAccidentalTransactions(userAddress)
        response.status(200).send({"transfers": transfers})
    } catch (error) {
        response.status(500).send({
            error: "Internal server error"
        })
    }
})

export default router;