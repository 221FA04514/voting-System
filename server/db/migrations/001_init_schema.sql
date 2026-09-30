-- Migration 001: Initial Schema for PostgreSQL / Aiven with Cloudinary Support

-- 1. Users / Mentors table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'mentor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  section VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  max_votes_per_student INT DEFAULT 5,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Eligible Students table
CREATE TABLE IF NOT EXISTS eligible_students (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  registration_number VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_session_eligible_student UNIQUE (session_id, registration_number)
);

-- 4. Images table
CREATE TABLE IF NOT EXISTS images (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  registration_number VARCHAR(128) NOT NULL,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  title TEXT,
  cloudinary_public_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Votes table (Enforces ONE vote submission per registration_number per session)
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  registration_number VARCHAR(128) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_session_student_vote UNIQUE (session_id, registration_number)
);

-- 6. Vote Selections table (Records individual image choices per vote)
CREATE TABLE IF NOT EXISTS vote_selections (
  id SERIAL PRIMARY KEY,
  vote_id INT NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  image_id VARCHAR(64) NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_vote_image_selection UNIQUE (vote_id, image_id)
);
