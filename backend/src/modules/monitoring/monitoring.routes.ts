import { Router } from 'express';

import { triggerMonitoringJob, getMonitoringHistory } from './monitoring.controller.ts';
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

/**
 * @openapi
 * /monitoring/history:
 *   get:
 *     summary: Fetch paginated monitoring history
 *     tags:
 *       - Monitoring
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Paginated list of ping results
 */
router.get('/history', asyncHandler(getMonitoringHistory));

export default router;