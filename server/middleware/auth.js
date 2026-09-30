const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'creative_voting_secret_key_2026';

function verifyMentorToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.mentor = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = {
  verifyMentorToken,
  JWT_SECRET
};
