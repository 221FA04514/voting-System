-- Migration 002: Exam Arena Schema
-- Complete online examination module with bulk question import, timer, fullscreen/tab-switch tracking, and analytics

-- 1. Exams table
CREATE TABLE IF NOT EXISTS exams (
  id VARCHAR(64) PRIMARY KEY,
  public_id VARCHAR(128) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  subject VARCHAR(255),
  duration_minutes INT DEFAULT 30,
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'closed'
  total_marks NUMERIC(10, 2) DEFAULT 0,
  passing_marks NUMERIC(10, 2) DEFAULT 0,
  negative_marking_enabled BOOLEAN DEFAULT FALSE,
  negative_mark_value NUMERIC(10, 2) DEFAULT 0,
  question_navigation_enabled BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  show_score_after_submission BOOLEAN DEFAULT TRUE,
  reveal_answers_after_submission BOOLEAN DEFAULT FALSE,
  fullscreen_required BOOLEAN DEFAULT TRUE,
  focus_monitoring_enabled BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Exam Eligible Students table (Optional roster; if empty, any valid 261FA0XXXX student can attempt)
CREATE TABLE IF NOT EXISTS exam_eligible_students (
  id SERIAL PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  registration_number VARCHAR(128) NOT NULL,
  student_name VARCHAR(255),
  section VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_exam_eligible_student UNIQUE (exam_id, registration_number)
);

-- 3. Exam Questions table
CREATE TABLE IF NOT EXISTS exam_questions (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_order INT NOT NULL DEFAULT 1,
  question_type VARCHAR(32) NOT NULL DEFAULT 'mcq', -- 'mcq' or 'fill_blank'
  question_text TEXT NOT NULL,
  options_json TEXT, -- JSON array of strings e.g. ["start()", "main()", ...]
  correct_answer TEXT NOT NULL, -- e.g. "B" or "printf"
  accepted_answers_json TEXT, -- JSON array of strings for fill_blank matching
  marks NUMERIC(10, 2) NOT NULL DEFAULT 1,
  negative_marks NUMERIC(10, 2) NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Exam Attempts table
-- Enforces STRICT Database Invariant: ONE ATTEMPT PER REGISTRATION NUMBER PER EXAM!
CREATE TABLE IF NOT EXISTS exam_attempts (
  id VARCHAR(64) PRIMARY KEY,
  exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  registration_number VARCHAR(128) NOT NULL,
  student_name VARCHAR(255),
  section VARCHAR(64),
  attempt_status VARCHAR(32) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'auto_submitted', 'expired'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INT DEFAULT 0,
  score NUMERIC(10, 2) DEFAULT 0,
  maximum_marks NUMERIC(10, 2) DEFAULT 0,
  percentage NUMERIC(5, 2) DEFAULT 0,
  correct_count INT DEFAULT 0,
  incorrect_count INT DEFAULT 0,
  unanswered_count INT DEFAULT 0,
  focus_loss_count INT DEFAULT 0,
  fullscreen_exit_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_exam_student_attempt UNIQUE (exam_id, registration_number)
);

-- 5. Exam Responses table
CREATE TABLE IF NOT EXISTS exam_responses (
  id SERIAL PRIMARY KEY,
  attempt_id VARCHAR(64) NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  selected_option_id TEXT,
  text_response TEXT,
  is_correct BOOLEAN,
  evaluation_status VARCHAR(32),
  marks_awarded NUMERIC(10, 2) DEFAULT 0,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_attempt_question_response UNIQUE (attempt_id, question_id)
);

-- 6. Exam Security Events table (focus-loss, fullscreen-exit, etc.)
CREATE TABLE IF NOT EXISTS exam_security_events (
  id SERIAL PRIMARY KEY,
  attempt_id VARCHAR(64) NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  event_metadata TEXT
);
