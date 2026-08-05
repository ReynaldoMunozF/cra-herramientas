CREATE TABLE IF NOT EXISTS partidas_palabra_clave (
  id TEXT PRIMARY KEY,
  palabra TEXT NOT NULL,
  matricula TEXT,
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 6),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'ganada', 'agotada')),
  iniciada_en INTEGER NOT NULL,
  finalizada_en INTEGER,
  duracion_segundos INTEGER
);

CREATE INDEX IF NOT EXISTS idx_palabra_clave_ranking
ON partidas_palabra_clave (estado, duracion_segundos, intentos);
