import { Router } from 'express';
import { getFeed } from '../controllers/feed.js';

const router = Router();

router.get("/", getFeed);

export default router;