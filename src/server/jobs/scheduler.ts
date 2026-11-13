import cron from 'node-cron';
import { jobs } from './index';

/** node-cron schedule for long-running Node servers (ENABLE_CRON=true). */
export function startJobs() {
  if (process.env.ENABLE_CRON !== 'true') return;
  const run = (name: keyof typeof jobs) => async () => {
    try {
      console.info(`[cron] ${name}`, await jobs[name]());
    } catch (error) {
      console.error(`[cron] ${name} failed`, error);
    }
  };
  cron.schedule('*/15 * * * *', run('stockAlerts'));
  cron.schedule('*/5 * * * *', run('expirePayments'));
  console.info('[cron] jobs scheduled: stockAlerts (15 min), expirePayments (5 min)');
}
