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
CREATE TABLE IF NOT EXISTS incercari (ip TEXT NOT NULL, t INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_inc ON incercari(ip, t);
-- Statistici anonime ale site-ului (fara cookie-uri, fara adresa IP): un rand per pagina vizualizata. v = cod zilnic ireversibil (hash), nu identifica o persoana.
CREATE TABLE IF NOT EXISTS vizite (
  pid TEXT PRIMARY KEY,
  zi TEXT NOT NULL,
  t INTEGER NOT NULL,
  v TEXT NOT NULL,
  cale TEXT NOT NULL,
  sec INTEGER NOT NULL DEFAULT 0,
  ref TEXT NOT NULL DEFAULT '',
  dev TEXT NOT NULL DEFAULT 'd'
);
CREATE INDEX IF NOT EXISTS idx_vizite_zi ON vizite(zi, v, t);
-- clickuri catre magazine (butonul „Vezi oferta”): doar magazinul si pagina, fara date personale
CREATE TABLE IF NOT EXISTS clickuri (id INTEGER PRIMARY KEY AUTOINCREMENT, zi TEXT NOT NULL, t INTEGER NOT NULL, v TEXT NOT NULL, cale TEXT NOT NULL, mag TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_clickuri_zi ON clickuri(zi, mag);
