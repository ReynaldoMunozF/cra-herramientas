ALTER TABLE partidas_caso_asesino
ADD COLUMN pausa_iniciada_en INTEGER;

ALTER TABLE partidas_caso_asesino
ADD COLUMN pausa_acumulada INTEGER NOT NULL DEFAULT 0;
