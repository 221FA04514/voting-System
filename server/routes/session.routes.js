const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, getClient } = require('../config/db');
const { verifyMentorToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const storageService = require('../services/storage');

function createSlug(title, section) {
  const base = `${title} ${section || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const shortHash = Math.random().toString(36).substring(2, 6);
  return `${base || 'session'}-${shortHash}`;
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

// GET /api/sessions - List all sessions for mentor
router.get('/', verifyMentorToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        sessions.id, sessions.slug, sessions.title, sessions.description, sessions.section, sessions.status, sessions.max_votes_per_student, sessions.created_by, sessions.created_at, sessions.updated_at,
        COALESCE(e.eligible_count, 0)::int as eligible_count,
        COALESCE(img.image_count, 0)::int as image_count,
        COALESCE(v.voted_students_count, 0)::int as voted_students_count,
        COALESCE(vs.total_votes_cast, 0)::int as total_votes_cast
      FROM sessions
      LEFT JOIN (SELECT session_id, COUNT(*)::int as eligible_count FROM eligible_students GROUP BY session_id) e ON e.session_id = sessions.id
      LEFT JOIN (SELECT session_id, COUNT(*)::int as image_count FROM images GROUP BY session_id) img ON img.session_id = sessions.id
      LEFT JOIN (SELECT session_id, COUNT(*)::int as voted_students_count FROM votes GROUP BY session_id) v ON v.session_id = sessions.id
      LEFT JOIN (
        SELECT votes.session_id, COUNT(*)::int as total_votes_cast 
        FROM vote_selections 
        JOIN votes ON vote_selections.vote_id = votes.id 
        GROUP BY votes.session_id
      ) vs ON vs.session_id = sessions.id
      ORDER BY sessions.created_at DESC
    `);

    return res.json({ sessions: result.rows });
  } catch (err) {
    console.error('List sessions error:', err);
    return res.status(500).json({ error: 'Failed to retrieve sessions.' });
  }
});

// POST /api/sessions - Create new session
router.post('/', verifyMentorToken, async (req, res) => {
  const { title, description, section, eligibleStudents, maxVotesPerStudent } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Session title is required.' });
  }

  const sessionId = 'sess_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const slug = createSlug(title, section);
  const mentorId = req.mentor.id;
  const maxVotes = parseInt(maxVotesPerStudent, 10) || 5;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO sessions (id, slug, title, description, section, status, max_votes_per_student, created_by)
      VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
    `, [sessionId, slug, title.trim(), description ? description.trim() : '', section ? section.trim() : '', maxVotes, mentorId]);

    const regList = Array.from(new Set(normalizeRegNumbers(eligibleStudents)));
    for (const reg of regList) {
      await client.query(
        'INSERT INTO eligible_students (session_id, registration_number) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [sessionId, reg]
      );
    }

    await client.query('COMMIT');

    const createdRes = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    return res.status(201).json({
      message: 'Session created successfully',
      session: createdRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create session error:', err);
    return res.status(500).json({ error: 'Failed to create voting session.' });
  } finally {
    client.release();
  }
});

// GET /api/sessions/:id - Get session detail for Mentor
router.get('/:id', verifyMentorToken, async (req, res) => {
  try {
    const sessionRes = await query(`
      SELECT 
        sessions.id, sessions.slug, sessions.title, sessions.description, sessions.section, sessions.status, sessions.max_votes_per_student, sessions.created_by, sessions.created_at, sessions.updated_at,
        COALESCE(e.eligible_count, 0)::int as eligible_count,
        COALESCE(img.image_count, 0)::int as image_count,
        COALESCE(v.voted_students_count, 0)::int as voted_students_count,
        COALESCE(vs.total_votes_cast, 0)::int as total_votes_cast
      FROM sessions
      LEFT JOIN (SELECT session_id, COUNT(*)::int as eligible_count FROM eligible_students GROUP BY session_id) e ON e.session_id = sessions.id
      LEFT JOIN (SELECT session_id, COUNT(*)::int as image_count FROM images GROUP BY session_id) img ON img.session_id = sessions.id
      LEFT JOIN (SELECT session_id, COUNT(*)::int as voted_students_count FROM votes GROUP BY session_id) v ON v.session_id = sessions.id
      LEFT JOIN (
        SELECT votes.session_id, COUNT(*)::int as total_votes_cast 
        FROM vote_selections 
        JOIN votes ON vote_selections.vote_id = votes.id 
        GROUP BY votes.session_id
      ) vs ON vs.session_id = sessions.id
      WHERE sessions.id = $1 OR sessions.slug = $1
    `, [req.params.id]);

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionRes.rows[0];

    // Get images with dynamic vote count from vote_selections
    const imagesRes = await query(`
      SELECT 
        images.id,
        images.session_id,
        images.registration_number,
        images.image_url,
        images.original_filename,
        images.title,
        images.cloudinary_public_id,
        images.created_at,
        COUNT(vote_selections.id)::int AS vote_count
      FROM images
      LEFT JOIN vote_selections ON images.id = vote_selections.image_id
      WHERE images.session_id = $1
      GROUP BY images.id, images.session_id, images.registration_number, images.image_url, images.original_filename, images.title, images.cloudinary_public_id, images.created_at
      ORDER BY vote_count DESC, images.created_at ASC
    `, [session.id]);

    // Get eligible registration numbers
    const eligibleRes = await query(`
      SELECT registration_number FROM eligible_students WHERE session_id = $1 ORDER BY registration_number ASC
    `, [session.id]);

    // Get voted students
    const votedRes = await query(`
      SELECT registration_number, submitted_at FROM votes WHERE session_id = $1 ORDER BY submitted_at DESC
    `, [session.id]);

    return res.json({
      session,
      images: imagesRes.rows,
      eligibleStudents: eligibleRes.rows.map(r => r.registration_number),
      votedStudents: votedRes.rows
    });
  } catch (err) {
    console.error('Get session detail error:', err);
    return res.status(500).json({ error: 'Failed to retrieve session detail.' });
  }
});

// PUT /api/sessions/:id - Update session details or status
router.put('/:id', verifyMentorToken, async (req, res) => {
  try {
    const checkRes = await query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = checkRes.rows[0];
    const { title, description, section, status, maxVotesPerStudent, eligibleStudents } = req.body;

    const newTitle = title !== undefined ? title.trim() : session.title;
    const newDesc = description !== undefined ? description.trim() : session.description;
    const newSec = section !== undefined ? section.trim() : session.section;
    const newStatus = status !== undefined ? status : session.status;
    const newMaxVotes = maxVotesPerStudent !== undefined ? parseInt(maxVotesPerStudent, 10) : session.max_votes_per_student;

    await query(`
      UPDATE sessions 
      SET title = $1, description = $2, section = $3, status = $4, max_votes_per_student = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [newTitle, newDesc, newSec, newStatus, newMaxVotes, session.id]);

    if (eligibleStudents !== undefined) {
      const regList = Array.from(new Set(normalizeRegNumbers(eligibleStudents)));
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM eligible_students WHERE session_id = $1', [session.id]);
        for (const reg of regList) {
          await client.query('INSERT INTO eligible_students (session_id, registration_number) VALUES ($1, $2)', [session.id, reg]);
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    const updatedRes = await query('SELECT * FROM sessions WHERE id = $1', [session.id]);
    return res.json({ message: 'Session updated successfully', session: updatedRes.rows[0] });
  } catch (err) {
    console.error('Update session error:', err);
    return res.status(500).json({ error: 'Failed to update session.' });
  }
});

// POST /api/sessions/:id/students - Add or replace eligible students
router.post('/:id/students', verifyMentorToken, async (req, res) => {
  try {
    const checkRes = await query('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const { registrationNumbers, mode } = req.body;
    const newRegs = Array.from(new Set(normalizeRegNumbers(registrationNumbers)));

    const client = await getClient();
    try {
      await client.query('BEGIN');
      if (mode === 'replace') {
        await client.query('DELETE FROM eligible_students WHERE session_id = $1', [req.params.id]);
      }
      for (const reg of newRegs) {
        await client.query('INSERT INTO eligible_students (session_id, registration_number) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, reg]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const totalRes = await query('SELECT COUNT(*)::int as count FROM eligible_students WHERE session_id = $1', [req.params.id]);
    return res.json({ message: 'Eligible student list updated successfully.', totalEligible: totalRes.rows[0].count });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update student list.' });
  }
});

// POST /api/sessions/:id/images - Upload images for session via StorageService
router.post('/:id/images', verifyMentorToken, upload.array('images', 50), async (req, res) => {
  try {
    const checkRes = await query('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded.' });
    }

    let regNumbers = req.body.registrationNumbers;
    if (typeof regNumbers === 'string') {
      try { regNumbers = JSON.parse(regNumbers); } catch { regNumbers = [regNumbers]; }
    }

    const insertedImages = [];
    const client = await getClient();

    try {
      await client.query('BEGIN');

      for (let idx = 0; idx < req.files.length; idx++) {
        const file = req.files[idx];
        const uploaded = await storageService.uploadImage(file);
        const imageId = 'img_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
        const regNo = (regNumbers && regNumbers[idx]) ? String(regNumbers[idx]).trim().toUpperCase() : `STUDENT_${idx + 1}`;

        await client.query(`
          INSERT INTO images (id, session_id, registration_number, image_url, original_filename, title, cloudinary_public_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [imageId, req.params.id, regNo, uploaded.imageUrl, file.originalname, `Artwork by ${regNo}`, uploaded.publicId]);

        insertedImages.push({
          id: imageId,
          session_id: req.params.id,
          registration_number: regNo,
          image_url: uploaded.imageUrl,
          original_filename: file.originalname,
          vote_count: 0
        });
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.json({
      message: `${insertedImages.length} images uploaded successfully`,
      images: insertedImages
    });
  } catch (err) {
    console.error('Upload images error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload images.' });
  }
});

// DELETE /api/sessions/:id/images/:imageId - Delete image from DB and StorageService
router.delete('/:id/images/:imageId', verifyMentorToken, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const imgRes = await query('SELECT * FROM images WHERE id = $1 AND session_id = $2', [imageId, id]);
    if (imgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    const image = imgRes.rows[0];
    await query('DELETE FROM images WHERE id = $1', [imageId]);
    await storageService.deleteImage(image.image_url, image.cloudinary_public_id);

    return res.json({ message: 'Image deleted successfully.' });
  } catch (err) {
    console.error('Delete image error:', err);
    return res.status(500).json({ error: 'Failed to delete image.' });
  }
});

// POST /api/sessions/:id/duplicate - Duplicate session
router.post('/:id/duplicate', verifyMentorToken, async (req, res) => {
  const client = await getClient();
  try {
    const origRes = await client.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    if (origRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Original session not found.' });
    }

    const original = origRes.rows[0];
    const newSessionId = 'sess_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const newTitle = `${original.title} (Copy)`;
    const newSlug = createSlug(newTitle, original.section);

    await client.query('BEGIN');

    // 1. Insert duplicated session
    await client.query(`
      INSERT INTO sessions (id, slug, title, description, section, status, max_votes_per_student, created_by)
      VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
    `, [newSessionId, newSlug, newTitle, original.description, original.section, original.max_votes_per_student, req.mentor.id]);

    // 2. Copy eligible students
    const studentsRes = await client.query('SELECT registration_number FROM eligible_students WHERE session_id = $1', [original.id]);
    for (const s of studentsRes.rows) {
      await client.query('INSERT INTO eligible_students (session_id, registration_number) VALUES ($1, $2)', [newSessionId, s.registration_number]);
    }

    // 3. Copy images (referencing image_url & publicId)
    const imagesRes = await client.query('SELECT * FROM images WHERE session_id = $1', [original.id]);
    for (const img of imagesRes.rows) {
      const newImgId = 'img_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      await client.query(`
        INSERT INTO images (id, session_id, registration_number, image_url, original_filename, title, cloudinary_public_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [newImgId, newSessionId, img.registration_number, img.image_url, img.original_filename, img.title, img.cloudinary_public_id]);
    }

    await client.query('COMMIT');

    const clonedRes = await query('SELECT * FROM sessions WHERE id = $1', [newSessionId]);
    return res.status(201).json({ message: 'Session duplicated successfully', session: clonedRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Duplicate session error:', err);
    return res.status(500).json({ error: 'Failed to duplicate session.' });
  } finally {
    client.release();
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', verifyMentorToken, async (req, res) => {
  try {
    const checkRes = await query('SELECT id FROM sessions WHERE id = $1', [req.params.id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    await query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Session deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete session.' });
  }
});

module.exports = router;
