ALTER TABLE partidas_caso_asesino
ADD COLUMN numero_caso INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_caso_asesino_expediente
ON partidas_caso_asesino (numero_caso, estado, duracion_segundos, intentos);
