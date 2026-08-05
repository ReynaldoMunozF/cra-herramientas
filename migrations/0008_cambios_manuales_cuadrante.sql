-- Correcciones manuales del cuadrante realizadas exclusivamente por administración.
-- El cuadrante original permanece intacto y cada registro sustituye un único día.
CREATE TABLE IF NOT EXISTS cambios_cuadrante (
  id_cuadrante TEXT NOT NULL,
  matricula TEXT NOT NULL,
  dia INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 31),
  turno TEXT NOT NULL DEFAULT '',
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cuadrante, matricula, dia)
);

CREATE INDEX IF NOT EXISTS idx_cambios_cuadrante_mes
  ON cambios_cuadrante (id_cuadrante, matricula);
