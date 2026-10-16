-- Áreas del back office: cada tipo de acta tiene su responsable (firma) y sus agentes.
--   Tránsito: Directora + Agente de tránsito · Contravenciones: Responsable + Agente · Sustancias: Responsable + Agente.
-- El rol «Abogada» pasa a llamarse «Responsable». El alcance de cada usuario sale de usuario.modulos_acta
-- («tipos de acta que gestiona»); sin dato: Directora tránsito, Responsable contravenciones, Agente todos.

-- 1. Rol Abogada → Responsable (usuarios y permisos editados por tipo de usuario)
UPDATE usuario SET rol = 'Responsable' WHERE rol = 'Abogada';
INSERT INTO permiso_rol (rol, permiso, permitido)
  SELECT 'Responsable', permiso, permitido FROM permiso_rol WHERE rol = 'Abogada'
  ON CONFLICT (rol, permiso) DO NOTHING;
DELETE FROM permiso_rol WHERE rol = 'Abogada';

-- 2. Usuario «abogada» → «responsable_contrav» (contraseña responsable123). Los permisos propios se conservan.
-- (Un solo bloque: el editor SQL de Supabase puede correr cada sentencia en una conexión distinta y perder las tablas temporales.)
DO $$
DECLARE perms JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM usuario WHERE username = 'abogada') AND NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'responsable_contrav') THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('permiso', permiso, 'permitido', permitido)), '[]'::jsonb) INTO perms
      FROM permiso_usuario WHERE username = 'abogada';
    DELETE FROM permiso_usuario WHERE username = 'abogada';
    UPDATE usuario SET username = 'responsable_contrav', nombre = 'Responsable', apellido = 'Contravenciones',
      email = 'responsable.contravenciones@municipalidad.gob.ar', password_hash = '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO'
    WHERE username = 'abogada';
    INSERT INTO permiso_usuario (username, permiso, permitido)
      SELECT 'responsable_contrav', x->>'permiso', (x->>'permitido')::boolean FROM jsonb_array_elements(perms) x
      ON CONFLICT (username, permiso) DO NOTHING;
  END IF;
END $$;

-- 3. Alcance de los usuarios del piloto
UPDATE usuario SET modulos_acta = 'multas' WHERE username = 'directora';
UPDATE usuario SET modulos_acta = 'multas', nombre = 'Agente', apellido = 'de Tránsito' WHERE username = 'operador';
UPDATE usuario SET modulos_acta = 'contravenciones' WHERE username = 'responsable_contrav';

-- 4. Usuarios nuevos (agente123 / responsable123)
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, modulos_acta, activo, date_created)
SELECT gen_random_uuid()::text, v.u, v.h, v.n, v.a, v.e, 'Dirección de Faltas', v.r, v.m, TRUE, (extract(epoch from now()) * 1000)::bigint
FROM (VALUES
  ('agente_contrav', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente', 'de Contravenciones', 'agente.contravenciones@municipalidad.gob.ar', 'Usuario', 'contravenciones'),
  ('responsable_sust', '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO', 'Responsable', 'Sustancias Alimenticias', 'responsable.sustancias@municipalidad.gob.ar', 'Responsable', 'sustancias'),
  ('agente_sust', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente', 'de Sustancias Alimenticias', 'agente.sustancias@municipalidad.gob.ar', 'Usuario', 'sustancias')
) AS v(u, h, n, a, e, r, m)
WHERE NOT EXISTS (SELECT 1 FROM usuario x WHERE x.username = v.u);

-- 5. «Restablecer usuarios» del sandbox con los usuarios nuevos
CREATE OR REPLACE FUNCTION sandbox_resetear_usuarios() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes BIGINT; ahora BIGINT := (extract(epoch from now()) * 1000)::bigint;
BEGIN
  SELECT count(*) INTO antes FROM usuario;
  DELETE FROM usuario WHERE TRUE;
  INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, activo, date_created) VALUES
    (gen_random_uuid()::text, 'admin', '$2b$10$2qgGci3ApJIExW0hFJQC6e/ZTkspjzCay8ecByy5CcTBhn5KsNNfO', 'Administrador', 'Sistema', 'admin@municipalidad.gob.ar', 'Administración General', 'Administrador', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'operador', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW', 'Agente', 'de Tránsito', 'operador@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'inspector', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu', 'Inspector', 'Vial', 'inspector@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector', '10234', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_contrav', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG', 'Inspector', 'de Contravenciones', 'inspector.contrav@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector', '10871', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_sustancias', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.', 'Inspector', 'de Bromatología', 'inspector.sustancias@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11042', TRUE, ahora),
    (gen_random_uuid()::text, 'directora', '$2b$10$0tPCjJxIqJGoPBN3Y/l9Luw/XUc4wCjObbWDicWwlIlLzNBQwuaia', 'Directora', 'de Faltas', 'directora@municipalidad.gob.ar', 'Dirección de Faltas', 'Directora', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'responsable_contrav', '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO', 'Responsable', 'Contravenciones', 'responsable.contravenciones@municipalidad.gob.ar', 'Dirección de Faltas', 'Responsable', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_contrav', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente', 'de Contravenciones', 'agente.contravenciones@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'responsable_sust', '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO', 'Responsable', 'Sustancias Alimenticias', 'responsable.sustancias@municipalidad.gob.ar', 'Dirección de Faltas', 'Responsable', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_sust', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente', 'de Sustancias Alimenticias', 'agente.sustancias@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'tributario', '$2b$10$43fA2OzM6zjwyGmToHcFCuos4if7CgOTRPm5wZQtDDJC4Gfo7hMmy', 'Usuario', 'Tributario', 'tributario@municipalidad.gob.ar', 'Rentas', 'Tributario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'becario', '$2b$10$dmXTRNZ4EYBqhnHZdRk8peM0dZuQVsdxEKsgT/GE8.wG.M1kwkWaK', 'Becario', 'Faltas', 'becario@municipalidad.gob.ar', 'Dirección de Faltas', 'Becario', NULL, TRUE, ahora);
  -- Columnas agregadas por 011_inspectores.sql (si ya corrió).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'terminal') THEN
    EXECUTE $q$UPDATE usuario SET terminal = CASE username WHEN 'inspector' THEN 'T-01' WHEN 'inspector_contrav' THEN 'T-02' WHEN 'inspector_sustancias' THEN 'T-03' END, firma_activa = TRUE WHERE TRUE$q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'modulos_acta') THEN
    EXECUTE $q$UPDATE usuario SET modulos_acta = CASE username WHEN 'inspector' THEN 'multas' WHEN 'inspector_contrav' THEN 'contravenciones' WHEN 'inspector_sustancias' THEN 'sustancias' WHEN 'directora' THEN 'multas' WHEN 'operador' THEN 'multas' WHEN 'responsable_contrav' THEN 'contravenciones' WHEN 'agente_contrav' THEN 'contravenciones' WHEN 'responsable_sust' THEN 'sustancias' WHEN 'agente_sust' THEN 'sustancias' END WHERE TRUE$q$;
  END IF;
  RETURN jsonb_build_object('borrados', antes, 'creados', 12);
END $$;


NOTIFY pgrst, 'reload schema';
