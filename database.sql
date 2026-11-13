CREATE TABLE IF NOT EXISTS civic_complaints (
  id text PRIMARY KEY,
  record jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS civic_photos (
  id text PRIMARY KEY,
  filename text NOT NULL UNIQUE,
  record jsonb NOT NULL,
  content_type text NOT NULL,
  file_content bytea NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_complaints_saved_at_idx
  ON civic_complaints (saved_at DESC);

CREATE INDEX IF NOT EXISTS civic_photos_saved_at_idx
  ON civic_photos (saved_at DESC);
