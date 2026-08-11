CREATE TABLE IF NOT EXISTS salas_infiltrado (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  anfitrion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'espera' CHECK (estado IN ('espera','pistas','votacion','finalizada','abandonada')),
  palabra TEXT,
  infiltrado TEXT,
  creada_en INTEGER NOT NULL,
  actualizada_en INTEGER NOT NULL,
  finalizada_en INTEGER
);

CREATE TABLE IF NOT EXISTS jugadores_infiltrado (
  sala_id TEXT NOT NULL,
  matricula TEXT NOT NULL,
  pista TEXT,
  voto TEXT,
  unido_en INTEGER NOT NULL,
  PRIMARY KEY (sala_id, matricula),
  FOREIGN KEY (sala_id) REFERENCES salas_infiltrado(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_infiltrado_salas_estado ON salas_infiltrado (estado, actualizada_en);
CREATE INDEX IF NOT EXISTS idx_infiltrado_jugadores_sala ON jugadores_infiltrado (sala_id, unido_en);
