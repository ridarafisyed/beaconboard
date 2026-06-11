import type { Request, Response } from 'express';

import { monitoringJob } from '@/jobs/monitoring.job.ts';
import { monitoringService } from './monitoring.service.ts';

export const triggerMonitoringJob = async (_req: Request, res: Response) => {
  const result = await monitoringJob.run();

  res.status(200).json({
    message: 'Monitoring job executed successfully',
    data: result,
  });
};

export const getMonitoringHistory = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));

  const result = await monitoringService.getHistory(page, limit);

  res.status(200).json(result);
};