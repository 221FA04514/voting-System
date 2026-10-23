require('dotenv').config();
const { query } = require('../server/config/db');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../server/middleware/auth');
const examRoutes = require('../server/routes/exam.routes');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TARGETED VERIFICATION: POST /api/exams/:id/questions/bulk');
  console.log('================================================================\n');

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

  // Create Express test app mirroring production server setup
  const app = express();
  app.use(express.json());
  app.use('/api/exams', examRoutes);

  // Start temporary test server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const testSuffix = Date.now();
  const testExamId = `exam_test_bulk_${testSuffix}`;
  let mentorToken;

  try {
    // 1. Get/create mentor user and generate auth token
    let mentorRes = await query("SELECT id, email, name, role FROM users WHERE role = 'mentor' LIMIT 1");
    let mentor;
    if (mentorRes.rows.length === 0) {
      const newId = 'mentor_bulk_' + testSuffix;
      await query("INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, 'dummy', 'Test Mentor', 'mentor')", [newId, 'mentor_bulk@vignan.edu']);
      mentor = { id: newId, email: 'mentor_bulk@vignan.edu', name: 'Test Mentor', role: 'mentor' };
    } else {
      mentor = mentorRes.rows[0];
    }
    mentorToken = jwt.sign(
      { id: mentor.id, email: mentor.email, name: mentor.name, role: mentor.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    assert(!!mentorToken, 'Mentor JWT authentication token generated');

    // 2. Create existing test exam in DB
    await query(`
      INSERT INTO exams (id, public_id, title, duration_minutes, status, created_by)
      VALUES ($1, $2, 'Targeted Bulk Import Test Exam', 30, 'draft', $3)
    `, [testExamId, `test-pub-${testSuffix}`, mentor.id]);
    assert(true, `Test exam record created in database: ${testExamId}`);

    // TEST A: POST to exact URL: /api/exams/:id/questions/bulk with valid questions
    const validQuestionsText = `
TYPE: MCQ
Q: What is the size of an int in standard 32-bit/64-bit GCC on x86?
A: 1 byte
B: 2 bytes
C: 4 bytes
D: 8 bytes
ANSWER: C
MARKS: 2

TYPE: FILL
Q: The format specifier to read an integer with scanf is ______.
ANSWER: %d
ACCEPTED: %d; %i
MARKS: 2

1. Which keyword is used to allocate memory dynamically in C?
A. new
B. malloc
C. create
D. alloc
Answer: B
Marks: 2
`;
    const postRes1 = await fetch(`${baseUrl}/api/exams/${testExamId}/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mentorToken}`
      },
      body: JSON.stringify({ rawText: validQuestionsText })
    });

    const data1 = await postRes1.json();
    assert(postRes1.status === 200, `POST /api/exams/:id/questions/bulk returned HTTP 200 (got ${postRes1.status})`);
    assert(data1.success === true, 'Response payload has success: true');
    assert(data1.importedCount === 3, `Imported count is 3 (got ${data1.importedCount})`);

    // TEST B: Verify DB persistence of imported questions & recalculated total_marks
    const qCountRes = await query('SELECT COUNT(*)::int as count FROM exam_questions WHERE exam_id = $1', [testExamId]);
    assert(qCountRes.rows[0].count === 3, `3 questions persisted in exam_questions table (got ${qCountRes.rows[0].count})`);

    const examCheckRes = await query('SELECT total_marks FROM exams WHERE id = $1', [testExamId]);
    assert(Number(examCheckRes.rows[0].total_marks) === 6, `Exam total_marks recalculated to 6 (got ${examCheckRes.rows[0].total_marks})`);

    // TEST C: POST to exact user error ID if present or non-existent exam ID
    const nonexistentExamId = 'exam_nonexistent_9999999';
    const postRes2 = await fetch(`${baseUrl}/api/exams/${nonexistentExamId}/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mentorToken}`
      },
      body: JSON.stringify({ rawText: validQuestionsText })
    });
    const data2 = await postRes2.json();
    assert(postRes2.status === 404, `Nonexistent exam ID returns HTTP 404 (got ${postRes2.status})`);
    assert(data2.error === 'Exam not found.', `Response body error is 'Exam not found.' (got ${data2.error})`);

    // TEST D: Unauthorized user (missing or invalid token)
    const postRes3 = await fetch(`${baseUrl}/api/exams/${testExamId}/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header
      },
      body: JSON.stringify({ rawText: validQuestionsText })
    });
    assert(postRes3.status === 401, `Unauthorized request returns HTTP 401 (got ${postRes3.status})`);

    const postResInvalidToken = await fetch(`${baseUrl}/api/exams/${testExamId}/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_garbage_token'
      },
      body: JSON.stringify({ rawText: validQuestionsText })
    });
    assert(postResInvalidToken.status === 401, `Invalid token returns HTTP 401 (got ${postResInvalidToken.status})`);

    // TEST E: Malformed question payload
    const postResEmpty = await fetch(`${baseUrl}/api/exams/${testExamId}/questions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mentorToken}`
      },
      body: JSON.stringify({ rawText: '   ' })
    });
    const dataEmpty = await postResEmpty.json();
    assert(postResEmpty.status === 400, `Empty rawText returns HTTP 400 (got ${postResEmpty.status})`);
    assert(dataEmpty.error.includes('No question text provided'), 'Error message informs no question text provided');

    // TEST F: Also verify the alias route /api/exams/:id/bulk-import still works for backwards compatibility
    const postResAlias = await fetch(`${baseUrl}/api/exams/${testExamId}/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mentorToken}`
      },
      body: JSON.stringify({
        rawText: `
TYPE: FILL
Q: The header file required for malloc() is ______.
ANSWER: stdlib.h
MARKS: 2
`
      })
    });
    const dataAlias = await postResAlias.json();
    assert(postResAlias.status === 200, `Alias route POST /api/exams/:id/bulk-import returns HTTP 200 (got ${postResAlias.status})`);
    assert(dataAlias.importedCount === 1, 'Alias route imported 1 question');

    // Cleanup test exam
    await query('DELETE FROM exam_questions WHERE exam_id = $1', [testExamId]);
    await query('DELETE FROM exams WHERE id = $1', [testExamId]);

    console.log(`\n================================================================`);
    console.log(`🎉 ALL TARGETED TESTS PASSED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    server.close();
    process.exit(1);
  }
}

runTests();
