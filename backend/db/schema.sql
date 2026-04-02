-- Dispo Chat — Database Schema (complete)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  unique_code   CHAR(6) NOT NULL UNIQUE,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'away', 'busy', 'dnd', 'offline')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  description        TEXT,
  invite_code        CHAR(8) NOT NULL UNIQUE,
  created_by         INT NOT NULL REFERENCES users(id),
  pinned_message_id  INT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'driver')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id          SERIAL PRIMARY KEY,
  group_id    INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id   INT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'status')),
  content     TEXT NOT NULL,
  reply_to_id INT REFERENCES group_messages(id) ON DELETE SET NULL,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK after group_messages exists
ALTER TABLE groups
  ADD CONSTRAINT fk_pinned_message
  FOREIGN KEY (pinned_message_id) REFERENCES group_messages(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS group_read_cursors (
  group_id    INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS trips (
  id            SERIAL PRIMARY KEY,
  ref           TEXT NOT NULL UNIQUE,
  group_id      INT NOT NULL REFERENCES groups(id),
  vehicle_plate TEXT NOT NULL,
  origin        TEXT NOT NULL,
  destination   TEXT NOT NULL,
  date          DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by    INT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  trip_id     INT NOT NULL REFERENCES trips(id),
  sender_id   INT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'status')),
  content     TEXT NOT NULL,
  status_key  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reads (
  message_id  INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS dm_read_cursors (
  conv_id     INT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conv_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_messages_group      ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender     ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply      ON group_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_user        ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_trip_id          ON messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_group_id            ON trips(group_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv          ON dm_messages(conv_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_created_at    ON dm_messages(conv_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_participants_user      ON dm_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username            ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_unique_code         ON users(unique_code);
CREATE INDEX IF NOT EXISTS idx_group_read_cursors        ON group_read_cursors(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dm_read_cursors           ON dm_read_cursors(conv_id, user_id);
