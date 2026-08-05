CREATE TABLE comentarios_frecuentes_nueva (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT NOT NULL,
  texto TEXT NOT NULL COLLATE NOCASE,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (matricula, texto)
);

INSERT INTO comentarios_frecuentes_nueva (id, matricula, texto, creado_en)
SELECT id, 'RMI', texto, creado_en
FROM comentarios_frecuentes;

DROP TABLE comentarios_frecuentes;

ALTER TABLE comentarios_frecuentes_nueva
RENAME TO comentarios_frecuentes;

CREATE INDEX idx_comentarios_frecuentes_operador
  ON comentarios_frecuentes (matricula, creado_en DESC);
