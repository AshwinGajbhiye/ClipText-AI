import { Router } from 'express';
import { requestUploadUrl, confirmUpload } from '../controllers/upload.controller';

const router = Router();

router.post('/request-url', requestUploadUrl);
router.post('/confirm', confirmUpload);

export default router;
