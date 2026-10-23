const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, getClient } = require('../config/db');
const { verifyMentorToken } = require('../middleware/auth');
const { parseBulkQuestions } = require('../utils/examParser');

function slugify(text) {
  return String(text || 'exam')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'exam';
}

function normalizeRegNumbers(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(r => String(r).trim().toUpperCase()).filter(Boolean);
  }
  return String(input)
    .split(/[\n,\r\s]+/)
    .map(r => r.trim().toUpperCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------
// 1. GET /api/exams - List all exams for Admin with summary metrics
// ---------------------------------------------------------------------
router.get('/', verifyMentorToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        e.id, e.public_id, e.title, e.description, e.instructions, e.subject,
        e.duration_minutes, e.status, e.total_marks, e.passing_marks,
        e.negative_marking_enabled, e.negative_mark_value,
        e.question_navigation_enabled, e.shuffle_questions, e.shuffle_options,
        e.show_score_after_submission, e.reveal_answers_after_submission,
        e.fullscreen_required, e.focus_monitoring_enabled,
        e.created_by, e.created_at, e.updated_at, e.published_at, e.closed_at,
        COALESCE(q.question_count, 0)::int as question_count,
        COALESCE(el.eligible_count, 0)::int as eligible_count,
        COALESCE(att.attempt_count, 0)::int as attempt_count,
        COALESCE(att.completed_count, 0)::int as completed_attempts_count,
        COALESCE(att.avg_score, 0)::numeric(10,2) as average_score
      FROM exams e
      LEFT JOIN (
        SELECT exam_id, COUNT(*)::int as question_count 
        FROM exam_questions 
        GROUP BY exam_id
      ) q ON q.exam_id = e.id
      LEFT JOIN (
        SELECT exam_id, COUNT(*)::int as eligible_count 
        FROM exam_eligible_students 
        GROUP BY exam_id
      ) el ON el.exam_id = e.id
      LEFT JOIN (
        SELECT 
          exam_id, 
          COUNT(*)::int as attempt_count,
          COUNT(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN 1 END)::int as completed_count,
          AVG(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN score END) as avg_score
        FROM exam_attempts 
        GROUP BY exam_id
      ) att ON att.exam_id = e.id
      ORDER BY e.created_at DESC
    `);

    return res.json({ exams: result.rows });
  } catch (err) {
    console.error('List exams error:', err);
    return res.status(500).json({ error: 'Failed to retrieve exams.' });
  }
});

// ---------------------------------------------------------------------
// 2. POST /api/exams - Create new exam
// ---------------------------------------------------------------------
router.post('/', verifyMentorToken, async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      subject,
      durationMinutes,
      passingMarks,
      negativeMarkingEnabled,
      negativeMarkValue,
      questionNavigationEnabled,
      shuffleQuestions,
      shuffleOptions,
      showScoreAfterSubmission,
      revealAnswersAfterSubmission,
      fullscreenRequired,
      focusMonitoringEnabled,
      eligibleStudents
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Exam title is required.' });
    }

    const examId = 'exam_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const publicId = `${slugify(title)}-${crypto.randomBytes(3).toString('hex')}`;
    const duration = parseInt(durationMinutes, 10) || 30;
    const passMarks = parseFloat(passingMarks) || 0;
    const negEnabled = Boolean(negativeMarkingEnabled);
    const negVal = parseFloat(negativeMarkValue) || 0;
    const navEnabled = questionNavigationEnabled !== false;
    const shufQ = Boolean(shuffleQuestions);
    const shufOpt = Boolean(shuffleOptions);
    const showScore = showScoreAfterSubmission !== false;
    const revealAnswers = Boolean(revealAnswersAfterSubmission);
    const fsReq = fullscreenRequired !== false;
    const focusMon = focusMonitoringEnabled !== false;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(`
        INSERT INTO exams (
          id, public_id, title, description, instructions, subject,
          duration_minutes, status, total_marks, passing_marks,
          negative_marking_enabled, negative_mark_value,
          question_navigation_enabled, shuffle_questions, shuffle_options,
          show_score_after_submission, reveal_answers_after_submission,
          fullscreen_required, focus_monitoring_enabled,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 'draft', 0, $8,
          $9, $10,
          $11, $12, $13,
          $14, $15,
          $16, $17,
          $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        examId, publicId, title.trim(),
        description ? description.trim() : '',
        instructions ? instructions.trim() : 'Read questions carefully and select your best answer.',
        subject ? subject.trim() : 'C Programming',
        duration, passMarks, negEnabled, negVal,
        navEnabled, shufQ, shufOpt,
        showScore, revealAnswers, fsReq, focusMon,
        req.mentor.id
      ]);

      // Add eligible students if provided
      const regList = Array.from(new Set(normalizeRegNumbers(eligibleStudents)));
      for (const reg of regList) {
        await client.query(`
          INSERT INTO exam_eligible_students (exam_id, registration_number)
          VALUES ($1, $2) ON CONFLICT DO NOTHING
        `, [examId, reg]);
      }

      await client.query('COMMIT');

      const createdRes = await query('SELECT * FROM exams WHERE id = $1', [examId]);
      return res.status(201).json({
        message: 'Exam created successfully',
        exam: createdRes.rows[0]
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create exam error:', err);
    return res.status(500).json({ error: 'Failed to create exam.' });
  }
});

// ---------------------------------------------------------------------
// 3. GET /api/exams/:id - Get full exam details for Admin edit view
// ---------------------------------------------------------------------
router.get('/:id', verifyMentorToken, async (req, res) => {
  try {
    const examRes = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const exam = examRes.rows[0];

    // Fetch questions
    const qRes = await query(`
      SELECT * FROM exam_questions 
      WHERE exam_id = $1 
      ORDER BY question_order ASC, created_at ASC
    `, [exam.id]);

    const questions = qRes.rows.map(q => ({
      ...q,
      options: q.options_json ? JSON.parse(q.options_json) : [],
      acceptedAnswers: q.accepted_answers_json ? JSON.parse(q.accepted_answers_json) : []
    }));

    // Fetch eligible students
    const elRes = await query(`
      SELECT registration_number, student_name, section 
      FROM exam_eligible_students 
      WHERE exam_id = $1 
      ORDER BY registration_number ASC
    `, [exam.id]);

    return res.json({
      exam,
      questions,
      eligibleStudents: elRes.rows
    });
  } catch (err) {
    console.error('Get exam details error:', err);
    return res.status(500).json({ error: 'Failed to load exam details.' });
  }
});

// ---------------------------------------------------------------------
// 4. PUT /api/exams/:id - Update exam settings
// ---------------------------------------------------------------------
router.put('/:id', verifyMentorToken, async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      subject,
      durationMinutes,
      passingMarks,
      negativeMarkingEnabled,
      negativeMarkValue,
      questionNavigationEnabled,
      shuffleQuestions,
      shuffleOptions,
      showScoreAfterSubmission,
      revealAnswersAfterSubmission,
      fullscreenRequired,
      focusMonitoringEnabled,
      eligibleStudents
    } = req.body;

    const examRes = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const duration = parseInt(durationMinutes, 10) || 30;
    const passMarks = parseFloat(passingMarks) || 0;
    const negEnabled = Boolean(negativeMarkingEnabled);
    const negVal = parseFloat(negativeMarkValue) || 0;
    const navEnabled = questionNavigationEnabled !== false;
    const shufQ = Boolean(shuffleQuestions);
    const shufOpt = Boolean(shuffleOptions);
    const showScore = showScoreAfterSubmission !== false;
    const revealAnswers = Boolean(revealAnswersAfterSubmission);
    const fsReq = fullscreenRequired !== false;
    const focusMon = focusMonitoringEnabled !== false;

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE exams SET
          title = $1, description = $2, instructions = $3, subject = $4,
          duration_minutes = $5, passing_marks = $6,
          negative_marking_enabled = $7, negative_mark_value = $8,
          question_navigation_enabled = $9, shuffle_questions = $10, shuffle_options = $11,
          show_score_after_submission = $12, reveal_answers_after_submission = $13,
          fullscreen_required = $14, focus_monitoring_enabled = $15,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
      `, [
        title.trim(), description || '', instructions || '', subject || 'C Programming',
        duration, passMarks, negEnabled, negVal,
        navEnabled, shufQ, shufOpt,
        showScore, revealAnswers, fsReq, focusMon,
        req.params.id
      ]);

      if (eligibleStudents !== undefined) {
        // Replace eligible roster
        await client.query('DELETE FROM exam_eligible_students WHERE exam_id = $1', [req.params.id]);
        const regList = Array.from(new Set(normalizeRegNumbers(eligibleStudents)));
        for (const reg of regList) {
          await client.query(`
            INSERT INTO exam_eligible_students (exam_id, registration_number)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [req.params.id, reg]);
        }
      }

      await client.query('COMMIT');

      const updated = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
      return res.json({ message: 'Exam updated successfully', exam: updated.rows[0] });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update exam error:', err);
    return res.status(500).json({ error: 'Failed to update exam.' });
  }
});

// ---------------------------------------------------------------------
// 5. DELETE /api/exams/:id - Delete exam
// ---------------------------------------------------------------------
router.delete('/:id', verifyMentorToken, async (req, res) => {
  try {
    const delRes = await query('DELETE FROM exams WHERE id = $1 RETURNING id', [req.params.id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }
    return res.json({ message: 'Exam deleted successfully.' });
  } catch (err) {
    console.error('Delete exam error:', err);
    return res.status(500).json({ error: 'Failed to delete exam.' });
  }
});

// ---------------------------------------------------------------------
// 6. POST /api/exams/:id/publish - Publish exam
// ---------------------------------------------------------------------
router.post('/:id/publish', verifyMentorToken, async (req, res) => {
  try {
    const examRes = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const qCountRes = await query('SELECT COUNT(*)::int as count FROM exam_questions WHERE exam_id = $1', [req.params.id]);
    if (qCountRes.rows[0].count === 0) {
      return res.status(400).json({ error: 'Cannot publish an exam with zero questions. Please add questions first.' });
    }

    await query(`
      UPDATE exams SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    const updated = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    return res.json({
      message: 'Exam published successfully! Students can now access the exam link.',
      exam: updated.rows[0]
    });
  } catch (err) {
    console.error('Publish exam error:', err);
    return res.status(500).json({ error: 'Failed to publish exam.' });
  }
});

// ---------------------------------------------------------------------
// 7. POST /api/exams/:id/close - Close exam
// ---------------------------------------------------------------------
router.post('/:id/close', verifyMentorToken, async (req, res) => {
  try {
    await query(`
      UPDATE exams SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    const updated = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    return res.json({
      message: 'Exam closed successfully. New attempts are now blocked.',
      exam: updated.rows[0]
    });
  } catch (err) {
    console.error('Close exam error:', err);
    return res.status(500).json({ error: 'Failed to close exam.' });
  }
});

// ---------------------------------------------------------------------
// 8. Question Management: Add, Edit, Delete
// ---------------------------------------------------------------------
router.post('/:id/questions', verifyMentorToken, async (req, res) => {
  try {
    const { questionType, questionText, options, correctAnswer, acceptedAnswers, marks, explanation } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required.' });
    }

    if (!correctAnswer || !correctAnswer.trim()) {
      return res.status(400).json({ error: 'Correct answer is required.' });
    }

    const qType = questionType === 'fill_blank' ? 'fill_blank' : 'mcq';
    if (qType === 'mcq' && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ error: 'At least 2 options are required for MCQ.' });
    }

    const qId = 'q_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const qMarks = parseFloat(marks) || 1;

    // Get next order number
    const maxOrderRes = await query('SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM exam_questions WHERE exam_id = $1', [req.params.id]);
    const nextOrder = maxOrderRes.rows[0].next_order;

    await query(`
      INSERT INTO exam_questions (
        id, exam_id, question_order, question_type, question_text,
        options_json, correct_answer, accepted_answers_json, marks, explanation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      qId, req.params.id, nextOrder, qType, questionText.trim(),
      options ? JSON.stringify(options) : null,
      correctAnswer.trim().toUpperCase(),
      acceptedAnswers ? JSON.stringify(acceptedAnswers) : JSON.stringify([correctAnswer.trim()]),
      qMarks, explanation ? explanation.trim() : ''
    ]);

    // Recalculate total marks
    await query(`
      UPDATE exams SET 
        total_marks = (SELECT COALESCE(SUM(marks), 0) FROM exam_questions WHERE exam_id = $1),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    const createdQ = await query('SELECT * FROM exam_questions WHERE id = $1', [qId]);
    return res.status(201).json({
      message: 'Question added successfully',
      question: {
        ...createdQ.rows[0],
        options: createdQ.rows[0].options_json ? JSON.parse(createdQ.rows[0].options_json) : [],
        acceptedAnswers: createdQ.rows[0].accepted_answers_json ? JSON.parse(createdQ.rows[0].accepted_answers_json) : []
      }
    });
  } catch (err) {
    console.error('Add question error:', err);
    return res.status(500).json({ error: 'Failed to add question.' });
  }
});

router.put('/:id/questions/:questionId', verifyMentorToken, async (req, res) => {
  try {
    const { questionType, questionText, options, correctAnswer, acceptedAnswers, marks, explanation } = req.body;

    const qMarks = parseFloat(marks) || 1;
    await query(`
      UPDATE exam_questions SET
        question_type = $1, question_text = $2, options_json = $3,
        correct_answer = $4, accepted_answers_json = $5, marks = $6, explanation = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND exam_id = $9
    `, [
      questionType, questionText.trim(), options ? JSON.stringify(options) : null,
      correctAnswer.trim().toUpperCase(), acceptedAnswers ? JSON.stringify(acceptedAnswers) : null,
      qMarks, explanation || '',
      req.params.questionId, req.params.id
    ]);

    // Recalculate total marks
    await query(`
      UPDATE exams SET 
        total_marks = (SELECT COALESCE(SUM(marks), 0) FROM exam_questions WHERE exam_id = $1),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    return res.json({ message: 'Question updated successfully.' });
  } catch (err) {
    console.error('Update question error:', err);
    return res.status(500).json({ error: 'Failed to update question.' });
  }
});

router.delete('/:id/questions/:questionId', verifyMentorToken, async (req, res) => {
  try {
    await query('DELETE FROM exam_questions WHERE id = $1 AND exam_id = $2', [req.params.questionId, req.params.id]);

    // Recalculate total marks
    await query(`
      UPDATE exams SET 
        total_marks = (SELECT COALESCE(SUM(marks), 0) FROM exam_questions WHERE exam_id = $1),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    return res.json({ message: 'Question deleted successfully.' });
  } catch (err) {
    console.error('Delete question error:', err);
    return res.status(500).json({ error: 'Failed to delete question.' });
  }
});

// ---------------------------------------------------------------------
// 9. POST /api/exams/:id/questions/bulk & /api/exams/:id/bulk-import - Bulk import questions with transactional save
// ---------------------------------------------------------------------
router.post(['/:id/questions/bulk', '/:id/bulk-import'], verifyMentorToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ExamArena API] Received ${req.method} ${req.originalUrl || req.baseUrl + req.path} for exam ID: ${req.params.id}`);
    }

    const examCheck = await query('SELECT id, status FROM exams WHERE id = $1', [req.params.id]);
    if (examCheck.rows.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[ExamArena API] Exam lookup failed: ID ${req.params.id} does not exist in database`);
      }
      return res.status(404).json({ error: 'Exam not found.' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ExamArena API] Exam lookup succeeded: ID ${req.params.id} (Status: ${examCheck.rows[0].status})`);
    }

    const { rawText, defaultMarks } = req.body;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No question text provided for import.' });
    }

    const parseResult = parseBulkQuestions(rawText, defaultMarks);

    if (parseResult.errors.length > 0 && parseResult.questions.length === 0) {
      return res.status(400).json({
        error: 'Bulk import parsing failed.',
        errors: parseResult.errors,
        totalParsed: parseResult.totalParsed,
        validCount: parseResult.validCount
      });
    }

    // Transactional save for all valid parsed questions
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get current max order
      const maxOrderRes = await client.query('SELECT COALESCE(MAX(question_order), 0) as max_order FROM exam_questions WHERE exam_id = $1', [req.params.id]);
      let currentOrder = maxOrderRes.rows[0].max_order;

      for (const q of parseResult.questions) {
        currentOrder += 1;
        const qId = 'q_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
        await client.query(`
          INSERT INTO exam_questions (
            id, exam_id, question_order, question_type, question_text,
            options_json, correct_answer, accepted_answers_json, marks, explanation
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          qId, req.params.id, currentOrder, q.type, q.text,
          q.options ? JSON.stringify(q.options) : null,
          q.correctAnswer,
          q.acceptedAnswers ? JSON.stringify(q.acceptedAnswers) : null,
          q.marks, q.explanation || ''
        ]);
      }

      // Update total marks
      await client.query(`
        UPDATE exams SET 
          total_marks = (SELECT COALESCE(SUM(marks), 0) FROM exam_questions WHERE exam_id = $1),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [req.params.id]);

      await client.query('COMMIT');

      const updatedExam = await query('SELECT total_marks FROM exams WHERE id = $1', [req.params.id]);

      return res.json({
        success: true,
        message: `Successfully imported ${parseResult.questions.length} questions!`,
        importedCount: parseResult.questions.length,
        errors: parseResult.errors,
        totalMarks: updatedExam.rows[0]?.total_marks
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk import questions error:', err);
    return res.status(500).json({ error: 'Failed to bulk import questions.' });
  }
});

// ---------------------------------------------------------------------
// 10. GET /api/exams/:id/results - Comprehensive Admin Analytics Dashboard
// ---------------------------------------------------------------------
router.get('/:id/results', verifyMentorToken, async (req, res) => {
  try {
    const examRes = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }
    const exam = examRes.rows[0];

    // Summary Analytics
    const analyticsRes = await query(`
      SELECT 
        COUNT(*)::int as total_attempts,
        COUNT(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN 1 END)::int as completed_count,
        COUNT(CASE WHEN attempt_status = 'in_progress' THEN 1 END)::int as in_progress_count,
        COUNT(CASE WHEN attempt_status = 'auto_submitted' THEN 1 END)::int as auto_submitted_count,
        AVG(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN score END) as avg_score,
        MAX(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN score END) as highest_score,
        MIN(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN score END) as lowest_score,
        AVG(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') THEN time_taken_seconds END)::int as avg_time_seconds,
        COUNT(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') AND score >= $2 THEN 1 END)::int as pass_count,
        COUNT(CASE WHEN attempt_status IN ('submitted', 'auto_submitted') AND score < $2 THEN 1 END)::int as fail_count
      FROM exam_attempts 
      WHERE exam_id = $1
    `, [exam.id, exam.passing_marks || 0]);

    const stats = analyticsRes.rows[0];
    const completed = stats.completed_count || 0;
    const passPercentage = completed > 0 ? ((stats.pass_count / completed) * 100).toFixed(1) : 0;

    // Student attempts list
    const attemptsRes = await query(`
      SELECT 
        a.id, a.registration_number, a.student_name, a.attempt_status,
        a.started_at, a.submitted_at, a.time_taken_seconds,
        a.score, a.maximum_marks,
        COALESCE(NULLIF(a.percentage, 0), ROUND((a.score / NULLIF(a.maximum_marks, 0) * 100)::numeric, 2), 0) AS percentage,
        a.correct_count, a.incorrect_count, a.unanswered_count,
        a.focus_loss_count, a.fullscreen_exit_count,
        COALESCE(a.section, el.section) AS section
      FROM exam_attempts a
      LEFT JOIN exam_eligible_students el ON el.exam_id = a.exam_id AND el.registration_number = a.registration_number
      WHERE a.exam_id = $1
      ORDER BY a.score DESC, a.submitted_at ASC
    `, [exam.id]);

    // Question-wise accuracy stats
    const questionStatsRes = await query(`
      SELECT 
        q.id, q.question_order, q.question_type, q.question_text, q.marks, q.correct_answer,
        COUNT(r.id)::int as total_answered,
        COUNT(CASE WHEN r.is_correct = true THEN 1 END)::int as correct_count,
        COUNT(CASE WHEN r.is_correct = false THEN 1 END)::int as incorrect_count
      FROM exam_questions q
      LEFT JOIN exam_responses r ON r.question_id = q.id
      WHERE q.exam_id = $1
      GROUP BY q.id, q.question_order, q.question_type, q.question_text, q.marks, q.correct_answer
      ORDER BY q.question_order ASC
    `, [exam.id]);

    return res.json({
      exam,
      summary: {
        totalAttempts: stats.total_attempts || 0,
        completedCount: completed,
        inProgressCount: stats.in_progress_count || 0,
        autoSubmittedCount: stats.auto_submitted_count || 0,
        averageScore: stats.avg_score ? parseFloat(Number(stats.avg_score).toFixed(2)) : 0,
        highestScore: stats.highest_score ? parseFloat(stats.highest_score) : 0,
        lowestScore: stats.lowest_score ? parseFloat(stats.lowest_score) : 0,
        passCount: stats.pass_count || 0,
        failCount: stats.fail_count || 0,
        passPercentage: Number(passPercentage),
        averageTimeSeconds: stats.avg_time_seconds || 0
      },
      attempts: attemptsRes.rows,
      questionStats: questionStatsRes.rows.map(qs => ({
        ...qs,
        accuracyPercentage: qs.total_answered > 0 ? Number(((qs.correct_count / qs.total_answered) * 100).toFixed(1)) : 0
      }))
    });
  } catch (err) {
    console.error('Get exam results error:', err);
    return res.status(500).json({ error: 'Failed to load exam results.' });
  }
});

// ---------------------------------------------------------------------
// 11. GET /api/exams/:id/attempts/:attemptId - Individual Attempt Review
// ---------------------------------------------------------------------
router.get('/:id/attempts/:attemptId', verifyMentorToken, async (req, res) => {
  try {
    const attemptRes = await query(`
      SELECT 
        a.*, 
        COALESCE(a.section, el.section) AS section,
        COALESCE(NULLIF(a.percentage, 0), ROUND((a.score / NULLIF(a.maximum_marks, 0) * 100)::numeric, 2), 0) AS percentage
      FROM exam_attempts a
      LEFT JOIN exam_eligible_students el ON el.exam_id = a.exam_id AND el.registration_number = a.registration_number
      WHERE a.id = $1 AND a.exam_id = $2
    `, [req.params.attemptId, req.params.id]);

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    const attempt = attemptRes.rows[0];

    // Fetch questions with student responses
    const responsesRes = await query(`
      SELECT 
        q.id as question_id, q.question_order, q.question_type, q.question_text,
        q.options_json, q.correct_answer, q.accepted_answers_json, q.marks, q.explanation,
        r.selected_option, r.text_response, r.is_correct, r.marks_awarded, r.saved_at
      FROM exam_questions q
      LEFT JOIN exam_responses r ON r.question_id = q.id AND r.attempt_id = $1
      WHERE q.exam_id = $2
      ORDER BY q.question_order ASC
    `, [attempt.id, req.params.id]);

    // Fetch security events
    const secEventsRes = await query(`
      SELECT event_type, occurred_at, event_metadata 
      FROM exam_security_events 
      WHERE attempt_id = $1 
      ORDER BY occurred_at ASC
    `, [attempt.id]);

    return res.json({
      attempt,
      questions: responsesRes.rows.map(r => ({
        ...r,
        options: r.options_json ? JSON.parse(r.options_json) : [],
        acceptedAnswers: r.accepted_answers_json ? JSON.parse(r.accepted_answers_json) : []
      })),
      securityEvents: secEventsRes.rows
    });
  } catch (err) {
    console.error('Get individual attempt error:', err);
    return res.status(500).json({ error: 'Failed to load attempt details.' });
  }
});

// ---------------------------------------------------------------------
// 12. GET /api/exams/:id/export-csv - CSV Export with formula injection protection
// ---------------------------------------------------------------------
router.get('/:id/export-csv', verifyMentorToken, async (req, res) => {
  try {
    const examRes = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found.' });
    }
    const exam = examRes.rows[0];

    const attemptsRes = await query(`
      SELECT 
        a.registration_number, a.student_name, 
        COALESCE(a.section, el.section, 'General') as section,
        a.attempt_status, a.score, a.maximum_marks, 
        COALESCE(NULLIF(a.percentage, 0), ROUND((a.score / NULLIF(a.maximum_marks, 0) * 100)::numeric, 2), 0) as percentage,
        a.correct_count, a.incorrect_count, a.unanswered_count,
        a.time_taken_seconds, a.started_at, a.submitted_at,
        a.focus_loss_count, a.fullscreen_exit_count
      FROM exam_attempts a
      LEFT JOIN exam_eligible_students el ON el.exam_id = a.exam_id AND el.registration_number = a.registration_number
      WHERE a.exam_id = $1
      ORDER BY a.score DESC, a.submitted_at ASC
    `, [exam.id]);

    // Helper to sanitize CSV cells against Formula Injection (=, +, -, @)
    const sanitizeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=\+\-@\t\r]/.test(str)) {
        str = "'" + str; // Prepend apostrophe to neutralize formula execution in Excel/Sheets
      }
      return `"${str}"`;
    };

    const headers = [
      'Registration Number',
      'Student Name',
      'Section',
      'Status',
      'Score',
      'Maximum Marks',
      'Percentage (%)',
      'Correct Answers',
      'Incorrect Answers',
      'Unanswered',
      'Time Taken (Minutes)',
      'Tab Switch Events',
      'Fullscreen Exits',
      'Started At',
      'Submitted At'
    ];

    const rows = attemptsRes.rows.map(att => [
      sanitizeCsv(att.registration_number),
      sanitizeCsv(att.student_name || 'Student'),
      sanitizeCsv(att.section),
      sanitizeCsv(att.attempt_status),
      att.score,
      att.maximum_marks,
      att.percentage,
      att.correct_count,
      att.incorrect_count,
      att.unanswered_count,
      (att.time_taken_seconds / 60).toFixed(1),
      att.focus_loss_count,
      att.fullscreen_exit_count,
      sanitizeCsv(att.started_at ? new Date(att.started_at).toISOString() : ''),
      sanitizeCsv(att.submitted_at ? new Date(att.submitted_at).toISOString() : '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="exam_results_${slugify(exam.title)}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

module.exports = router;
