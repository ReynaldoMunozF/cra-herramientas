CREATE TABLE IF NOT EXISTS codigos_operativos_personalizados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL CHECK (categoria IN ('resoluciones', 'sms')),
  codigo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  creado_en INTEGER NOT NULL DEFAULT (unixepoch()),
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_operativos_categoria_codigo
  ON codigos_operativos_personalizados (categoria, codigo COLLATE NOCASE);

