CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder TEXT NOT NULL CHECK (folder IN ('inbox','sent')),
  message_id TEXT,
  in_reply_to TEXT,
  from_addr TEXT, from_name TEXT, to_addr TEXT,
  subject TEXT, body TEXT,
  date INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  attachments INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_folder_date ON messages(folder, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mid ON messages(folder, message_id) WHERE message_id IS NOT NULL;
