import { Router } from 'express';

import { triggerMonitoringJob } from './monitoring.controller.ts';
import { asyncHandler } from '@/shared/utils/async-handler.ts';

const router = Router();

/**
 * @openapi
 * /monitoring/jobs/ping:
 *   post:
 *     summary: Manually trigger httpbin monitoring job
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: Monitoring job executed successfully
 */
router.post('/jobs/ping', asyncHandler(triggerMonitoringJob));

export default router;