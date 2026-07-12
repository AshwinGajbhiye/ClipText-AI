import { Router } from 'express';
import { streamJobStatus, getJobStatus } from '../controllers/jobs.controller';

const router = Router();

router.get('/:jobId', getJobStatus);
router.get('/:jobId/stream', streamJobStatus);

export default router;
