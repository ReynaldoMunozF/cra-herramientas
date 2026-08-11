-- Caché local de códigos validados mediante CartoCiudad (IGN/CNIG).
CREATE TABLE IF NOT EXISTS codigos_postales_cache (
  codigo_postal TEXT PRIMARY KEY CHECK (length(codigo_postal) = 5),
  municipio TEXT NOT NULL,
  provincia TEXT NOT NULL,
  comunidad TEXT,
  latitud REAL NOT NULL,
  longitud REAL NOT NULL,
  fuente TEXT NOT NULL,
  actualizado_en INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_codigos_postales_municipio
  ON codigos_postales_cache (provincia, municipio);
