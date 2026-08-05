-- Permite detener el cronómetro real de Código secreto y Palabra clave.
ALTER TABLE partidas_codigo_secreto ADD COLUMN pausa_iniciada_en INTEGER;
ALTER TABLE partidas_codigo_secreto ADD COLUMN pausa_acumulada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE partidas_palabra_clave ADD COLUMN pausa_iniciada_en INTEGER;
ALTER TABLE partidas_palabra_clave ADD COLUMN pausa_acumulada INTEGER NOT NULL DEFAULT 0;

-- Guarda las temáticas habilitadas por el administrador.
CREATE TABLE IF NOT EXISTS configuracion_palabra_clave (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tematicas TEXT NOT NULL,
  actualizada_en INTEGER NOT NULL
);

INSERT OR IGNORE INTO configuracion_palabra_clave (id, tematicas, actualizada_en)
VALUES (1, '["cra","animales","naturaleza","alimentos","objetos"]', unixepoch());

ALTER TABLE partidas_palabra_clave ADD COLUMN tematica TEXT;
