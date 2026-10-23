require('dotenv').config();
const { query } = require('../server/config/db');

async function inspectAttempts() {
  const res = await query('SELECT id, registration_number, student_name, section, attempt_status, score, maximum_marks, percentage, correct_count, incorrect_count, unanswered_count, time_taken_seconds FROM exam_attempts ORDER BY created_at DESC LIMIT 5');
  console.log('Recent attempts in DB:');
  console.table(res.rows);
}

inspectAttempts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
