CREATE TABLE IF NOT EXISTS tablon_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Aviso',
  descripcion TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  hora_inicio TEXT NOT NULL DEFAULT '',
  hora_fin TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#087ead',
  enlace TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en INTEGER NOT NULL DEFAULT (unixepoch()),
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_tablon_eventos_publicados
ON tablon_eventos (visible, fecha, orden, id);

CREATE TABLE IF NOT EXISTS publicidad_inicio (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  etiqueta TEXT NOT NULL DEFAULT 'Recomendado',
  titulo TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  texto_boton TEXT NOT NULL DEFAULT '',
  enlace TEXT NOT NULL DEFAULT '',
  imagen_url TEXT NOT NULL DEFAULT '',
  color_fondo TEXT NOT NULL DEFAULT '#fff8df',
  color_acento TEXT NOT NULL DEFAULT '#f0ad00',
  visible INTEGER NOT NULL DEFAULT 0,
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO publicidad_inicio (id) VALUES (1);
