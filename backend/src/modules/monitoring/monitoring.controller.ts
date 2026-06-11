import type { Request, Response } from 'express';

import { monitoringJob } from '@/jobs/monitoring.job.ts';

export const triggerMonitoringJob = async (_req: Request, res: Response) => {
  const result = await monitoringJob.run();

  res.status(200).json({
    message: 'Monitoring job executed successfully',
    data: result,
  });
};