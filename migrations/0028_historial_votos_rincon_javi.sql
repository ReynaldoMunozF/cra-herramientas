CREATE TABLE IF NOT EXISTS rincon_javi_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contenido TEXT NOT NULL,
  publicado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS rincon_javi_votos (
  chiste_id INTEGER NOT NULL,
  votante TEXT NOT NULL,
  voto TEXT NOT NULL CHECK (voto IN ('carcajada', 'sonrisa', 'cunado')),
  votado_en INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (chiste_id, votante),
  FOREIGN KEY (chiste_id) REFERENCES rincon_javi_historial(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rincon_javi_historial_fecha
  ON rincon_javi_historial(publicado_en DESC);

INSERT INTO rincon_javi_historial (contenido, publicado_en)
SELECT contenido, actualizada_en
FROM rincon_javi
WHERE trim(contenido) <> ''
  AND contenido <> 'Aquí aparecerán los consejos, ocurrencias y chistes de Javi.'
  AND NOT EXISTS (SELECT 1 FROM rincon_javi_historial);
