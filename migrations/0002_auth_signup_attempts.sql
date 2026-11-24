PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS auth_signup_attempts (
  identifier TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until TEXT
);
