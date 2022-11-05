import { Router } from 'express';
import { getFriends } from '../controllers/connect.js';

const router = Router();

router.get("/", getFriends);

export default router;