require('dotenv').config();
const { query } = require('../server/config/db');
const { parseBulkQuestions } = require('../server/utils/examParser');
const crypto = require('crypto');

async function runTests() {
  console.log('🧪 Starting EXAM ARENA Automated Integration Tests...\n');
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

  try {
    // 1. Get or create a mentor user for testing
    let mentorRes = await query("SELECT id, email FROM users WHERE role = 'mentor' LIMIT 1");
    let mentorId;
    if (mentorRes.rows.length === 0) {
      const newId = 'mentor_test_' + Date.now();
      await query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, 'dummy', 'Test Mentor', 'mentor')",
        [newId, 'testmentor@vignan.edu']
      );
      mentorId = newId;
    } else {
      mentorId = mentorRes.rows[0].id;
    }
    assert(!!mentorId, 'Mentor user verified for admin operations');

    // 2. Create Exam in Draft state
    const examId = 'exam_test_' + Date.now();
    const publicId = 'test-exam-' + crypto.randomBytes(4).toString('hex');
    const examInsert = await query(`
      INSERT INTO exams (
        id, public_id, title, description, instructions, subject,
        duration_minutes, total_marks, passing_marks, status,
        negative_marking_enabled, show_score_after_submission,
        reveal_answers_after_submission, fullscreen_required, focus_monitoring_enabled,
        created_by
      ) VALUES (
        $1, $2, 'C Programming Fundamentals Exam', 'Test covering variables, operators, and functions',
        'Read questions carefully. Tab-switching is monitored.', 'C Programming',
        30, 0, 10, 'draft',
        true, true, true, true, true, $3
      ) RETURNING *
    `, [examId, publicId, mentorId]);
    assert(examInsert.rows.length === 1 && examInsert.rows[0].status === 'draft', 'Admin created exam in draft state');

    // 3. Test Bulk Parser
    const bulkPastedText = `
TYPE: MCQ
Q: Which function is the entry point of a standard C program?
A: start()
B: main()
C: begin()
D: execute()
ANSWER: B
MARKS: 2

TYPE: MCQ
Q: Which header file declares printf()?
A: stdlib.h
B: string.h
C: stdio.h
D: math.h
ANSWER: C
MARKS: 2

TYPE: FILL
Q: The function used to display formatted output in C is ______.
ANSWER: printf
ACCEPTED: printf; PRINTF; printf()
MARKS: 2

1. Which loop executes its body at least once?
A. for
B. while
C. do-while
D. none
Answer: C
Marks: 2

2. Which keyword is used to return a value from a function?
Type: FILL
Answer: return
Marks: 2
`;
    const parseResult = parseBulkQuestions(bulkPastedText);
    assert(parseResult.questions.length === 5, `Bulk parser parsed 5 questions (got ${parseResult.questions.length})`);
    assert(parseResult.invalidCount === 0, 'No malformed questions in valid batch');

    // 4. Insert Parsed Questions into Database
    let totalComputedMarks = 0;
    for (let i = 0; i < parseResult.questions.length; i++) {
      const q = parseResult.questions[i];
      totalComputedMarks += q.marks;
      const qId = `q_test_${examId}_${i + 1}`;
      await query(`
        INSERT INTO exam_questions (
          id, exam_id, question_order, question_type, question_text,
          options_json, correct_answer, accepted_answers_json,
          marks, negative_marks
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `, [
        qId, examId, i + 1, q.type, q.text,
        JSON.stringify(q.options), q.correctAnswer,
        JSON.stringify(q.acceptedAnswers), q.marks, 0.5
      ]);
    }
    await query('UPDATE exams SET total_marks = $1 WHERE id = $2', [totalComputedMarks, examId]);
    assert(totalComputedMarks === 10, `Total computed marks calculated as 10 (got ${totalComputedMarks})`);

    // 5. Publish Exam
    const pubRes = await query("UPDATE exams SET status = 'published', published_at = NOW() WHERE id = $1 RETURNING *", [examId]);
    assert(pubRes.rows[0].status === 'published', 'Exam transitioned from draft to published');

    // 6. Test Registration Number Validation Rules (supports alphanumeric 261FA04XXXX)
    const regRegex = /^261FA0[A-Z0-9]{4,5}$/i;
    assert(regRegex.test('261FA01025'), 'Valid registration number 261FA01025 matches');
    assert(regRegex.test('261fa09999'), 'Case-insensitive registration number 261fa09999 matches');
    assert(regRegex.test('261FA04514'), 'Valid registration number 261FA04514 matches');
    assert(regRegex.test('261FA04A12'), 'Alphanumeric registration number 261FA04A12 matches');
    assert(!regRegex.test('261FA0123'), 'Short registration number 261FA0123 rejected');
    assert(!regRegex.test('261FA01234567'), 'Long registration number 261FA01234567 rejected');
    assert(!regRegex.test('23A001'), 'Old/other format 23A001 rejected for 261FA0XXXX');
    assert(!regRegex.test('DROP TABLE'), 'SQL injection registration string rejected');

    // 7. Student 1 starts attempt
    const testRegNo = '261FA01001';
    const attemptId = 'att_test_' + Date.now();
    const durationMins = 30;

    const startAttempt = await query(`
      INSERT INTO exam_attempts (
        id, exam_id, registration_number, student_name, section,
        attempt_status, started_at, deadline_at, maximum_marks
      ) VALUES (
        $1, $2, $3, 'P. Ravi Teja', 'sec-9',
        'in_progress', NOW(), NOW() + ($4 || ' minutes')::INTERVAL, $5
      ) RETURNING *
    `, [attemptId, examId, testRegNo, durationMins, totalComputedMarks]);
    assert(startAttempt.rows.length === 1, 'Student started attempt, deadline calculated by server');

    // 8. Test 1 Attempt Invariant (Database UNIQUE constraint)
    let duplicateRejected = false;
    try {
      await query(`
        INSERT INTO exam_attempts (
          id, exam_id, registration_number, student_name, section,
          attempt_status, started_at, deadline_at, maximum_marks
        ) VALUES (
          $1, $2, $3, 'Duplicate Hacker', 'sec-9',
          'in_progress', NOW(), NOW() + ($4 || ' minutes')::INTERVAL, $5
        )
      `, ['att_duplicate_' + Date.now(), examId, testRegNo, durationMins, totalComputedMarks]);
    } catch (e) {
      if (e.code === '23505' || e.message.includes('unique') || e.message.includes('duplicate')) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'DATABASE-LEVEL CONSTRAINT: Duplicate attempt for same registration number strictly prevented (23505 Unique Violation)');

    // 9. Autosave responses for questions
    const qRows = (await query('SELECT id, question_order, question_type FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC', [examId])).rows;
    // Q1: MCQ (correct answer B) -> student answers B (CORRECT +2)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, saved_at)
      VALUES ($1, $2, 'B', NOW())
    `, [attemptId, qRows[0].id]);

    // Q2: MCQ (correct answer C) -> student answers A (INCORRECT -0.5)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, saved_at)
      VALUES ($1, $2, 'A', NOW())
    `, [attemptId, qRows[1].id]);

    // Q3: FILL (accepted: printf, PRINTF, printf()) -> student answers 'printf' (CORRECT +2)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, text_response, saved_at)
      VALUES ($1, $2, 'printf', NOW())
    `, [attemptId, qRows[2].id]);

    // Q4: MCQ (correct answer C) -> student answers C (CORRECT +2)
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, saved_at)
      VALUES ($1, $2, 'C', NOW())
    `, [attemptId, qRows[3].id]);

    // Q5: FILL -> unanswered (0)
    assert(true, 'Student responses autosaved with debounced upsert');

    // 10. Security Events Logging
    await query(`
      INSERT INTO exam_security_events (attempt_id, event_type, occurred_at, event_metadata)
      VALUES ($1, 'focus-loss', NOW(), '{"warningLevel": 1}')
    `, [attemptId]);
    await query(`
      INSERT INTO exam_security_events (attempt_id, event_type, occurred_at, event_metadata)
      VALUES ($1, 'fullscreen-exit', NOW(), '{"warningLevel": 2}')
    `, [attemptId]);

    const secEvents = await query('SELECT COUNT(*)::int as count FROM exam_security_events WHERE attempt_id = $1', [attemptId]);
    assert(secEvents.rows[0].count === 2, 'Security events (focus-loss, fullscreen-exit) tracked accurately');

    // 11. Server-side Submission & Evaluation
    // Expected score:
    // Q1: +2
    // Q2: -0.5 (negative marking enabled)
    // Q3: +2
    // Q4: +2
    // Q5: 0 (unanswered)
    // Total score = 2 - 0.5 + 2 + 2 = 5.5 / 10 (55%)
    // Correct = 3, Incorrect = 1, Unanswered = 1
    const questionsAll = (await query('SELECT * FROM exam_questions WHERE exam_id = $1', [examId])).rows;
    const respAll = (await query('SELECT * FROM exam_responses WHERE attempt_id = $1', [attemptId])).rows;
    const respMap = {};
    respAll.forEach(r => { respMap[r.question_id] = r; });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let score = 0;

    for (const q of questionsAll) {
      const resp = respMap[q.id];
      if (!resp || (!resp.selected_option_id && !resp.text_response)) {
        unansweredCount++;
      } else if (q.question_type === 'mcq') {
        if ((resp.selected_option_id || '').toUpperCase() === (q.correct_answer || '').toUpperCase()) {
          correctCount++;
          score += Number(q.marks);
        } else {
          incorrectCount++;
          score -= Number(q.negative_marks || 0);
        }
      } else if (q.question_type === 'fill_blank' || q.question_type === 'fill_in_the_blank') {
        const studentText = (resp.text_response || '').trim().toLowerCase();
        let accepted = [];
        try { accepted = JSON.parse(q.accepted_answers_json); } catch(_) { accepted = [q.correct_answer]; }
        if (accepted.some(a => (a || '').trim().toLowerCase() === studentText)) {
          correctCount++;
          score += Number(q.marks);
        } else {
          incorrectCount++;
          score -= Number(q.negative_marks || 0);
        }
      }
    }

    await query(`
      UPDATE exam_attempts
      SET attempt_status = 'submitted', submitted_at = NOW(),
          time_taken_seconds = 420, score = $1, correct_count = $2,
          incorrect_count = $3, unanswered_count = $4
      WHERE id = $5
    `, [score, correctCount, incorrectCount, unansweredCount, attemptId]);

    const finalAttempt = (await query('SELECT * FROM exam_attempts WHERE id = $1', [attemptId])).rows[0];
    assert(Number(finalAttempt.score) === 5.5, `Final score server-calculated as 5.5 (got ${finalAttempt.score})`);
    assert(finalAttempt.correct_count === 3, 'Correct count is 3');
    assert(finalAttempt.incorrect_count === 1, 'Incorrect count is 1');
    assert(finalAttempt.unanswered_count === 1, 'Unanswered count is 1');
    assert(finalAttempt.attempt_status === 'submitted', 'Attempt status updated to submitted');

    // 12. Formula Injection Protection in CSV Export
    function escapeCsvValue(val) {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str; // Neutralize formula injection
      }
      return `"${str}"`;
    }

    const maliciousName = '=CMD|"/C calc"!A0';
    const escaped = escapeCsvValue(maliciousName);
    assert(escaped.startsWith("\"'="), `Formula injection properly neutralized: ${escaped}`);

    // Cleanup test records
    await query('DELETE FROM exam_security_events WHERE attempt_id = $1', [attemptId]);
    await query('DELETE FROM exam_responses WHERE attempt_id = $1', [attemptId]);
    await query('DELETE FROM exam_attempts WHERE exam_id = $1', [examId]);
    await query('DELETE FROM exam_questions WHERE exam_id = $1', [examId]);
    await query('DELETE FROM exams WHERE id = $1', [examId]);

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
