const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { verifyMentorToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const mentor = result.rows[0];
    const isMatch = bcrypt.compareSync(password, mentor.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: mentor.id, email: mentor.email, name: mentor.name, role: mentor.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      mentor: {
        id: mentor.id,
        email: mentor.email,
        name: mentor.name,
        role: mentor.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyMentorToken, async (req, res) => {
  try {
    const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.mentor.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor user not found.' });
    }
    return res.json({ mentor: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch mentor profile.' });
  }
});

// PUT /api/auth/update-profile
router.put('/update-profile', verifyMentorToken, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    const result = await query('SELECT * FROM users WHERE id = $1', [req.mentor.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor user not found.' });
    }

    const mentor = result.rows[0];
    let updatedName = name ? name.trim() : mentor.name;
    let updatedHash = mentor.password_hash;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      const isMatch = bcrypt.compareSync(currentPassword, mentor.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      updatedHash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    }

    await query('UPDATE users SET name = $1, password_hash = $2 WHERE id = $3', [updatedName, updatedHash, mentor.id]);

    return res.json({
      message: 'Profile updated successfully',
      mentor: { id: mentor.id, email: mentor.email, name: updatedName, role: mentor.role }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
