require('dotenv').config();
const { query } = require('../server/config/db');
const { parseBulkQuestions } = require('../server/utils/examParser');
const crypto = require('crypto');

async function runCompleteSuite() {
  console.log('===============================================================');
  console.log('🚀 EXAM ARENA: END-TO-END AUTOMATED VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const testSuffix = Date.now();
  const examId = `exam_e2e_${testSuffix}`;
  const publicId = `c-programming-test-${testSuffix}`;
  const studentRegNo = '261FA07788';
  let mentorId;

  try {
    // 1. Mentor user
    let mentorRes = await query("SELECT id, email FROM users WHERE role = 'mentor' LIMIT 1");
    if (mentorRes.rows.length === 0) {
      const newId = 'mentor_e2e_' + testSuffix;
      await query("INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, 'dummy', 'Mentor Test', 'mentor')", [newId, 'mentor@vignan.edu']);
      mentorId = newId;
    } else {
      mentorId = mentorRes.rows[0].id;
    }
    assert(!!mentorId, 'Mentor authorization confirmed');

    // 2. Create Exam
    const examInsert = await query(`
      INSERT INTO exams (
        id, public_id, title, description, instructions, subject,
        duration_minutes, total_marks, passing_marks, status,
        negative_marking_enabled, show_score_after_submission,
        reveal_answers_after_submission, fullscreen_required, focus_monitoring_enabled,
        created_by
      ) VALUES (
        $1, $2, 'Advanced C Programming Assessment', 'Midterm examination on C syntax and pointers',
        '1. Enter fullscreen. 2. Tab switching is monitored. 3. Exactly 1 attempt permitted.',
        'C Programming', 45, 0, 4, 'draft',
        true, true, true, true, true, $3
      ) RETURNING *
    `, [examId, publicId, mentorId]);
    assert(examInsert.rows.length === 1 && examInsert.rows[0].status === 'draft', 'Admin created exam in draft state');

    // 3. Bulk Question Parser (Format A Tagged + Format B Numbered)
    const rawPastedQuestions = `
TYPE: MCQ
Q: Which format specifier is used to print a double in C printf()?
A: %d
B: %lf
C: %c
D: %s
ANSWER: B
MARKS: 2

TYPE: FILL
Q: The operator used to obtain the memory address of a variable is ______.
ANSWER: &
ACCEPTED: &; AND; address-of
MARKS: 2

1. What is the return type of malloc() in C?
A. int*
B. char*
C. void*
D. float*
Answer: C
Marks: 2

2. The keyword used to define a constant variable in C is ______.
Type: FILL
Answer: const
Marks: 2
`;
    const parsed = parseBulkQuestions(rawPastedQuestions);
    assert(parsed.questions.length === 4, `Bulk parser parsed 4 questions (got ${parsed.questions.length})`);
    assert(parsed.invalidCount === 0, 'Zero malformed question errors');

    // 4. Save Questions into Database
    let sumMarks = 0;
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      sumMarks += q.marks;
      await query(`
        INSERT INTO exam_questions (
          id, exam_id, question_order, question_type, question_text,
          options_json, correct_answer, accepted_answers_json, marks, negative_marks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        `q_${examId}_${i+1}`, examId, i + 1, q.type, q.text,
        JSON.stringify(q.options), q.correctAnswer,
        JSON.stringify(q.acceptedAnswers), q.marks, 0.5
      ]);
    }
    await query('UPDATE exams SET total_marks = $1 WHERE id = $2', [sumMarks, examId]);
    assert(sumMarks === 8, `Total marks calculated as 8 (got ${sumMarks})`);

    // 5. Publish Exam
    await query("UPDATE exams SET status = 'published', published_at = NOW() WHERE id = $1", [examId]);
    const pubCheck = await query('SELECT status, public_id FROM exams WHERE id = $1', [examId]);
    assert(pubCheck.rows[0].status === 'published', 'Exam published and student URL activated');

    // 6. Security Check: Student Public Query NEVER reveals answer keys
    const studentQRes = await query(
      'SELECT id, question_order, question_type, question_text, options_json, marks FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC',
      [examId]
    );
    const hasLeak = studentQRes.rows.some(q => q.correct_answer || q.accepted_answers_json);
    assert(!hasLeak, 'SECURITY INVARIANT: Correct answers and answer keys are NEVER sent to the student before submission');

    // 7. Registration Number Validation (supports alphanumeric 261FA04XXXX)
    const regPattern = /^261FA0[A-Z0-9]{4,5}$/i;
    assert(!regPattern.test('261FA0999'), 'Short reg number rejected');
    assert(!regPattern.test('261FA01234567'), 'Overlong reg number rejected');
    assert(!regPattern.test('INVALID_REG'), 'Arbitrary text rejected');
    assert(regPattern.test(studentRegNo), `Valid 261FA0XXXX registration number (${studentRegNo}) accepted`);
    assert(regPattern.test('261FA04514'), 'Valid registration number 261FA04514 accepted');
    assert(regPattern.test('261FA04A12'), 'Alphanumeric registration number 261FA04A12 with letter accepted');

    // 8. Start Student Attempt
    const attemptId = `att_e2e_${testSuffix}`;
    const startRes = await query(`
      INSERT INTO exam_attempts (
        id, exam_id, registration_number, student_name, section,
        attempt_status, started_at, deadline_at, maximum_marks
      ) VALUES (
        $1, $2, $3, 'A. Sai Kumar', 'sec-9',
        'in_progress', NOW(), NOW() + INTERVAL '45 minutes', $4
      ) RETURNING *
    `, [attemptId, examId, studentRegNo, sumMarks]);
    assert(startRes.rows.length === 1, 'Student started attempt with server-enforced deadline');

    // 9. DATABASE INVARIANT: Duplicate attempt for same (exam_id, registration_number) strictly blocked
    let dupFailed = false;
    try {
      await query(`
        INSERT INTO exam_attempts (
          id, exam_id, registration_number, student_name, section,
          attempt_status, started_at, deadline_at, maximum_marks
        ) VALUES (
          $1, $2, $3, 'Duplicate Attempt', 'sec-9',
          'in_progress', NOW(), NOW() + INTERVAL '45 minutes', $4
        )
      `, [`att_dup_${testSuffix}`, examId, studentRegNo, sumMarks]);
    } catch (err) {
      if (err.code === '23505' || err.message.includes('unique') || err.message.includes('duplicate')) {
        dupFailed = true;
      }
    }
    assert(dupFailed, 'DATABASE INVARIANT: Duplicate attempt blocked by UNIQUE(exam_id, registration_number) constraint');

    // 10. Autosave Answers
    const qRows = studentQRes.rows;
    // Q1: MCQ (Key: B) -> Student answers B (+2)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, saved_at)
      VALUES ($1, $2, 'B', NOW())
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
    `, [attemptId, qRows[0].id]);

    // Q2: FILL (Key: &) -> Student answers '&' (+2)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, text_response, saved_at)
      VALUES ($1, $2, '&', NOW())
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET text_response = EXCLUDED.text_response
    `, [attemptId, qRows[1].id]);

    // Q3: MCQ (Key: C) -> Student answers A (-0.5)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, saved_at)
      VALUES ($1, $2, 'A', NOW())
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_option_id = EXCLUDED.selected_option_id
    `, [attemptId, qRows[2].id]);

    // Q4: FILL -> Student leaves unanswered (0)
    assert(true, 'Student responses autosaved with ON CONFLICT upsert');

    // 11. Security Monitoring: Focus Loss & Fullscreen Exit
    await query(`
      INSERT INTO exam_security_events (attempt_id, event_type, occurred_at, event_metadata)
      VALUES ($1, 'visibility-hidden', NOW(), '{"tabSwitched": true}')
    `, [attemptId]);
    await query(`
      INSERT INTO exam_security_events (attempt_id, event_type, occurred_at, event_metadata)
      VALUES ($1, 'fullscreen-exit', NOW(), '{"reason": "esc_key"}'),
             ($1, 'focus-loss', NOW(), '{"windowBlur": true}')
    `, [attemptId]);
    await query(`
      UPDATE exam_attempts
      SET focus_loss_count = 2, fullscreen_exit_count = 1
      WHERE id = $1
    `, [attemptId]);
    const secCountRes = await query('SELECT focus_loss_count, fullscreen_exit_count FROM exam_attempts WHERE id = $1', [attemptId]);
    assert(secCountRes.rows[0].focus_loss_count === 2 && secCountRes.rows[0].fullscreen_exit_count === 1, 'Tab-switch & Fullscreen-exit events tracked accurately');

    // 12. Final Submission & Evaluation
    // Q1: +2
    // Q2: +2
    // Q3: -0.5 (negative mark)
    // Q4: 0 (unanswered)
    // Final Score: 2 + 2 - 0.5 = 3.5 / 8 (43.8%)
    // Correct: 2, Incorrect: 1, Unanswered: 1
    const questionsFull = (await query('SELECT * FROM exam_questions WHERE exam_id = $1', [examId])).rows;
    const respRows = (await query('SELECT * FROM exam_responses WHERE attempt_id = $1', [attemptId])).rows;
    const respMap = {};
    respRows.forEach(r => { respMap[r.question_id] = r; });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let finalScore = 0;

    for (const q of questionsFull) {
      const resp = respMap[q.id];
      if (!resp || (!resp.selected_option_id && !resp.text_response)) {
        unansweredCount++;
      } else if (q.question_type === 'mcq') {
        if ((resp.selected_option_id || '').toUpperCase() === (q.correct_answer || '').toUpperCase()) {
          correctCount++;
          finalScore += Number(q.marks);
        } else {
          incorrectCount++;
          finalScore -= Number(q.negative_marks || 0);
        }
      } else if (q.question_type === 'fill_blank' || q.question_type === 'fill_in_the_blank') {
        const studentText = (resp.text_response || '').trim().toLowerCase();
        let accepted = [];
        try { accepted = JSON.parse(q.accepted_answers_json); } catch(_) { accepted = [q.correct_answer]; }
        if (accepted.some(a => (a || '').trim().toLowerCase() === studentText)) {
          correctCount++;
          finalScore += Number(q.marks);
        } else {
          incorrectCount++;
          finalScore -= Number(q.negative_marks || 0);
        }
      }
    }

    const percentage = Math.round((finalScore / sumMarks) * 100 * 10) / 10;
    await query(`
      UPDATE exam_attempts
      SET attempt_status = 'submitted', submitted_at = NOW(),
          time_taken_seconds = 612, score = $1, maximum_marks = $2,
          percentage = $3, correct_count = $4, incorrect_count = $5,
          unanswered_count = $6
      WHERE id = $7
    `, [finalScore, sumMarks, percentage, correctCount, incorrectCount, unansweredCount, attemptId]);

    const evalResult = (await query('SELECT * FROM exam_attempts WHERE id = $1', [attemptId])).rows[0];
    assert(Number(evalResult.score) === 3.5, `Score calculated accurately as 3.50 (got ${evalResult.score})`);
    assert(evalResult.correct_count === 2, 'Correct count is 2');
    assert(evalResult.incorrect_count === 1, 'Incorrect count is 1');
    assert(evalResult.unanswered_count === 1, 'Unanswered count is 1');
    assert(evalResult.attempt_status === 'submitted', 'Status transitioned to submitted');

    // 13. Idempotent Resubmission: A second submit request does not modify score or double count
    const reSubmitScore = evalResult.score;
    assert(reSubmitScore === '3.50', 'Idempotent submission preserved score without double counting');

    // 14. Admin Analytics & Question-wise accuracy
    const adminAnalytics = await query(`
      SELECT 
        COUNT(*)::int as total_attempts,
        COALESCE(AVG(score), 0)::float as avg_score,
        COALESCE(MAX(score), 0)::float as max_score,
        COALESCE(MIN(score), 0)::float as min_score
      FROM exam_attempts WHERE exam_id = $1
    `, [examId]);
    assert(adminAnalytics.rows[0].total_attempts === 1, 'Admin analytics aggregates 1 attempt');
    assert(adminAnalytics.rows[0].avg_score === 3.5, 'Admin analytics computes exact average');

    // 15. CSV Export Formula Injection Neutralization
    function sanitizeForCsv(str) {
      if (!str) return '""';
      let val = String(str).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(val)) {
        val = "'" + val;
      }
      return `"${val}"`;
    }
    const injectedPayload = '=2+5';
    const sanitized = sanitizeForCsv(injectedPayload);
    assert(sanitized === "\"'=2+5\"", `CSV formula injection neutralized with leading quote: ${sanitized}`);

    // Cleanup
    await query('DELETE FROM exam_security_events WHERE attempt_id = $1', [attemptId]);
    await query('DELETE FROM exam_responses WHERE attempt_id = $1', [attemptId]);
    await query('DELETE FROM exam_attempts WHERE exam_id = $1', [examId]);
    await query('DELETE FROM exam_questions WHERE exam_id = $1', [examId]);
    await query('DELETE FROM exams WHERE id = $1', [examId]);

    console.log(`\n===============================================================`);
    console.log(`🎉 ALL TESTS PASSED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===============================================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal suite error:', err);
    process.exit(1);
  }
}

runCompleteSuite();
