CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  time_limit INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER REFERENCES tests(id),
  participant_name VARCHAR(500) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  answer_id INTEGER REFERENCES answers(id),
  UNIQUE(session_id, question_id)
);
