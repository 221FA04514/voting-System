const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyMentorToken } = require('../middleware/auth');

// GET /api/export/session/:id/csv
router.get('/session/:id/csv', verifyMentorToken, async (req, res) => {
  try {
    const sessionRes = await query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const session = sessionRes.rows[0];

    const imagesRes = await query(`
      SELECT 
        i.id,
        i.session_id,
        i.registration_number,
        i.image_url,
        i.original_filename,
        i.title,
        COUNT(vs.id)::int AS vote_count
      FROM images i
      LEFT JOIN vote_selections vs ON i.id = vs.image_id
      WHERE i.session_id = $1
      GROUP BY i.id
      ORDER BY vote_count DESC, i.created_at ASC
    `, [session.id]);

    const images = imagesRes.rows;

    const eligibleCountRes = await query('SELECT COUNT(*)::int as c FROM eligible_students WHERE session_id = $1', [session.id]);
    const votedCountRes = await query('SELECT COUNT(*)::int as c FROM votes WHERE session_id = $1', [session.id]);
    const totalVotesRes = await query(`
      SELECT COUNT(*)::int as s 
      FROM vote_selections vs 
      JOIN votes v ON vs.vote_id = v.id 
      WHERE v.session_id = $1
    `, [session.id]);

    const eligibleCount = eligibleCountRes.rows[0].c;
    const votedCount = votedCountRes.rows[0].c;
    const totalVotesCast = totalVotesRes.rows[0].s;

    let csvRows = [];
    csvRows.push(`"Session Title","${session.title.replace(/"/g, '""')}"`);
    csvRows.push(`"Section","${(session.section || '').replace(/"/g, '""')}"`);
    csvRows.push(`"Status","${session.status}"`);
    csvRows.push(`"Date Exported","${new Date().toISOString()}"`);
    csvRows.push(`"Eligible Students","${eligibleCount}"`);
    csvRows.push(`"Students Voted","${votedCount}"`);
    csvRows.push(`"Total Votes Cast","${totalVotesCast}"`);
    csvRows.push(''); // Separator
    csvRows.push('"Rank","Registration Number","Image ID","Original Filename","Vote Count","Vote Share (%)"');

    images.forEach((img, idx) => {
      const rank = idx + 1;
      const share = totalVotesCast > 0 ? ((img.vote_count / totalVotesCast) * 100).toFixed(1) : '0.0';
      csvRows.push(`"${rank}","${img.registration_number}","${img.id}","${(img.original_filename || '').replace(/"/g, '""')}","${img.vote_count}","${share}%"`);
    });

    const csvContent = csvRows.join('\r\n');
    const filename = `Voting_Results_${session.title.replace(/[^a-z0-9]/gi, '_')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export results CSV.' });
  }
});

module.exports = router;
