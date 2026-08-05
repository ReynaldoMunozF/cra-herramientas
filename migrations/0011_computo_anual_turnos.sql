-- Turnos introducidos manualmente en el cómputo anual de cada operador.
-- Una matrícula solo puede tener un código guardado para una fecha concreta.
CREATE TABLE IF NOT EXISTS computo_anual_turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT NOT NULL,
  fecha TEXT NOT NULL,
  codigo TEXT NOT NULL CHECK (codigo IN ('M', 'T', 'N', '1', '2', 'B', 'P', 'V')),
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (matricula, fecha)
);

CREATE INDEX IF NOT EXISTS idx_computo_anual_matricula_fecha
  ON computo_anual_turnos (matricula, fecha);
