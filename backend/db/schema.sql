-- Dispo Chat — Database Schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  unique_code   CHAR(6) NOT NULL UNIQUE,   -- ex: X7KM2Q
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  invite_code  CHAR(8) NOT NULL UNIQUE,    -- ex: DISP4XK7
  created_by   INT NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id   INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('dispatcher', 'driver')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS trips (
  id            SERIAL PRIMARY KEY,
  ref           TEXT NOT NULL UNIQUE,       -- ex: TRP-2024-001
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
  status_key  TEXT,                         -- null pentru mesaje text
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reads (
  message_id  INT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Direct message conversations
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

-- Indexes pentru performanta
CREATE INDEX IF NOT EXISTS idx_messages_trip_id   ON messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_group_id     ON trips(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv   ON dm_messages(conv_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_u  ON dm_participants(user_id);
