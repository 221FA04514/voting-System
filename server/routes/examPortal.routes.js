const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, getClient } = require('../config/db');

// Registration Number Regex: 261FA0XXXX (exact format, 4 digits)
const REG_NO_REGEX = /^261FA0\d{4}$/i;

// Helper to look up exam by public_id
async function getExamByPublicId(publicId) {
  const res = await query('SELECT * FROM exams WHERE public_id = $1', [publicId]);
  return res.rows.length > 0 ? res.rows[0] : null;
}

// 1. GET /api/exam-portal/:publicId - Public exam landing info (PRIVACY SAFE: NO answer keys)
router.get('/:publicId', async (req, res) => {
  try {
    const exam = await getExamByPublicId(req.params.publicId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (exam.status === 'draft' || exam.status === 'archived') {
      return res.status(403).json({
        error: 'This examination is currently unavailable.',
        status: exam.status
      });
    }

    // Get question count and total marks
    const qCountRes = await query(
      'SELECT COUNT(*)::int as count, COALESCE(SUM(marks), 0)::float as total_marks FROM exam_questions WHERE exam_id = $1',
      [exam.id]
    );
    const qCount = qCountRes.rows[0].count;
    const computedTotalMarks = qCountRes.rows[0].total_marks || exam.total_marks;

    return res.json({
      exam: {
        id: exam.id,
        publicId: exam.public_id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        subject: exam.subject,
        durationMinutes: exam.duration_minutes,
        totalMarks: computedTotalMarks,
        passingMarks: exam.passing_marks,
        status: exam.status,
        startsAt: exam.starts_at,
        endsAt: exam.ends_at,
        questionNavigationEnabled: exam.question_navigation_enabled,
        fullscreenRequired: exam.fullscreen_required,
        focusMonitoringEnabled: exam.focus_monitoring_enabled,
        showScoreAfterSubmission: exam.show_score_after_submission,
        revealAnswersAfterSubmission: exam.reveal_answers_after_submission,
        totalQuestions: qCount
      }
    });
  } catch (err) {
    console.error('Get public exam info error:', err);
    return res.status(500).json({ error: 'Failed to load exam details.' });
  }
});

// 2. POST /api/exam-portal/:publicId/verify - Verify student eligibility and attempt status
router.post('/:publicId/verify', async (req, res) => {
  try {
    const exam = await getExamByPublicId(req.params.publicId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (exam.status === 'closed') {
      return res.status(400).json({
        eligible: false,
        status: 'closed',
        message: 'This examination has been closed by the administrator.'
      });
    }

    if (exam.status !== 'published') {
      return res.status(403).json({
        eligible: false,
        status: exam.status,
        message: 'This examination is not open for attempts.'
      });
    }

    // Check time constraints if set
    const now = new Date();
    if (exam.starts_at && new Date(exam.starts_at) > now) {
      return res.status(400).json({
        eligible: false,
        message: `This examination has not started yet. Starts at: ${new Date(exam.starts_at).toLocaleString()}`
      });
    }
    if (exam.ends_at && new Date(exam.ends_at) < now) {
      return res.status(400).json({
        eligible: false,
        message: `This examination has ended. Closed at: ${new Date(exam.ends_at).toLocaleString()}`
      });
    }

    const { registrationNumber } = req.body;
    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({ error: 'Registration number is required.' });
    }

    const normalizedReg = registrationNumber.trim().toUpperCase();

    // Validate registration number format: 261FA0XXXX
    if (!REG_NO_REGEX.test(normalizedReg)) {
      return res.status(400).json({
        eligible: false,
        error: 'Invalid Registration Number. Format must be 261FA0XXXX (e.g., 261FA01025).'
      });
    }

    // Check roster eligibility if exam is restricted to specific students
    if (exam.access_scope === 'roster_only') {
      const rosterCheck = await query(
        'SELECT 1 FROM exam_eligible_students WHERE exam_id = $1 AND registration_number = $2',
        [exam.id, normalizedReg]
      );
      if (rosterCheck.rows.length === 0) {
        return res.status(403).json({
          eligible: false,
          hasAttempt: false,
          message: 'Your registration number is not in the eligible student roster for this examination.'
        });
      }
    }

    // Check if attempt already exists in exam_attempts
    const attemptRes = await query(
      'SELECT id, attempt_status, score, maximum_marks, started_at, deadline_at, submitted_at FROM exam_attempts WHERE exam_id = $1 AND registration_number = $2',
      [exam.id, normalizedReg]
    );

    if (attemptRes.rows.length > 0) {
      const attempt = attemptRes.rows[0];
      const isCompleted = ['submitted', 'auto_submitted', 'expired'].includes(attempt.attempt_status);

      if (isCompleted) {
        return res.json({
          eligible: true,
          hasAttempt: true,
          isCompleted: true,
          attemptId: attempt.id,
          attemptStatus: attempt.attempt_status,
          message: 'You have already submitted this examination. Only one attempt is permitted.'
        });
      } else {
        // Attempt is in_progress
        const deadline = new Date(attempt.deadline_at);
        const isExpired = deadline < new Date();
        return res.json({
          eligible: true,
          hasAttempt: true,
          isCompleted: isExpired,
          attemptId: attempt.id,
          attemptStatus: isExpired ? 'expired' : 'in_progress',
          deadlineAt: attempt.deadline_at,
          message: isExpired
            ? 'Your attempt time has expired.'
            : 'You have an attempt in progress. Click Start to resume.'
        });
      }
    }

    // No prior attempt found
    return res.json({
      eligible: true,
      hasAttempt: false,
      isCompleted: false,
      message: 'Eligible to take examination.'
    });
  } catch (err) {
    console.error('Verify exam student error:', err);
    return res.status(500).json({ error: 'Failed to verify eligibility.' });
  }
});

// 3. POST /api/exam-portal/:publicId/start - Start new attempt or resume existing attempt
router.post('/:publicId/start', async (req, res) => {
  const client = await getClient();
  try {
    const exam = await getExamByPublicId(req.params.publicId);
    if (!exam) {
      client.release();
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (exam.status !== 'published') {
      client.release();
      return res.status(403).json({ error: 'Exam is not currently published.' });
    }

    const { registrationNumber, studentName = '', section = '' } = req.body;
    if (!registrationNumber || !registrationNumber.trim()) {
      client.release();
      return res.status(400).json({ error: 'Registration number is required.' });
    }

    const normalizedReg = registrationNumber.trim().toUpperCase();
    if (!REG_NO_REGEX.test(normalizedReg)) {
      client.release();
      return res.status(400).json({ error: 'Invalid registration number format. Expected 261FA0XXXX.' });
    }

    // Check roster if required
    if (exam.access_scope === 'roster_only') {
      const rosterCheck = await query(
        'SELECT 1 FROM exam_eligible_students WHERE exam_id = $1 AND registration_number = $2',
        [exam.id, normalizedReg]
      );
      if (rosterCheck.rows.length === 0) {
        client.release();
        return res.status(403).json({ error: 'Registration number not eligible for this exam.' });
      }
    }

    await client.query('BEGIN');

    // Check for existing attempt with FOR UPDATE to prevent race conditions
    const existingRes = await client.query(
      'SELECT * FROM exam_attempts WHERE exam_id = $1 AND registration_number = $2 FOR UPDATE',
      [exam.id, normalizedReg]
    );

    let attempt;
    if (existingRes.rows.length > 0) {
      attempt = existingRes.rows[0];

      // If already submitted/finalized, cannot start again
      if (['submitted', 'auto_submitted', 'expired'].includes(attempt.attempt_status)) {
        await client.query('COMMIT');
        client.release();
        return res.status(400).json({
          error: 'Exam attempt already submitted. Only one attempt is permitted.',
          isCompleted: true,
          attemptId: attempt.id,
          attemptStatus: attempt.attempt_status
        });
      }

      // Check if deadline has passed while in progress
      const deadline = new Date(attempt.deadline_at);
      if (deadline < new Date()) {
        // Deadline passed: auto finalize attempt
        await client.query(
          "UPDATE exam_attempts SET attempt_status = 'expired', submitted_at = NOW(), updated_at = NOW() WHERE id = $1",
          [attempt.id]
        );
        await client.query('COMMIT');
        client.release();
        return res.status(400).json({
          error: 'Your examination time has expired.',
          isCompleted: true,
          attemptId: attempt.id,
          attemptStatus: 'expired'
        });
      }
      // Attempt is still active and valid to resume!
      await client.query('COMMIT');
    } else {
      // Calculate total marks for snapshot
      const marksRes = await client.query(
        'SELECT COALESCE(SUM(marks), 0)::float as total FROM exam_questions WHERE exam_id = $1',
        [exam.id]
      );
      const totalMarks = marksRes.rows[0].total || exam.total_marks || 0;

      const attemptId = 'att_' + crypto.randomBytes(8).toString('hex');
      const duration = exam.duration_minutes || 60;

      const insertRes = await client.query(
        `INSERT INTO exam_attempts (
          id, exam_id, registration_number, student_name, section,
          attempt_status, started_at, deadline_at, maximum_marks
        ) VALUES (
          $1, $2, $3, $4, $5,
          'in_progress', NOW(), NOW() + ($6 || ' minutes')::INTERVAL, $7
        ) RETURNING *`,
        [attemptId, exam.id, normalizedReg, studentName.trim(), section.trim(), duration, totalMarks]
      );

      attempt = insertRes.rows[0];
      await client.query('COMMIT');
    }

    client.release();

    // Fetch questions sanitized (STRICT PRIVACY: NO correct_option_id, NO accepted_answers, NO explanation)
    const questionsRes = await query(
      `SELECT id, question_order, question_type, question_text, options_json, marks, negative_marks
       FROM exam_questions
       WHERE exam_id = $1
       ORDER BY question_order ASC, id ASC`,
      [exam.id]
    );

    let questions = questionsRes.rows.map(q => ({
      id: q.id,
      questionOrder: q.question_order,
      questionType: q.question_type,
      questionText: q.question_text,
      options: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []),
      marks: q.marks,
      negativeMarks: q.negative_marks
    }));

    // If shuffle_questions is enabled, shuffle deterministically using attempt id
    if (exam.shuffle_questions) {
      let seed = 0;
      for (let i = 0; i < attempt.id.length; i++) seed += attempt.id.charCodeAt(i);
      questions.sort((a, b) => {
        const hashA = (a.id.charCodeAt(0) * seed) % 100;
        const hashB = (b.id.charCodeAt(0) * seed) % 100;
        return hashA - hashB;
      });
    }

    // Fetch already saved student responses
    const responsesRes = await query(
      'SELECT question_id, selected_option_id, text_response, saved_at FROM exam_responses WHERE attempt_id = $1',
      [attempt.id]
    );

    const savedResponses = {};
    responsesRes.rows.forEach(r => {
      savedResponses[r.question_id] = {
        selectedOptionId: r.selected_option_id,
        textResponse: r.text_response,
        savedAt: r.saved_at
      };
    });

    return res.json({
      attempt: {
        id: attempt.id,
        registrationNumber: attempt.registration_number,
        studentName: attempt.student_name,
        section: attempt.section,
        startedAt: attempt.started_at,
        deadlineAt: attempt.deadline_at,
        durationMinutes: exam.duration_minutes,
        maximumMarks: attempt.maximum_marks,
        attemptStatus: attempt.attempt_status
      },
      exam: {
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions,
        questionNavigationEnabled: exam.question_navigation_enabled,
        fullscreenRequired: exam.fullscreen_required,
        focusMonitoringEnabled: exam.focus_monitoring_enabled
      },
      questions,
      savedResponses,
      serverTime: new Date()
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      client.release();
    }
    console.error('Start exam error:', err);
    return res.status(500).json({ error: 'Failed to start or resume exam attempt.' });
  }
});

// 4. POST /api/exam-portal/:publicId/autosave - Autosave student answer
router.post('/:publicId/autosave', async (req, res) => {
  try {
    const { attemptId, questionId, selectedOptionId, textResponse } = req.body;
    if (!attemptId || !questionId) {
      return res.status(400).json({ error: 'attemptId and questionId are required.' });
    }

    // Verify attempt ownership and deadline
    const attemptRes = await query('SELECT * FROM exam_attempts WHERE id = $1', [attemptId]);
    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    const attempt = attemptRes.rows[0];
    if (attempt.attempt_status !== 'in_progress') {
      return res.status(400).json({
        error: 'Attempt is no longer in progress.',
        attemptStatus: attempt.attempt_status
      });
    }

    // 30 seconds grace period for network latency
    const graceMs = 30 * 1000;
    if (new Date(attempt.deadline_at).getTime() + graceMs < Date.now()) {
      return res.status(400).json({
        error: 'Exam time has expired. Further answers cannot be recorded.',
        expired: true
      });
    }

    // Upsert into exam_responses
    await query(`
      INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, text_response, saved_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        selected_option_id = EXCLUDED.selected_option_id,
        text_response = EXCLUDED.text_response,
        saved_at = NOW()
    `, [attemptId, questionId, selectedOptionId || null, textResponse || null]);

    return res.json({ success: true, savedAt: new Date() });
  } catch (err) {
    console.error('Autosave error:', err);
    return res.status(500).json({ error: 'Failed to autosave response.' });
  }
});

// 5. POST /api/exam-portal/:publicId/security-event - Log tab-switch, blur, fullscreen exit
router.post('/:publicId/security-event', async (req, res) => {
  try {
    const { attemptId, eventType, metadata } = req.body;
    if (!attemptId || !eventType) {
      return res.status(400).json({ error: 'attemptId and eventType are required.' });
    }

    const validTypes = ['focus-loss', 'visibility-hidden', 'fullscreen-exit', 'fullscreen-restored', 'tab-switch', 'reconnect'];
    if (!validTypes.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type.' });
    }

    await query(
      'INSERT INTO exam_security_events (attempt_id, event_type, occurred_at, event_metadata) VALUES ($1, $2, NOW(), $3)',
      [attemptId, eventType, metadata ? JSON.stringify(metadata) : null]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Security event log error:', err);
    return res.status(500).json({ error: 'Failed to log security event.' });
  }
});

// 6. POST /api/exam-portal/:publicId/submit - Atomic Submission and Server-side Evaluation
router.post('/:publicId/submit', async (req, res) => {
  const client = await getClient();
  try {
    const { attemptId, finalResponses = [] } = req.body;
    if (!attemptId) {
      client.release();
      return res.status(400).json({ error: 'attemptId is required.' });
    }

    const exam = await getExamByPublicId(req.params.publicId);
    if (!exam) {
      client.release();
      return res.status(404).json({ error: 'Exam not found.' });
    }

    await client.query('BEGIN');

    // Lock attempt row
    const attemptRes = await client.query(
      'SELECT * FROM exam_attempts WHERE id = $1 AND exam_id = $2 FOR UPDATE',
      [attemptId, exam.id]
    );

    if (attemptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Attempt not found for this exam.' });
    }

    const attempt = attemptRes.rows[0];

    // IDEMPOTENCY: If already submitted, return the stored result immediately!
    if (['submitted', 'auto_submitted', 'expired'].includes(attempt.attempt_status)) {
      await client.query('COMMIT');
      client.release();
      const pct = attempt.maximum_marks > 0
        ? Math.round((Number(attempt.score) / Number(attempt.maximum_marks)) * 100 * 10) / 10
        : 0;
      return res.json({
        success: true,
        alreadySubmitted: true,
        result: {
          attemptId: attempt.id,
          registrationNumber: attempt.registration_number,
          studentName: attempt.student_name,
          score: Number(attempt.score),
          maximumMarks: Number(attempt.maximum_marks),
          percentage: pct,
          correctCount: attempt.correct_count,
          incorrectCount: attempt.incorrect_count,
          unansweredCount: attempt.unanswered_count,
          timeTakenSeconds: attempt.time_taken_seconds,
          attemptStatus: attempt.attempt_status
        }
      });
    }

    // Save any pending responses provided in the final payload
    if (Array.isArray(finalResponses) && finalResponses.length > 0) {
      for (const item of finalResponses) {
        if (item.questionId) {
          await client.query(`
            INSERT INTO exam_responses (attempt_id, question_id, selected_option_id, text_response, saved_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (attempt_id, question_id)
            DO UPDATE SET
              selected_option_id = EXCLUDED.selected_option_id,
              text_response = EXCLUDED.text_response,
              saved_at = NOW()
          `, [attempt.id, item.questionId, item.selectedOptionId || null, item.textResponse || null]);
        }
      }
    }

    // Determine if submission is normal or auto_submitted due to time expiry
    const deadline = new Date(attempt.deadline_at);
    // 60-second grace window for submission roundtrip
    const isOverdue = Date.now() > deadline.getTime() + 60000;
    const finalStatus = isOverdue ? 'auto_submitted' : 'submitted';

    // Fetch all questions for this exam
    const questionsRes = await client.query(
      'SELECT id, question_type, marks, negative_marks, correct_answer, accepted_answers_json FROM exam_questions WHERE exam_id = $1',
      [exam.id]
    );
    const questions = questionsRes.rows;

    // Fetch all student responses for this attempt
    const responsesRes = await client.query(
      'SELECT question_id, selected_option_id, text_response FROM exam_responses WHERE attempt_id = $1',
      [attempt.id]
    );

    const responseMap = {};
    responsesRes.rows.forEach(r => {
      responseMap[r.question_id] = r;
    });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalScore = 0;
    let totalMaxMarks = 0;

    // Server-side grading of each question
    for (const q of questions) {
      const qMarks = Number(q.marks || 1);
      const qNegMarks = exam.negative_marking_enabled ? Number(q.negative_marks || 0) : 0;
      totalMaxMarks += qMarks;

      const resp = responseMap[q.id];
      const hasOption = resp && resp.selected_option_id && resp.selected_option_id.trim();
      const hasText = resp && resp.text_response && resp.text_response.trim();

      if (!hasOption && !hasText) {
        unansweredCount++;
        if (resp) {
          await client.query(
            "UPDATE exam_responses SET marks_awarded = 0, evaluation_status = 'unanswered' WHERE attempt_id = $1 AND question_id = $2",
            [attempt.id, q.id]
          );
        }
        continue;
      }

      if (q.question_type === 'mcq') {
        const studentChoice = (resp.selected_option_id || '').trim().toUpperCase();
        const correctChoice = (q.correct_answer || '').trim().toUpperCase();

        if (studentChoice === correctChoice) {
          correctCount++;
          totalScore += qMarks;
          await client.query(
            "UPDATE exam_responses SET marks_awarded = $1, evaluation_status = 'correct' WHERE attempt_id = $2 AND question_id = $3",
            [qMarks, attempt.id, q.id]
          );
        } else {
          incorrectCount++;
          totalScore -= qNegMarks;
          await client.query(
            "UPDATE exam_responses SET marks_awarded = $1, evaluation_status = 'incorrect' WHERE attempt_id = $2 AND question_id = $3",
            [-qNegMarks, attempt.id, q.id]
          );
        }
      } else if (q.question_type === 'fill_blank' || q.question_type === 'fill_in_the_blank') {
        const studentText = (resp.text_response || '').trim();
        let acceptedAnswers = [];

        if (Array.isArray(q.accepted_answers_json)) {
          acceptedAnswers = q.accepted_answers_json;
        } else if (typeof q.accepted_answers_json === 'string') {
          try {
            acceptedAnswers = JSON.parse(q.accepted_answers_json);
          } catch (_) {
            acceptedAnswers = [q.correct_answer];
          }
        } else if (q.correct_answer) {
          acceptedAnswers = [q.correct_answer];
        }

        const studentNorm = studentText.toLowerCase();
        const isMatch = acceptedAnswers.some(ans =>
          typeof ans === 'string' && ans.trim().toLowerCase() === studentNorm
        );

        if (isMatch) {
          correctCount++;
          totalScore += qMarks;
          await client.query(
            "UPDATE exam_responses SET marks_awarded = $1, evaluation_status = 'correct' WHERE attempt_id = $2 AND question_id = $3",
            [qMarks, attempt.id, q.id]
          );
        } else {
          incorrectCount++;
          totalScore -= qNegMarks;
          await client.query(
            "UPDATE exam_responses SET marks_awarded = $1, evaluation_status = 'incorrect' WHERE attempt_id = $2 AND question_id = $3",
            [-qNegMarks, attempt.id, q.id]
          );
        }
      }
    }

    // Floor score at 0 if negative marks drop it below 0
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const startedAt = new Date(attempt.started_at);
    const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

    const percentage = totalMaxMarks > 0 ? Math.round((finalScore / totalMaxMarks) * 100 * 10) / 10 : 0;

    // Update attempt record
    await client.query(`
      UPDATE exam_attempts
      SET
        attempt_status = $1,
        submitted_at = NOW(),
        time_taken_seconds = $2,
        score = $3,
        maximum_marks = $4,
        percentage = $5,
        correct_count = $6,
        incorrect_count = $7,
        unanswered_count = $8,
        updated_at = NOW()
      WHERE id = $9
    `, [finalStatus, timeTakenSeconds, finalScore, totalMaxMarks, percentage, correctCount, incorrectCount, unansweredCount, attempt.id]);

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      result: {
        attemptId: attempt.id,
        registrationNumber: attempt.registration_number,
        studentName: attempt.student_name,
        score: finalScore,
        maximumMarks: totalMaxMarks,
        percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSeconds,
        attemptStatus: finalStatus
      }
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      client.release();
    }
    console.error('Submit exam error:', err);
    return res.status(500).json({ error: 'Failed to submit exam.' });
  }
});

// 7. GET /api/exam-portal/:publicId/result/:attemptId - Get student's own verified result
router.get('/:publicId/result/:attemptId', async (req, res) => {
  try {
    const { attemptId } = req.params;
    const exam = await getExamByPublicId(req.params.publicId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const attemptRes = await query(
      'SELECT * FROM exam_attempts WHERE id = $1 AND exam_id = $2',
      [attemptId, exam.id]
    );

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt result not found.' });
    }

    const attempt = attemptRes.rows[0];
    const isCompleted = ['submitted', 'auto_submitted', 'expired'].includes(attempt.attempt_status);
    if (!isCompleted) {
      return res.status(400).json({ error: 'Attempt is still in progress.' });
    }

    const percentage = attempt.maximum_marks > 0
      ? Math.round((Number(attempt.score) / Number(attempt.maximum_marks)) * 100 * 10) / 10
      : 0;

    let reviewQuestions = null;
    // Reveal correct answers and explanations ONLY if configured by admin
    if (exam.reveal_answers_after_submission) {
      const qRes = await query(
        `SELECT q.id, q.question_order, q.question_type, q.question_text, q.options_json,
                q.marks, q.correct_answer, q.explanation,
                r.selected_option_id, r.text_response, r.marks_awarded, r.evaluation_status
         FROM exam_questions q
         LEFT JOIN exam_responses r ON q.id = r.question_id AND r.attempt_id = $1
         WHERE q.exam_id = $2
         ORDER BY q.question_order ASC, q.id ASC`,
        [attempt.id, exam.id]
      );

      reviewQuestions = qRes.rows.map(q => ({
        id: q.id,
        questionOrder: q.question_order,
        questionType: q.question_type,
        questionText: q.question_text,
        options: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : (q.options_json || []),
        marks: q.marks,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        studentSelectedOption: q.selected_option_id,
        studentTextResponse: q.text_response,
        marksAwarded: q.marks_awarded,
        evaluationStatus: q.evaluation_status || 'unanswered'
      }));
    }

    return res.json({
      examTitle: exam.title,
      subject: exam.subject,
      passingMarks: exam.passing_marks,
      attempt: {
        id: attempt.id,
        registrationNumber: attempt.registration_number,
        studentName: attempt.student_name,
        section: attempt.section,
        score: Number(attempt.score),
        maximumMarks: Number(attempt.maximum_marks),
        percentage,
        correctCount: attempt.correct_count,
        incorrectCount: attempt.incorrect_count,
        unansweredCount: attempt.unanswered_count,
        timeTakenSeconds: attempt.time_taken_seconds,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        attemptStatus: attempt.attempt_status
      },
      reviewQuestions
    });
  } catch (err) {
    console.error('Get attempt result error:', err);
    return res.status(500).json({ error: 'Failed to fetch exam result.' });
  }
});

module.exports = router;
