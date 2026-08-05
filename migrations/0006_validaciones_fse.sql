-- Guarda comprobaciones anónimas de la orientación FSE mostrada por la aplicación.
-- No se almacena matrícula, nombre, dirección IP ni ningún dato del operador.
CREATE TABLE IF NOT EXISTS validaciones_fse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_postal TEXT NOT NULL,
  municipio TEXT NOT NULL,
  provincia TEXT,
  resultado_mostrado TEXT NOT NULL,
  es_correcto INTEGER NOT NULL CHECK (es_correcto IN (0, 1)),
  resultado_corregido TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS indice_validaciones_fse_codigo_fecha
  ON validaciones_fse (codigo_postal, creado_en DESC);
