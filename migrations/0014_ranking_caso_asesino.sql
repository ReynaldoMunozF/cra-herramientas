CREATE TABLE IF NOT EXISTS partidas_caso_asesino (
  id TEXT PRIMARY KEY,
  matricula TEXT,
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'ganada')),
  iniciada_en INTEGER NOT NULL,
  finalizada_en INTEGER,
  duracion_segundos INTEGER
);

CREATE INDEX IF NOT EXISTS idx_caso_asesino_ranking
ON partidas_caso_asesino (estado, duracion_segundos, intentos);
