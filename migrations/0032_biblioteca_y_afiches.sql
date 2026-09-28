ALTER TABLE tablon_eventos ADD COLUMN imagen_clave TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS biblioteca_libros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  autor TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  portada_clave TEXT NOT NULL DEFAULT '',
  pdf_clave TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  creado_en INTEGER NOT NULL DEFAULT (unixepoch()),
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_biblioteca_libros_visibles ON biblioteca_libros(visible, creado_en DESC);
