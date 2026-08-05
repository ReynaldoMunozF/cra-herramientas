CREATE TABLE IF NOT EXISTS feedback_usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT,
  pagina TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_fecha
  ON feedback_usuarios (creado_en DESC);
