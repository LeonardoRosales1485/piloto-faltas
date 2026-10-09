-- ABM de usuarios: baja lógica (activo) e inspector de contravenciones de prueba.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS date_updated BIGINT;

UPDATE usuario SET sector = 'Tránsito' WHERE username = 'inspector' AND (sector IS NULL OR sector = '' OR sector !~* 'tr[aá]nsito');

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'inspector_contrav', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG',
  'Inspector', 'de Contravenciones', 'inspector.contrav@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'inspector_contrav');

NOTIFY pgrst, 'reload schema';
