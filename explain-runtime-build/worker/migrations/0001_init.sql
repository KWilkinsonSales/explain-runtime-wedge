CREATE TABLE IF NOT EXISTS invitations (
  token TEXT PRIMARY KEY,
  mission_type TEXT NOT NULL,
  mission_version TEXT NOT NULL,
  recipient_display_name TEXT,
  role_or_context TEXT,
  approved_context TEXT,
  status TEXT NOT NULL CHECK (status IN ('WAITING','RUNNING','CLOSED','EXPIRED')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  opened_at TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS mission_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(token) REFERENCES invitations(token)
);

CREATE TABLE IF NOT EXISTS receipts (
  token TEXT PRIMARY KEY,
  receipt_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(token) REFERENCES invitations(token)
);
