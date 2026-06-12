import { Router } from 'express';

import { asyncHandler } from '@/shared/utils/async-handler.ts';
import { getAiInsights } from './ai.controller.ts';

const router = Router();

/**
 * @openapi
 * /ai/insights:
 *   get:
 *     summary: Generate LLM-powered insights from recent monitoring data
 *     tags:
 *       - AI
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of recent ping records to analyse
 *     responses:
 *       200:
 *         description: AI-generated insights
 *       422:
 *         description: Not enough data to generate insights
 *       503:
 *         description: ANTHROPIC_API_KEY not configured
 */
router.get('/insights', asyncHandler(getAiInsights));

export default router;
