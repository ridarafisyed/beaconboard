import type { Request, Response } from 'express';

import { aiService } from './ai.service.ts';

export const getAiInsights = async (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(3, parseInt(req.query['limit'] as string) || 50));
  const result = await aiService.generateInsights(limit);
  res.status(200).json(result);
};

export const getAiRateLimit = async (_req: Request, res: Response) => {
  res.status(200).json(aiService.getRateLimitStatus());
};
