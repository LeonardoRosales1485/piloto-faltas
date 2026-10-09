-- Tipos de inspector: cada uno labra solo los módulos de acta que tiene autorizados
-- (multas = tránsito, contravenciones, sustancias). Se editan en «Inspectores» o en «Usuarios».
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS modulos_acta VARCHAR(80);

UPDATE usuario SET modulos_acta = 'multas' WHERE username = 'inspector' AND modulos_acta IS NULL;
UPDATE usuario SET modulos_acta = 'contravenciones' WHERE username = 'inspector_contrav' AND modulos_acta IS NULL;
-- Inspectores existentes sin módulos: se deducen de la dependencia.
UPDATE usuario SET modulos_acta = CASE WHEN sector ~* 'bromatolog' THEN 'sustancias' WHEN sector ~* 'contrav|inspecciones generales' THEN 'contravenciones' ELSE 'multas' END
WHERE rol = 'Inspector' AND modulos_acta IS NULL;

-- Inspector de prueba de sustancias alimenticias.
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, terminal, modulos_acta, date_created)
SELECT gen_random_uuid()::text, 'inspector_sustancias', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.',
  'Inspector', 'de Bromatología', 'inspector.sustancias@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11042', 'T-03', 'sustancias',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'inspector_sustancias');

NOTIFY pgrst, 'reload schema';
