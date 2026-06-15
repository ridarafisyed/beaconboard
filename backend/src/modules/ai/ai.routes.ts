import { Router } from 'express';

import { asyncHandler } from '@/shared/utils/async-handler.ts';
import { getAiInsights, getAiRateLimit } from './ai.controller.ts';

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
 *         description: AI-generated insights with token usage and rate limit info
 *       422:
 *         description: Not enough data to generate insights
 *       429:
 *         description: Rate limit exceeded (max 20 requests per hour)
 *       503:
 *         description: GEMINI_API_KEY not configured
 */
router.get('/insights', asyncHandler(getAiInsights));

/**
 * @openapi
 * /ai/rate-limit:
 *   get:
 *     summary: Check current AI rate limit status
 *     tags:
 *       - AI
 *     responses:
 *       200:
 *         description: Rate limit usage for the current hour
 */
router.get('/rate-limit', asyncHandler(getAiRateLimit));

export default router;
