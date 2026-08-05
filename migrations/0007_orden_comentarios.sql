-- Posición elegida por cada operador para sus comentarios frecuentes.
-- Los registros existentes conservan inicialmente su orden cronológico.
ALTER TABLE comentarios_frecuentes
ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_comentarios_frecuentes_orden
  ON comentarios_frecuentes (matricula, orden ASC, creado_en DESC);
