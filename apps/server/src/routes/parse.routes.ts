import { Router } from 'express';
import { parseFigmaData } from '../controllers/parse.controller';

const router = Router();

router.post('/', parseFigmaData);

export default router;
