-- Decisiones del 22/10/2026 (respuestas a las preguntas del plan). Correr después de 032. Se puede correr más de una vez.

-- 1. Intendente: firma los fallos y las resoluciones que aprueba la Dirección (pantalla «Para firmar»).
--    Usuario de prueba intendente / intendente123. Las categorías que firma se cambian en la configuración
--    (firma_intendente_categorias, separadas por coma; vacía = la Dirección firma todo como antes).
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, activo, date_created)
SELECT gen_random_uuid()::text, 'intendente', '$2b$10$sE.EUC4AVh5IPJjOQ0K0se8w4hBlnBG3MpwJm13dgMrV62GDAMKai', 'Intendente', 'Municipal',
       'intendente@municipalidad.gob.ar', 'Intendencia', 'Intendente', NULL, TRUE, (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'intendente');

INSERT INTO configuracion (llave, valor, publico) VALUES ('firma_intendente_categorias', 'Fallo,Resolución', '0')
ON CONFLICT (llave) DO NOTHING;

-- Cargo de quien firma, para el sello del escrito (Directora de Faltas o Intendente Municipal).
ALTER TABLE documento ADD COLUMN IF NOT EXISTS firmado_cargo VARCHAR(80);

-- 2. Límites de adjuntos: propuesta (3 MB por archivo, 10 archivos, 50 fojas). Solo cambia los valores provisorios de 032.
UPDATE configuracion SET valor = '10' WHERE llave = 'adjuntos_max_archivos' AND valor = '8';
UPDATE configuracion SET valor = '50' WHERE llave = 'adjuntos_max_fojas' AND valor = '30';

-- 3. «Restablecer piloto» vuelve a crear también al Intendente.
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
    (gen_random_uuid()::text, 'becario', '$2b$10$dmXTRNZ4EYBqhnHZdRk8peM0dZuQVsdxEKsgT/GE8.wG.M1kwkWaK', 'Becario', 'Faltas', 'becario@municipalidad.gob.ar', 'Dirección de Faltas', 'Becario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'intendente', '$2b$10$sE.EUC4AVh5IPJjOQ0K0se8w4hBlnBG3MpwJm13dgMrV62GDAMKai', 'Intendente', 'Municipal', 'intendente@municipalidad.gob.ar', 'Intendencia', 'Intendente', NULL, TRUE, ahora);
  -- Columnas agregadas por 011_inspectores.sql (si ya corrió).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'terminal') THEN
    EXECUTE $q$UPDATE usuario SET terminal = CASE username WHEN 'inspector' THEN 'T-01' WHEN 'inspector_contrav' THEN 'T-02' WHEN 'inspector_sustancias' THEN 'T-03' END, firma_activa = TRUE WHERE TRUE$q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'modulos_acta') THEN
    EXECUTE $q$UPDATE usuario SET modulos_acta = CASE username WHEN 'inspector' THEN 'multas' WHEN 'inspector_contrav' THEN 'contravenciones' WHEN 'inspector_sustancias' THEN 'sustancias' WHEN 'directora' THEN 'multas' WHEN 'operador' THEN 'multas' WHEN 'responsable_contrav' THEN 'contravenciones' WHEN 'agente_contrav' THEN 'contravenciones' WHEN 'responsable_sust' THEN 'sustancias' WHEN 'agente_sust' THEN 'sustancias' END WHERE TRUE$q$;
  END IF;
  RETURN jsonb_build_object('borrados', antes, 'creados', 13);
END $$;

NOTIFY pgrst, 'reload schema';
