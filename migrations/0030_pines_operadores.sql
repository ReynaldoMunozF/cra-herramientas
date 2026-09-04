CREATE TABLE IF NOT EXISTS pines_operadores (
  matricula TEXT PRIMARY KEY,
  salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  iteraciones INTEGER NOT NULL DEFAULT 120000,
  fallos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0,
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sesiones_pin_operador (
  token_hash TEXT PRIMARY KEY,
  matricula TEXT NOT NULL,
  caduca_en INTEGER NOT NULL,
  creada_en INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sesiones_pin_matricula ON sesiones_pin_operador(matricula, caduca_en);
