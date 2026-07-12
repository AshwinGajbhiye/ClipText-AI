import { Router } from 'express';
import { exportVideo } from '../controllers/export.controller';

const router = Router();

router.post('/', exportVideo);

export default router;
