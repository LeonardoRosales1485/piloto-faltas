-- 036 · Usuarios «reales» para simular el uso compartido (solo en la base post).
-- Cada tipo de empleado (agente o inspector de cada área) tiene dos personas, numeradas en secuencia:
-- Agente 1–2 Tránsito, 3–4 Contravenciones, 5–6 Sustancias; Inspector 1–2 Tránsito, 3–4 Contravenciones, 5–6 Sustancias.
-- Mismas contraseñas que el usuario existente del mismo tipo (operador123, agente123, inspector123). PIN por defecto 1234.

-- 1. Nombres secuenciales para los usuarios existentes
UPDATE usuario SET nombre = 'Agente 1', apellido = '(Tránsito)' WHERE username = 'operador';
UPDATE usuario SET nombre = 'Agente 3', apellido = '(Contravenciones)' WHERE username = 'agente_contrav';
UPDATE usuario SET nombre = 'Agente 5', apellido = '(Sustancias Alimenticias)' WHERE username = 'agente_sust';
UPDATE usuario SET nombre = 'Inspector 1', apellido = '(Tránsito)' WHERE username = 'inspector';
UPDATE usuario SET nombre = 'Inspector 3', apellido = '(Contravenciones)' WHERE username = 'inspector_contrav';
UPDATE usuario SET nombre = 'Inspector 5', apellido = '(Sustancias Alimenticias)' WHERE username = 'inspector_sustancias';

-- 2. Segundo usuario de cada tipo (no se duplican si ya existen)
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, activo, date_created, terminal, firma_activa, modulos_acta) VALUES
  (gen_random_uuid()::text, 'operador_2', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW', 'Agente 2', '(Tránsito)', 'operador2@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario', NULL, TRUE, (extract(epoch from now()) * 1000)::bigint, NULL, TRUE, 'multas'),
  (gen_random_uuid()::text, 'agente_contrav_2', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 4', '(Contravenciones)', 'agente.contravenciones2@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, (extract(epoch from now()) * 1000)::bigint, NULL, TRUE, 'contravenciones'),
  (gen_random_uuid()::text, 'agente_sust_2', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 6', '(Sustancias Alimenticias)', 'agente.sustancias2@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, (extract(epoch from now()) * 1000)::bigint, NULL, TRUE, 'sustancias'),
  (gen_random_uuid()::text, 'inspector_2', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu', 'Inspector 2', '(Tránsito)', 'inspector2@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector', '10235', TRUE, (extract(epoch from now()) * 1000)::bigint, 'T-04', TRUE, 'multas'),
  (gen_random_uuid()::text, 'inspector_contrav_2', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG', 'Inspector 4', '(Contravenciones)', 'inspector.contrav2@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector', '10872', TRUE, (extract(epoch from now()) * 1000)::bigint, 'T-05', TRUE, 'contravenciones'),
  (gen_random_uuid()::text, 'inspector_sustancias_2', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.', 'Inspector 6', '(Sustancias Alimenticias)', 'inspector.sustancias2@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11043', TRUE, (extract(epoch from now()) * 1000)::bigint, 'T-06', TRUE, 'sustancias')
ON CONFLICT (username) DO NOTHING;

-- 3. Actas ya labradas: el nombre del inspector con la numeración nueva
UPDATE infraccion SET inspector_nombre = 'Inspector 1 (Tránsito)' WHERE inspector_username = 'inspector';
UPDATE infraccion SET inspector_nombre = 'Inspector 3 (Contravenciones)' WHERE inspector_username = 'inspector_contrav';
UPDATE infraccion SET inspector_nombre = 'Inspector 5 (Sustancias Alimenticias)' WHERE inspector_username = 'inspector_sustancias';

-- 4. «Restablecer usuarios» del sandbox con los 19 usuarios
CREATE OR REPLACE FUNCTION sandbox_resetear_usuarios() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes BIGINT; ahora BIGINT := (extract(epoch from now()) * 1000)::bigint;
BEGIN
  SELECT count(*) INTO antes FROM usuario;
  DELETE FROM usuario WHERE TRUE;
  INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, activo, date_created) VALUES
    (gen_random_uuid()::text, 'admin', '$2b$10$2qgGci3ApJIExW0hFJQC6e/ZTkspjzCay8ecByy5CcTBhn5KsNNfO', 'Administrador', 'Sistema', 'admin@municipalidad.gob.ar', 'Administración General', 'Administrador', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'operador', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW', 'Agente 1', '(Tránsito)', 'operador@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'inspector', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu', 'Inspector 1', '(Tránsito)', 'inspector@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector', '10234', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_contrav', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG', 'Inspector 3', '(Contravenciones)', 'inspector.contrav@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector', '10871', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_sustancias', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.', 'Inspector 5', '(Sustancias Alimenticias)', 'inspector.sustancias@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11042', TRUE, ahora),
    (gen_random_uuid()::text, 'directora', '$2b$10$0tPCjJxIqJGoPBN3Y/l9Luw/XUc4wCjObbWDicWwlIlLzNBQwuaia', 'Directora', 'de Faltas', 'directora@municipalidad.gob.ar', 'Dirección de Faltas', 'Directora', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'responsable_contrav', '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO', 'Responsable', 'Contravenciones', 'responsable.contravenciones@municipalidad.gob.ar', 'Dirección de Faltas', 'Responsable', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_contrav', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 3', '(Contravenciones)', 'agente.contravenciones@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'responsable_sust', '$2b$10$tyJwrvuEUePmgoAe4Fj9i.PDIV4QKi4dWp6phEfmO8xhbdUJrBcAO', 'Responsable', 'Sustancias Alimenticias', 'responsable.sustancias@municipalidad.gob.ar', 'Dirección de Faltas', 'Responsable', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_sust', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 5', '(Sustancias Alimenticias)', 'agente.sustancias@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'tributario', '$2b$10$43fA2OzM6zjwyGmToHcFCuos4if7CgOTRPm5wZQtDDJC4Gfo7hMmy', 'Usuario', 'Tributario', 'tributario@municipalidad.gob.ar', 'Rentas', 'Tributario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'becario', '$2b$10$dmXTRNZ4EYBqhnHZdRk8peM0dZuQVsdxEKsgT/GE8.wG.M1kwkWaK', 'Becario', 'Faltas', 'becario@municipalidad.gob.ar', 'Dirección de Faltas', 'Becario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'intendente', '$2b$10$sE.EUC4AVh5IPJjOQ0K0se8w4hBlnBG3MpwJm13dgMrV62GDAMKai', 'Intendente', 'Municipal', 'intendente@municipalidad.gob.ar', 'Intendencia', 'Intendente', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'operador_2', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW', 'Agente 2', '(Tránsito)', 'operador2@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_contrav_2', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 4', '(Contravenciones)', 'agente.contravenciones2@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'agente_sust_2', '$2b$10$8VM6JO3AZv1BK5rsbformOvwpbKd14tNEVY6fk2OC8ZSCUePopmv2', 'Agente 6', '(Sustancias Alimenticias)', 'agente.sustancias2@municipalidad.gob.ar', 'Dirección de Faltas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_2', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu', 'Inspector 2', '(Tránsito)', 'inspector2@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector', '10235', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_contrav_2', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG', 'Inspector 4', '(Contravenciones)', 'inspector.contrav2@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector', '10872', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_sustancias_2', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.', 'Inspector 6', '(Sustancias Alimenticias)', 'inspector.sustancias2@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11043', TRUE, ahora);
  -- Columnas agregadas por 011_inspectores.sql (si ya corrió).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'terminal') THEN
    EXECUTE $q$UPDATE usuario SET terminal = CASE username WHEN 'inspector' THEN 'T-01' WHEN 'inspector_contrav' THEN 'T-02' WHEN 'inspector_sustancias' THEN 'T-03' WHEN 'inspector_2' THEN 'T-04' WHEN 'inspector_contrav_2' THEN 'T-05' WHEN 'inspector_sustancias_2' THEN 'T-06' END, firma_activa = TRUE WHERE TRUE$q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'modulos_acta') THEN
    EXECUTE $q$UPDATE usuario SET modulos_acta = CASE username WHEN 'inspector' THEN 'multas' WHEN 'inspector_contrav' THEN 'contravenciones' WHEN 'inspector_sustancias' THEN 'sustancias' WHEN 'directora' THEN 'multas' WHEN 'operador' THEN 'multas' WHEN 'responsable_contrav' THEN 'contravenciones' WHEN 'agente_contrav' THEN 'contravenciones' WHEN 'responsable_sust' THEN 'sustancias' WHEN 'agente_sust' THEN 'sustancias' WHEN 'operador_2' THEN 'multas' WHEN 'agente_contrav_2' THEN 'contravenciones' WHEN 'agente_sust_2' THEN 'sustancias' WHEN 'inspector_2' THEN 'multas' WHEN 'inspector_contrav_2' THEN 'contravenciones' WHEN 'inspector_sustancias_2' THEN 'sustancias' END WHERE TRUE$q$;
  END IF;
  RETURN jsonb_build_object('borrados', antes, 'creados', (SELECT count(*) FROM usuario));
END $$;

GRANT EXECUTE ON FUNCTION sandbox_resetear_usuarios() TO service_role;
