-- Run this once to add group conversation messages
-- psql -U postgres -d dispo_chat -f backend/db/migrate_group_messages.sql

CREATE TABLE IF NOT EXISTS group_messages (
  id         SERIAL PRIMARY KEY,
  group_id   INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id  INT NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'status')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
