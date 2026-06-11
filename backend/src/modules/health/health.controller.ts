import type { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'pulsewatch-api',
    timestamp: new Date().toISOString(),
  });
};