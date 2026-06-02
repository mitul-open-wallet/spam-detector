import { Router } from 'express';
import { ThreatDetectionEngine } from "../controllers/threatDetectionEngine";
import validateWithZod from '../middleware/zodValidation';
import { schema } from '../schemas.ts/validationSchema';
import { appConfig } from '../config';

const router = Router()
const threatDetection = new ThreatDetectionEngine(appConfig)

router.post("/check", validateWithZod(schema.threatDetection), async (request, response) => {
    const { userAddress, targetAddress } = request.body
    const threatSummary = await threatDetection.findThreat(userAddress, targetAddress)
    response.status(200).send({ threat: threatSummary })
})

export default router;