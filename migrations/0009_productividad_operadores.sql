-- Registros diarios utilizados para calcular la productividad por hora.
-- La combinación matrícula + fecha permite corregir un día sin duplicarlo.
CREATE TABLE IF NOT EXISTS registros_productividad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT NOT NULL,
  fecha TEXT NOT NULL,
  total_alarmas INTEGER NOT NULL DEFAULT 0 CHECK (total_alarmas >= 0),
  horas_trabajadas REAL NOT NULL DEFAULT 8 CHECK (horas_trabajadas > 0 AND horas_trabajadas <= 24),
  citas INTEGER NOT NULL DEFAULT 0 CHECK (citas >= 0),
  llamadas_entrantes INTEGER NOT NULL DEFAULT 0 CHECK (llamadas_entrantes >= 0),
  gestiones_administrativas INTEGER NOT NULL DEFAULT 0 CHECK (gestiones_administrativas >= 0),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (matricula, fecha)
);

CREATE INDEX IF NOT EXISTS idx_productividad_matricula_fecha
  ON registros_productividad (matricula, fecha);
