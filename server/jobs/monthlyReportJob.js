const cron = require('node-cron');
const { generateMonthlyReport } = require('../utils/monthlyReportService');

// Runs at 00:05 on the 1st of every month
// Generates the previous month's Excel reports automatically
const schedule = '5 0 1 * *';

exports.startMonthlyReportJob = () => {
  cron.schedule(schedule, async () => {
    const now   = new Date();
    // Previous month
    const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed

    console.log(`📊 [Monthly Report Job] Generating report for ${year}-${String(month).padStart(2, '0')}...`);

    try {
      const result = await generateMonthlyReport(year, month);
      console.log(`📊 [Monthly Report Job] Done:`, result);
    } catch (err) {
      console.error(`📊 [Monthly Report Job] Failed:`, err.message);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log(`📊 Monthly report job scheduled — runs on 1st of every month at 00:05 IST`);
};
