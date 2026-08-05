-- Partidas del juego Código secreto.
-- El servidor conserva el código y calcula el tiempo para que el ranking no
-- dependa del reloj ni de los datos enviados por el navegador.
CREATE TABLE IF NOT EXISTS partidas_codigo_secreto (
  id TEXT PRIMARY KEY,
  secreto TEXT NOT NULL,
  matricula TEXT,
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 8),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'ganada', 'agotada')),
  iniciada_en INTEGER NOT NULL,
  finalizada_en INTEGER,
  duracion_segundos INTEGER
);

CREATE INDEX IF NOT EXISTS idx_codigo_secreto_ranking
  ON partidas_codigo_secreto (estado, duracion_segundos, intentos);
