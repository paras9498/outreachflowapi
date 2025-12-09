import express from 'express';
import { analyzeJob, generateEmail, findEmail, analyzeCompany, findDecisionMaker, generateCompanyEmail } from '../controllers/aiController.js';

const router = express.Router();

// Job context
router.post('/analyze-job', analyzeJob);
router.post('/generate-email', generateEmail);
router.post('/find-email', findEmail);

// Company context
router.post('/analyze-company', analyzeCompany);
router.post('/find-decision-maker', findDecisionMaker);
router.post('/generate-company-email', generateCompanyEmail);

export default router;