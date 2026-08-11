CREATE TABLE IF NOT EXISTS rincon_javi (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  contenido TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 0 CHECK (visible IN (0, 1)),
  actualizada_en INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO rincon_javi (id, contenido, visible)
VALUES (1, 'Aquí aparecerán los consejos, ocurrencias y chistes de Javi.', 0);
