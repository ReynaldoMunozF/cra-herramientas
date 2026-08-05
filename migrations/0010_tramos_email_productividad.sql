-- Tramos de gestiones largas comunicadas por email.
-- Se guardan como una lista JSON para mantener juntos inicio y fin de cada gestión.
ALTER TABLE registros_productividad
  ADD COLUMN tramos_email TEXT NOT NULL DEFAULT '[]';
