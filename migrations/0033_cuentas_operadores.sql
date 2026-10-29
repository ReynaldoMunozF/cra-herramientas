CREATE TABLE IF NOT EXISTS cuentas_operadores (
  matricula TEXT PRIMARY KEY,
  nombre_visible TEXT NOT NULL,
  salt_clave TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  iteraciones INTEGER NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
  debe_cambiar_clave INTEGER NOT NULL DEFAULT 1 CHECK (debe_cambiar_clave IN (0, 1)),
  version_sesion INTEGER NOT NULL DEFAULT 1,
  creada_en INTEGER NOT NULL DEFAULT (unixepoch()),
  actualizada_en INTEGER NOT NULL DEFAULT (unixepoch()),
  ultimo_acceso_en INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cuentas_operadores_activas
ON cuentas_operadores(activa, matricula);
