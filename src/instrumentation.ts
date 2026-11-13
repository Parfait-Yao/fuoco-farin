/**
 * Next.js server startup hook. On a long-running Node server with
 * ENABLE_CRON=true, schedules the background jobs with node-cron.
 * On serverless hosting, keep ENABLE_CRON=false and use vercel.json crons.
 * The NEXT_RUNTIME check is static, so the edge bundle never includes the jobs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startJobs } = await import('./server/jobs/scheduler');
    startJobs();
  }
}
