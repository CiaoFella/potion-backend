import express from 'express';
import { generateDownloadUrl } from '../middleware/download';

const router = express.Router();

router.get('/:fileName', generateDownloadUrl);

export default router;