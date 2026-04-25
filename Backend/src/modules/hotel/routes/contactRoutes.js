import express from 'express';
import { createContactMessage } from '../controllers/contactController.js';
import { optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/:audience', optionalProtect, createContactMessage);

export default router;
