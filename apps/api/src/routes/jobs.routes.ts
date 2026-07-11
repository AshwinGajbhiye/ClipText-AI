import { Router } from 'express';
import { streamJobStatus } from '../controllers/jobs.controller';

const router = Router();

router.get('/:jobId/stream', streamJobStatus);

export default router;
