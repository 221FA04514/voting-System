const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

async function seed() {
  console.log('🌱 Seeding demo voting session for PostgreSQL...');

  const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Sample artwork SVGs
  const sampleArtworks = [
    { file: 'demo-art-1.svg', title: 'Abstract Harmony Poster', regNo: '23A001', bg1: '#4f46e5', bg2: '#7c3aed', accent: '#fbbf24', text: 'CREATIVE THINKING #1' },
    { file: 'demo-art-2.svg', title: 'Future Tech Design', regNo: '23A002', bg1: '#059669', bg2: '#10b981', accent: '#60a5fa', text: 'CREATIVE THINKING #2' },
    { file: 'demo-art-3.svg', title: 'Geometric Sunrise', regNo: '23A003', bg1: '#d97706', bg2: '#f59e0b', accent: '#ec4899', text: 'CREATIVE THINKING #3' },
    { file: 'demo-art-4.svg', title: 'Ocean Wave Concept', regNo: '23A004', bg1: '#0284c7', bg2: '#38bdf8', accent: '#a855f7', text: 'CREATIVE THINKING #4' },
    { file: 'demo-art-5.svg', title: 'Minimalist Prism', regNo: '23A005', bg1: '#e11d48', bg2: '#f43f5e', accent: '#facc15', text: 'CREATIVE THINKING #5' }
  ];

  sampleArtworks.forEach(art => {
    const filePath = path.join(uploadsDir, art.file);
    if (!fs.existsSync(filePath)) {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="grad_${art.regNo}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${art.bg1}" />
            <stop offset="100%" stop-color="${art.bg2}" />
          </linearGradient>
        </defs>
        <rect width="600" height="600" fill="url(#grad_${art.regNo})" rx="24"/>
        <circle cx="300" cy="240" r="130" fill="${art.accent}" opacity="0.3"/>
        <rect x="180" y="150" width="240" height="180" fill="#ffffff" opacity="0.15" rx="16" transform="rotate(-10 300 240)"/>
        <circle cx="300" cy="240" r="70" fill="${art.accent}"/>
        <text x="300" y="460" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="28" fill="#ffffff" text-anchor="middle" letter-spacing="2">${art.text}</text>
        <text x="300" y="500" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="18" fill="#ffffff" opacity="0.8" text-anchor="middle">${art.title}</text>
      </svg>`;
      fs.writeFileSync(filePath, svgContent, 'utf-8');
    }
  });

  // Check if demo session already exists
  const existing = await query("SELECT id FROM sessions WHERE slug = 'creative-thinking-section-a'");
  if (existing.rows.length > 0) {
    console.log('✅ Demo session already exists in PostgreSQL.');
    return;
  }

  const mentorRes = await query('SELECT id FROM users LIMIT 1');
  if (mentorRes.rows.length === 0) return;
  const mentorId = mentorRes.rows[0].id;

  const sessionId = 'sess_demo_sec_a_2026';
  const slug = 'creative-thinking-section-a';

  await query(`
    INSERT INTO sessions (id, slug, title, description, section, status, max_votes_per_student, created_by)
    VALUES ($1, $2, 'Creative Thinking — Section A — September 2026', 'Vote for your top 5 favorite creative artwork entries submitted by Section A students!', 'Section A', 'open', 5, $3)
  `, [sessionId, slug, mentorId]);

  // Insert eligible registration numbers
  const eligible = ['23A001', '23A002', '23A003', '23A004', '23A005', '23A006', '23A007', '23A008', '23A009', '23A010'];
  for (const reg of eligible) {
    await query(
      'INSERT INTO eligible_students (session_id, registration_number) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [sessionId, reg]
    );
  }

  // Insert Images
  for (let idx = 0; idx < sampleArtworks.length; idx++) {
    const art = sampleArtworks[idx];
    await query(
      `INSERT INTO images (id, session_id, registration_number, image_url, original_filename, title)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [`img_demo_${idx + 1}`, sessionId, art.regNo, `/uploads/${art.file}`, art.file, art.title]
    );
  }

  console.log('🎉 Demo session seeded successfully! Link: /vote/creative-thinking-section-a');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed };
