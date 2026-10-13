-- Supabase bloquea DELETE/UPDATE sin WHERE (extensión safeupdate): «Borrar todo», «Resetear usuarios» y «Cargar»
-- fallaban con «DELETE requires a WHERE clause». Se redefinen con WHERE TRUE (mismo comportamiento).

CREATE OR REPLACE FUNCTION sandbox_borrar() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t TEXT; n BIGINT; res JSONB := '{}';
BEGIN
  FOREACH t IN ARRAY sandbox_tablas() LOOP
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    res := res || jsonb_build_object(t, n);
  END LOOP;
  EXECUTE 'TRUNCATE ' || array_to_string(sandbox_tablas(), ', ') || ' RESTART IDENTITY CASCADE';
  DELETE FROM talonario WHERE TRUE;
  INSERT INTO talonario (serie, ultimo) VALUES ('T', 1000), ('C', 2000), ('S', 3000), ('LEG', 2000);
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION sandbox_resetear_usuarios() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE antes BIGINT; ahora BIGINT := (extract(epoch from now()) * 1000)::bigint;
BEGIN
  SELECT count(*) INTO antes FROM usuario;
  DELETE FROM usuario WHERE TRUE;
  INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, legajo, activo, date_created) VALUES
    (gen_random_uuid()::text, 'admin', '$2b$10$2qgGci3ApJIExW0hFJQC6e/ZTkspjzCay8ecByy5CcTBhn5KsNNfO', 'Administrador', 'Sistema', 'admin@municipalidad.gob.ar', 'Administración General', 'Administrador', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'operador', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW', 'Operador', 'Mesa', 'operador@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'inspector', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu', 'Inspector', 'Vial', 'inspector@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector', '10234', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_contrav', '$2b$10$Yjb.vr.Rr30A.sQ2qO/1Ae22E3MA7EcXku0CfRujGsQ1W5TowPWRG', 'Inspector', 'de Contravenciones', 'inspector.contrav@municipalidad.gob.ar', 'Inspecciones Generales', 'Inspector', '10871', TRUE, ahora),
    (gen_random_uuid()::text, 'inspector_sustancias', '$2b$10$qKurX522.xK74gwyBCis0ODdc//5TKSrj5lDiE7b/H3KY8qDLP6T.', 'Inspector', 'de Bromatología', 'inspector.sustancias@municipalidad.gob.ar', 'Bromatología', 'Inspector', '11042', TRUE, ahora),
    (gen_random_uuid()::text, 'directora', '$2b$10$0tPCjJxIqJGoPBN3Y/l9Luw/XUc4wCjObbWDicWwlIlLzNBQwuaia', 'Directora', 'de Faltas', 'directora@municipalidad.gob.ar', 'Dirección de Faltas', 'Directora', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'abogada', '$2b$10$zs7sxMyA39qeo/UBcbhV0.T0QrUFEhQt86SzIX3XqxLoyCpncmhKC', 'Abogada', 'de Contravenciones', 'abogada@municipalidad.gob.ar', 'Dirección de Faltas', 'Abogada', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'tributario', '$2b$10$43fA2OzM6zjwyGmToHcFCuos4if7CgOTRPm5wZQtDDJC4Gfo7hMmy', 'Usuario', 'Tributario', 'tributario@municipalidad.gob.ar', 'Rentas', 'Tributario', NULL, TRUE, ahora),
    (gen_random_uuid()::text, 'becario', '$2b$10$dmXTRNZ4EYBqhnHZdRk8peM0dZuQVsdxEKsgT/GE8.wG.M1kwkWaK', 'Becario', 'Faltas', 'becario@municipalidad.gob.ar', 'Dirección de Faltas', 'Becario', NULL, TRUE, ahora);
  -- Columnas agregadas por 011_inspectores.sql (si ya corrió).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'terminal') THEN
    EXECUTE $q$UPDATE usuario SET terminal = CASE username WHEN 'inspector' THEN 'T-01' WHEN 'inspector_contrav' THEN 'T-02' WHEN 'inspector_sustancias' THEN 'T-03' END, firma_activa = TRUE WHERE TRUE$q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'modulos_acta') THEN
    EXECUTE $q$UPDATE usuario SET modulos_acta = CASE username WHEN 'inspector' THEN 'multas' WHEN 'inspector_contrav' THEN 'contravenciones' WHEN 'inspector_sustancias' THEN 'sustancias' END WHERE TRUE$q$;
  END IF;
  RETURN jsonb_build_object('borrados', antes, 'creados', 9);
END $$;

CREATE OR REPLACE FUNCTION sandbox_cargar(p_nombre TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; t TEXT; arr JSONB; delta BIGINT; res JSONB := '{}'; maxid BIGINT;
BEGIN
  SELECT * INTO s FROM sandbox_snapshot WHERE nombre = p_nombre;
  IF NOT FOUND THEN RAISE EXCEPTION 'No hay datos guardados para «%»', p_nombre; END IF;
  delta := (extract(epoch from now()) * 1000)::bigint - s.creado_at;
  PERFORM sandbox_borrar();
  FOREACH t IN ARRAY sandbox_tablas() LOOP
    arr := coalesce(s.datos -> t, '[]');
    IF jsonb_array_length(arr) > 0 THEN
      EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_recordset(NULL::%I, $1)', t, t)
        USING (SELECT jsonb_agg(sandbox_desplazar(e, delta)) FROM jsonb_array_elements(arr) e);
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'id')
         AND pg_get_serial_sequence(t, 'id') IS NOT NULL THEN
        EXECUTE format('SELECT max(id) FROM %I', t) INTO maxid;
        PERFORM setval(pg_get_serial_sequence(t, 'id'), greatest(maxid, 1));
      END IF;
    END IF;
    res := res || jsonb_build_object(t, jsonb_array_length(arr));
  END LOOP;
  UPDATE infraccion_imagen SET full_raw = preview_raw WHERE full_raw IS NULL;
  IF jsonb_array_length(coalesce(s.datos -> 'talonario', '[]')) > 0 THEN
    DELETE FROM talonario WHERE TRUE;
    INSERT INTO talonario SELECT * FROM jsonb_populate_recordset(NULL::talonario, s.datos -> 'talonario');
  END IF;
  RETURN res;
END $$;

NOTIFY pgrst, 'reload schema';
