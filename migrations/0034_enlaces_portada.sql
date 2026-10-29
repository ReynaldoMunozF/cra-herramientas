CREATE TABLE IF NOT EXISTS enlaces_portada (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  color_fondo TEXT NOT NULL DEFAULT '#087ead',
  color_texto TEXT NOT NULL DEFAULT '#ffffff',
  visible INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en INTEGER NOT NULL DEFAULT (unixepoch()),
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_enlaces_portada_publicados
ON enlaces_portada (visible, orden, id);
