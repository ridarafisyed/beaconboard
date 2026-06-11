import cron from 'node-cron';

import { monitoringJob } from './monitoring.job.ts';

export const startMonitoringScheduler = () => {
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running scheduled monitoring job...');

    await monitoringJob.run();
  });

  console.log('Monitoring scheduler registered: every 5 minutes');
};