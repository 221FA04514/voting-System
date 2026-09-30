require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');
const voteRoutes = require('./routes/vote.routes');
const exportRoutes = require('./routes/export.routes');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database Migrations & Seeding
async function initServer() {
  try {
    await migrate();
    await seed();
  } catch (err) {
    console.error('Database migration/seed error during startup:', err);
  }
}
initServer();

// Configurable CORS Origin for Production
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory (configurable via process.env.UPLOADS_DIR)
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/export', exportRoutes);

// Serve static frontend in production if built
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistDir, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Creative Image Voting Platform (PostgreSQL) running on port ${PORT}`);
});
