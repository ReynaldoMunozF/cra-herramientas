CREATE TABLE IF NOT EXISTS salas_hundir_flota (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  jugador1 TEXT NOT NULL,
  jugador2 TEXT,
  flota1 TEXT,
  flota2 TEXT,
  disparos1 TEXT NOT NULL DEFAULT '[]',
  disparos2 TEXT NOT NULL DEFAULT '[]',
  listo1 INTEGER NOT NULL DEFAULT 0,
  listo2 INTEGER NOT NULL DEFAULT 0,
  turno TEXT,
  ganador TEXT,
  estado TEXT NOT NULL DEFAULT 'espera' CHECK (estado IN ('espera','preparacion','en_curso','finalizada','abandonada')),
  creada_en INTEGER NOT NULL,
  actualizada_en INTEGER NOT NULL,
  finalizada_en INTEGER
);

CREATE INDEX IF NOT EXISTS idx_flota_estado ON salas_hundir_flota (estado, actualizada_en);
CREATE INDEX IF NOT EXISTS idx_flota_ranking ON salas_hundir_flota (estado, ganador, finalizada_en);
