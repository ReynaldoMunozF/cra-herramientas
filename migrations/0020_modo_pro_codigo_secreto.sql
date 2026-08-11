-- Diferencia las reglas de Código secreto entre el modo básico y el modo Pro.
ALTER TABLE partidas_codigo_secreto
  ADD COLUMN modo TEXT NOT NULL DEFAULT 'basico'
  CHECK (modo IN ('basico', 'pro'));
