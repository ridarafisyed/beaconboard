import cron from 'node-cron';
import { isAxiosError } from 'axios';

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
      if (isAxiosError(error)) {
        console.error(`Monitoring job failed: ${error.code ?? 'UNKNOWN'} — ${error.message} (url: ${error.config?.url})`);
      } else {
        console.error('Monitoring job failed:', error instanceof Error ? error.message : error);
      }
      throw error;
    }
  }

  start() {
    if (this.task) return;

    this.task = cron.schedule('*/5 * * * *', () => {
      this.run().catch(() => {
        // error already logged in run()
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