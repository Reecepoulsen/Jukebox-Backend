import { Router } from 'express';
import { getDiscover } from '../controllers/discover.js';

const router = Router();

router.get("/", getDiscover);

export default router;