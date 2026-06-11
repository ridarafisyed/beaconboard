import cron from 'node-cron';

import { monitoringService } from '@/modules/monitoring/monitoring.service.ts';

class MonitoringJob {
  private task: cron.ScheduledTask | null = null;

  async run() {
    try {
      const result = await monitoringService.executeMonitoringCycle();

      console.log(
        `Monitoring job completed | status=${result.statusCode} | responseTime=${result.responseTimeMs}ms`
      );

      return result;
    } catch (error) {
      console.error('Monitoring job failed:', error);
      throw error;
    }
  }

  start() {
    if (this.task) return;

    this.task = cron.schedule('*/5 * * * *', () => {
      this.run().catch((error) => {
        console.error('Monitoring cron encountered an unhandled error:', error instanceof Error ? error.message : error);
      });
    });

    console.log('Monitoring job scheduled — runs every 5 minutes');
  }

  stop() {
    this.task?.stop();
    this.task = null;
  }
}

export const monitoringJob = new MonitoringJob();