-- Run this once to add direct messaging support
-- psql -U postgres -d dispo_chat -f backend/db/migrate_dm.sql

CREATE TABLE IF NOT EXISTS dm_conversations (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  conv_id  INT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conv_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id         SERIAL PRIMARY KEY,
  conv_id    INT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id  INT NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conv  ON dm_messages(conv_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_u ON dm_participants(user_id);
