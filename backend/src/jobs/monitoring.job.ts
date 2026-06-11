import { monitoringService } from '@/modules/monitoring/monitoring.service.ts';

class MonitoringJob {
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
}

export const monitoringJob = new MonitoringJob();