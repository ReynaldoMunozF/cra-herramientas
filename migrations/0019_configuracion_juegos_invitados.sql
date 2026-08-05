CREATE TABLE IF NOT EXISTS configuracion_juegos_invitados (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  juegos TEXT NOT NULL,
  actualizada_en INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO configuracion_juegos_invitados (id, juegos)
VALUES (1, '["codigo","palabra","asesino","flota"]');
