import express from 'express';
import { sendGmail, sendCustomEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/send-email', sendGmail);
router.post('/send-custom-email', sendCustomEmail);

export default router;