const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');

// Helper to look up session by ID or Slug
async function getSessionByIdOrSlug(idOrSlug) {
  const res = await query('SELECT * FROM sessions WHERE id = $1 OR slug = $1', [idOrSlug]);
  return res.rows.length > 0 ? res.rows[0] : null;
}

// GET /api/vote/:sessionIdOrSlug - Public endpoint for Student view
// STRICT PRIVACY ENFORCEMENT: Never return registration_number or vote counts to students!
router.get('/:sessionIdOrSlug', async (req, res) => {
  try {
    const session = await getSessionByIdOrSlug(req.params.sessionIdOrSlug);

    if (!session) {
      return res.status(404).json({ error: 'Voting session not found.' });
    }

    if (session.status === 'draft') {
      return res.status(403).json({
        error: 'Voting session is not yet open.',
        status: 'draft',
        session: {
          id: session.id,
          title: session.title,
          section: session.section,
          status: 'draft'
        }
      });
    }

    // Fetch images for this session WITHOUT registration_number and WITHOUT vote_count!
    const rawImagesRes = await query(`
      SELECT id, image_url, title FROM images WHERE session_id = $1 ORDER BY id ASC
    `, [session.id]);

    const privacyImages = rawImagesRes.rows.map((img, idx) => ({
      id: img.id,
      imageUrl: img.image_url,
      title: `Entry #${idx + 1}`
    }));

    return res.json({
      session: {
        id: session.id,
        slug: session.slug,
        title: session.title,
        description: session.description,
        section: session.section,
        status: session.status,
        maxVotesPerStudent: session.max_votes_per_student || 5,
        totalImages: privacyImages.length
      },
      images: privacyImages
    });
  } catch (err) {
    console.error('Get public vote session error:', err);
    return res.status(500).json({ error: 'Failed to load voting session.' });
  }
});

// POST /api/vote/:sessionIdOrSlug/verify - Check student eligibility and vote status
router.post('/:sessionIdOrSlug/verify', async (req, res) => {
  try {
    const session = await getSessionByIdOrSlug(req.params.sessionIdOrSlug);

    if (!session) {
      return res.status(404).json({ error: 'Voting session not found.' });
    }

    if (session.status !== 'open') {
      return res.status(400).json({
        eligible: false,
        alreadyVoted: false,
        status: session.status,
        message: session.status === 'closed' 
          ? 'Voting for this session has ended.' 
          : 'Voting for this session is not yet open.'
      });
    }

    const { registrationNumber } = req.body;
    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({ error: 'Registration number is required.' });
    }

    const normalizedReg = registrationNumber.trim().toUpperCase();

    // 1. Check eligibility
    const eligibleRes = await query(
      'SELECT 1 FROM eligible_students WHERE session_id = $1 AND registration_number = $2',
      [session.id, normalizedReg]
    );

    if (eligibleRes.rows.length === 0) {
      return res.status(403).json({
        eligible: false,
        alreadyVoted: false,
        message: 'Your registration number is not eligible for this voting session.'
      });
    }

    // 2. Check if already voted
    const alreadyVotedRes = await query(
      'SELECT 1 FROM votes WHERE session_id = $1 AND registration_number = $2',
      [session.id, normalizedReg]
    );

    if (alreadyVotedRes.rows.length > 0) {
      return res.status(200).json({
        eligible: true,
        alreadyVoted: true,
        message: 'Voting already completed for this session.'
      });
    }

    return res.json({
      eligible: true,
      alreadyVoted: false,
      message: 'Eligible to vote.'
    });
  } catch (err) {
    console.error('Verify student error:', err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

// POST /api/vote/:sessionIdOrSlug/submit - ATOMIC POSTGRESQL TRANSACTION VOTE SUBMISSION
router.post('/:sessionIdOrSlug/submit', async (req, res) => {
  try {
    const session = await getSessionByIdOrSlug(req.params.sessionIdOrSlug);

    if (!session) {
      return res.status(404).json({ error: 'Voting session not found.' });
    }

    if (session.status !== 'open') {
      return res.status(400).json({
        error: session.status === 'closed' ? 'Voting for this session has ended.' : 'Voting for this session is not open.'
      });
    }

    const { registrationNumber, selectedImageIds } = req.body;

    if (!registrationNumber || !registrationNumber.trim()) {
      return res.status(400).json({ error: 'Registration number is required.' });
    }

    if (!Array.isArray(selectedImageIds) || selectedImageIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least 1 image to vote.' });
    }

    const maxAllowed = session.max_votes_per_student || 5;
    if (selectedImageIds.length > maxAllowed) {
      return res.status(400).json({ error: `You can select a maximum of ${maxAllowed} images.` });
    }

    const uniqueSelected = new Set(selectedImageIds);
    if (uniqueSelected.size !== selectedImageIds.length) {
      return res.status(400).json({ error: 'You cannot vote for the same image more than once.' });
    }

    const regNoNormalized = registrationNumber.trim().toUpperCase();

    // ATOMIC POSTGRESQL TRANSACTION
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Step A: Lock & Re-verify session is OPEN
      const currSessionRes = await client.query('SELECT status FROM sessions WHERE id = $1', [session.id]);
      if (currSessionRes.rows.length === 0 || currSessionRes.rows[0].status !== 'open') {
        throw new Error('SESSION_NOT_OPEN');
      }

      // Step B: Re-verify student eligibility
      const isEligibleRes = await client.query(
        'SELECT 1 FROM eligible_students WHERE session_id = $1 AND registration_number = $2',
        [session.id, regNoNormalized]
      );
      if (isEligibleRes.rows.length === 0) {
        throw new Error('NOT_ELIGIBLE');
      }

      // Step C: Check if student has already voted
      const existingVoteRes = await client.query(
        'SELECT 1 FROM votes WHERE session_id = $1 AND registration_number = $2',
        [session.id, regNoNormalized]
      );
      if (existingVoteRes.rows.length > 0) {
        throw new Error('ALREADY_VOTED');
      }

      // Step D: Verify all selected image IDs belong to this session using IN ($2, $3, $4, ...)
      const placeholders = selectedImageIds.map((_, idx) => `$${idx + 2}`).join(',');
      const validImagesRes = await client.query(
        `SELECT id FROM images WHERE session_id = $1 AND id IN (${placeholders})`,
        [session.id, ...selectedImageIds]
      );

      if (validImagesRes.rows.length !== selectedImageIds.length) {
        throw new Error('INVALID_IMAGES');
      }

      // Step E: Insert vote record into `votes` table
      // (UNIQUE constraint on session_id + registration_number prevents duplicate votes at DB level)
      const voteInsertRes = await client.query(
        'INSERT INTO votes (session_id, registration_number, submitted_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id',
        [session.id, regNoNormalized]
      );
      const voteId = voteInsertRes.rows[0].id;

      // Step F: Insert individual image choices into `vote_selections` table
      for (const imgId of selectedImageIds) {
        await client.query(
          'INSERT INTO vote_selections (vote_id, image_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [voteId, imgId]
        );
      }

      // COMMIT TRANSACTION
      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Your votes have been submitted successfully! Thank you for participating.',
        sessionTitle: session.title,
        votesSubmitted: selectedImageIds.length
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

  } catch (err) {
    if (err.message === 'NOT_ELIGIBLE') {
      return res.status(403).json({ error: 'Your registration number is not eligible for this voting session.' });
    }
    if (err.message === 'ALREADY_VOTED' || (err.code && err.code === '23505')) {
      return res.status(409).json({ error: 'Voting already completed for this session.' });
    }
    if (err.message === 'SESSION_NOT_OPEN') {
      return res.status(400).json({ error: 'Voting for this session is currently closed or not yet open.' });
    }
    if (err.message === 'INVALID_IMAGES') {
      return res.status(400).json({ error: 'Selected images are invalid or do not belong to this session.' });
    }

    console.error('Vote submission transaction error:', err);
    return res.status(500).json({ error: 'Your votes were not submitted. Please try again.' });
  }
});

module.exports = router;
