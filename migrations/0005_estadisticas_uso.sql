-- Registra únicamente el tipo de acción y su fecha.
-- No se almacenan direcciones, coordenadas, códigos postales ni textos copiados.
CREATE TABLE IF NOT EXISTS estadisticas_uso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estadisticas_uso_tipo_fecha
  ON estadisticas_uso (tipo, creado_en DESC);
