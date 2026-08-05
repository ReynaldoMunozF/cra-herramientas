CREATE TABLE IF NOT EXISTS comentarios_frecuentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  texto TEXT NOT NULL COLLATE NOCASE UNIQUE,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comentarios_frecuentes_fecha
  ON comentarios_frecuentes (creado_en DESC);
