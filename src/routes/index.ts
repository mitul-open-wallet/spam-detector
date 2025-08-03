
import { Router } from 'express';
import threatDetection from './threatDetection'
import accidentalTransfer from './accidentalTransfer'
import spam from './spam'
import infections from './infections'

const router = Router()

router.use('/threatDetection', threatDetection);
router.use('/accidentalTransfer', accidentalTransfer);
router.use('/infections', infections);
router.use('/spam', spam);

export default router;