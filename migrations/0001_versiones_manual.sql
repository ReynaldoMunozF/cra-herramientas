CREATE TABLE IF NOT EXISTS versiones_manual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proceso TEXT NOT NULL,
  version INTEGER NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('borrador', 'publicada', 'archivada')),
  contenido_json TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  publicado_en TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_version_proceso
  ON versiones_manual (proceso, version);

CREATE INDEX IF NOT EXISTS idx_versiones_estado
  ON versiones_manual (proceso, estado, version DESC);
