-- =============================================================================
-- Opciones sandbox: actualiza los «Datos de sistema» (snapshot 'default' de 010_sandbox_default.sql) a lo que cambió
-- después de generarlos (09/10). Correr después de 010 (y de 023 y 026). Se puede correr más de una vez.
--   1. CUIT y documentos sin separadores (como 026): el portal busca por documento normalizado.
--   2. Nombres de usuario actuales (025): «Abogada de Contravenciones» → «Responsable Contravenciones»,
--      «Operador Mesa» → «Agente de Tránsito».
--   3. Valores del labrado fijos en las actas firmadas (como 023), con la UF y los múltiplos vigentes.
--   4. Ejemplos de lo nuevo: memos internos, una subsanación de datos y un monto ajustado por artículo.
--   5. «Cargar» también corre la fecha de los valores del labrado (va dentro de valores_labrado_json).
-- Para verlo: Configuración → Opciones sandbox → «Cargar» en Datos de sistema.
-- =============================================================================

-- 5. Corre las fechas de una fila en «delta» milisegundos (como en 009), incluida la fecha de los valores del labrado.
CREATE OR REPLACE FUNCTION sandbox_desplazar(fila JSONB, delta BIGINT) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k TEXT; val JSONB; out JSONB := fila; vl JSONB;
BEGIN
  FOR k, val IN SELECT * FROM jsonb_each(fila) LOOP
    IF jsonb_typeof(val) = 'number' AND (k LIKE '%\_at' OR k IN ('date_created','date_updated','fecha','vencimiento','fecha_resultado','fecha_numero'))
       AND (val #>> '{}')::numeric > 1000000000000 THEN
      out := jsonb_set(out, ARRAY[k], to_jsonb((val #>> '{}')::bigint + delta));
    ELSIF k = 'legajo_fecha' AND jsonb_typeof(val) = 'string' AND (val #>> '{}') ~ '^\d{4}-\d{2}-\d{2}' THEN
      out := jsonb_set(out, ARRAY[k], to_jsonb(to_char(((val #>> '{}')::timestamp + make_interval(secs => delta / 1000.0)), 'YYYY-MM-DD"T"HH24:MI')));
    ELSIF k = 'valores_labrado_json' AND jsonb_typeof(val) = 'string' THEN
      BEGIN
        vl := (val #>> '{}')::jsonb;
        IF jsonb_typeof(vl -> 'fecha') = 'number' AND (vl ->> 'fecha')::numeric > 1000000000000 THEN
          out := jsonb_set(out, ARRAY[k], to_jsonb(jsonb_set(vl, '{fecha}', to_jsonb((vl ->> 'fecha')::bigint + delta))::text));
        END IF;
      EXCEPTION WHEN others THEN NULL; -- JSON inválido: se deja como está
      END;
    END IF;
  END LOOP;
  RETURN out;
END $$;

DO $$
DECLARE
  s JSONB; ca BIGINT; t TEXT; uf NUMERIC; dia BIGINT := 86400000;
  i_sub JSONB; i_aj JSONB; id_m1 BIGINT; id_m2 BIGINT; mult NUMERIC; nuevo_mult NUMERIC; html TEXT; fecha_txt TEXT;
  memos JSONB := '[]'; subs JSONB := '[]'; ajustes JSONB := '[]'; hist JSONB := '[]'; docs JSONB := '[]';
BEGIN
  SELECT datos, creado_at INTO s, ca FROM sandbox_snapshot WHERE nombre = 'default';
  IF NOT FOUND THEN
    RAISE NOTICE 'No hay snapshot «default»: corra primero sql/010_sandbox_default.sql';
    RETURN;
  END IF;
  uf := coalesce((SELECT valor::numeric FROM configuracion WHERE llave = 'finanza_unidad_fija'), 2000);
  fecha_txt := to_char(to_timestamp(ca / 1000.0) AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY');

  -- Quita lo que agregó una corrida anterior de este script (ids reservados ≥ 1001).
  s := jsonb_set(s, '{causa_historial}', coalesce((SELECT jsonb_agg(e ORDER BY o) FROM jsonb_array_elements(s -> 'causa_historial') WITH ORDINALITY x(e, o) WHERE (e ->> 'id')::bigint < 1001), '[]'));
  s := jsonb_set(s, '{documento}', coalesce((SELECT jsonb_agg(e ORDER BY o) FROM jsonb_array_elements(s -> 'documento') WITH ORDINALITY x(e, o) WHERE (e ->> 'id')::bigint < 1001), '[]'));

  -- 1. Documento y CUIT normalizados (actas y cuentas del portal) y 3. valores del labrado en las actas firmadas.
  s := jsonb_set(s, '{infraccion}', (
    SELECT jsonb_agg(
      e || jsonb_build_object(
        'infractor_documento_numero', nullif(upper(regexp_replace(coalesce(e ->> 'infractor_documento_numero', ''), '[\s.\-/]', '', 'g')), ''),
        'infractor_cuit', nullif(upper(regexp_replace(coalesce(e ->> 'infractor_cuit', ''), '[\s.\-/]', '', 'g')), ''))
      || CASE WHEN e ->> 'estado_faltas' <> 'Borrador' AND e ->> 'valores_labrado_json' IS NULL THEN jsonb_build_object('valores_labrado_json',
           json_build_object('uf', uf, 'fecha', coalesce((e ->> 'firmada_at')::bigint, ca), 'leyes', coalesce((
             SELECT json_object_agg(l.nombre || CASE WHEN coalesce(l.articulo, '') <> '' THEN ' · ' || l.articulo ELSE '' END, l.multiplicador)
             FROM jsonb_array_elements(s -> 'infraccion_ley') il
             JOIN ley l ON il ->> 'ley_nombre' = l.nombre || ' · ' || l.articulo OR il ->> 'ley_nombre' = l.nombre
             WHERE (il ->> 'infraccion_id')::bigint = (e ->> 'id')::bigint), '{}'::json))::text)
         ELSE '{}'::jsonb END
      ORDER BY o)
    FROM jsonb_array_elements(s -> 'infraccion') WITH ORDINALITY x(e, o)));
  s := jsonb_set(s, '{ciudadano}', coalesce((
    SELECT jsonb_agg(e || jsonb_build_object(
        'documento_numero', nullif(upper(regexp_replace(coalesce(e ->> 'documento_numero', ''), '[\s.\-/]', '', 'g')), ''),
        'cuit', nullif(upper(regexp_replace(coalesce(e ->> 'cuit', ''), '[\s.\-/]', '', 'g')), '')) ORDER BY o)
    FROM jsonb_array_elements(s -> 'ciudadano') WITH ORDINALITY x(e, o)), '[]'));

  -- 2. Nombres de usuario actuales en cualquier campo de las tablas de la causa.
  FOREACH t IN ARRAY ARRAY['causa_historial', 'documento', 'presentacion', 'boleta', 'notificacion', 'correo_saliente'] LOOP
    IF jsonb_typeof(s -> t) = 'array' THEN
      s := jsonb_set(s, ARRAY[t], coalesce((
        SELECT jsonb_agg((
          SELECT jsonb_object_agg(k, CASE v
            WHEN '"Abogada de Contravenciones"'::jsonb THEN '"Responsable Contravenciones"'::jsonb
            WHEN '"Operador Mesa"'::jsonb THEN '"Agente de Tránsito"'::jsonb
            ELSE v END)
          FROM jsonb_each(e) f(k, v)) ORDER BY o)
        FROM jsonb_array_elements(s -> t) WITH ORDINALITY x(e, o)), '[]'));
    END IF;
  END LOOP;

  -- 4a. Memos internos (no cambian el estado; en el historial queda un extracto).
  SELECT (e ->> 'id')::bigint INTO id_m1 FROM jsonb_array_elements(s -> 'infraccion') e WHERE e ->> 'legajo_numero_acta' = 'T-001011';
  SELECT (e ->> 'id')::bigint INTO id_m2 FROM jsonb_array_elements(s -> 'infraccion') e WHERE e ->> 'legajo_numero_acta' = 'C-002004';
  IF id_m1 IS NOT NULL THEN
    memos := memos || jsonb_build_array(jsonb_build_object('id', 1, 'uuid', gen_random_uuid()::text, 'infraccion_id', id_m1, 'usuario', 'Directora de Faltas', 'fecha', ca - dia,
      'texto', 'Revisar el descargo junto con las fotos del acta antes de dictar el fallo: el infractor adjuntó un ticket de estacionamiento medido del mismo horario.'));
    hist := hist || jsonb_build_array(jsonb_build_object('id', 1001, 'infraccion_id', id_m1, 'fecha', ca - dia, 'usuario', 'Directora de Faltas', 'accion', 'Memo interno agregado',
      'detalle', 'Revisar el descargo junto con las fotos del acta antes de dic…', 'estado_anterior', NULL, 'estado_nuevo', NULL));
  END IF;
  IF id_m2 IS NOT NULL THEN
    memos := memos || jsonb_build_array(jsonb_build_object('id', 2, 'uuid', gen_random_uuid()::text, 'infraccion_id', id_m2, 'usuario', 'Responsable Contravenciones', 'fecha', ca - 2 * dia,
      'texto', 'Se pidió informe a Habilitaciones sobre la vigencia de la habilitación del local. Reclamar si no responde en 5 días hábiles.'));
    hist := hist || jsonb_build_array(jsonb_build_object('id', 1002, 'infraccion_id', id_m2, 'fecha', ca - 2 * dia, 'usuario', 'Responsable Contravenciones', 'accion', 'Memo interno agregado',
      'detalle', 'Se pidió informe a Habilitaciones sobre la vigencia de la habi…', 'estado_anterior', NULL, 'estado_nuevo', NULL));
  END IF;

  -- 4b. Subsanación de datos (una por causa) con su constancia: dominio mal tipeado en T-001002.
  SELECT e INTO i_sub FROM jsonb_array_elements(s -> 'infraccion') e WHERE e ->> 'legajo_numero_acta' = 'T-001002';
  IF i_sub IS NOT NULL AND coalesce(i_sub ->> 'vehiculo_numero_dominio', '') <> '' THEN
    html := '<p style="text-align:center"><strong>CONSTANCIA DE SUBSANACIÓN</strong></p><p>Acta T-001002 · Legajo ' || coalesce(i_sub ->> 'legajo_number', '') || '/' || coalesce(i_sub ->> 'legajo_anio', '')
      || '.</p><p><strong>Motivo:</strong> Error de tipeo en el dominio: la cédula del vehículo presentada por la infractora dice AD456GN.</p>'
      || '<table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><thead><tr><th>Dato</th><th>Decía</th><th>Debe decir</th></tr></thead><tbody>'
      || '<tr><td>Dominio</td><td>' || (i_sub ->> 'vehiculo_numero_dominio') || '</td><td>AD456GN</td></tr></tbody></table>'
      || '<p>El acta firmada no se modifica: esta constancia integra el legajo y los datos corregidos se usan en adelante.</p><p>Agente de Tránsito · ' || fecha_txt || '</p>';
    docs := docs || jsonb_build_array(jsonb_build_object('id', 1001, 'uuid', gen_random_uuid()::text, 'infraccion_id', (i_sub ->> 'id')::bigint, 'tipo', 'escrito',
      'titulo', 'Constancia de subsanación', 'contenido_html', html, 'estado', 'definitivo', 'modo_edicion', 'campos', 'creado_por', 'Agente de Tránsito', 'date_created', ca - dia, 'date_updated', ca - dia));
    subs := subs || jsonb_build_array(jsonb_build_object('id', 1, 'uuid', gen_random_uuid()::text, 'infraccion_id', (i_sub ->> 'id')::bigint,
      'campos_json', jsonb_build_object('vehiculo_numero_dominio', jsonb_build_object('antes', i_sub ->> 'vehiculo_numero_dominio', 'despues', 'AD456GN'))::text,
      'motivo', 'Error de tipeo en el dominio: la cédula del vehículo presentada por la infractora dice AD456GN.', 'usuario', 'Agente de Tránsito', 'documento_id', 1001, 'date_created', ca - dia));
    hist := hist || jsonb_build_array(jsonb_build_object('id', 1003, 'infraccion_id', (i_sub ->> 'id')::bigint, 'fecha', ca - dia, 'usuario', 'Agente de Tránsito', 'accion', 'Subsanación de datos',
      'detalle', 'Dominio. Motivo: Error de tipeo en el dominio: la cédula del vehículo presentada por la infractora dice AD456GN.', 'estado_anterior', NULL, 'estado_nuevo', NULL));
  END IF;

  -- 4c. Monto ajustado por artículo: múltiplo a la mitad del catálogo en el Art. 45 de T-001010 (atenuante).
  SELECT e INTO i_aj FROM jsonb_array_elements(s -> 'infraccion') e WHERE e ->> 'legajo_numero_acta' = 'T-001010';
  SELECT multiplicador INTO mult FROM ley WHERE nombre = 'Ordenanza 261/2022' AND articulo = 'Art. 45' LIMIT 1;
  IF i_aj IS NOT NULL AND coalesce(mult, 0) > 0 THEN
    nuevo_mult := trim_scale(round(mult / 2, 2));
    ajustes := ajustes || jsonb_build_array(jsonb_build_object('id', 1, 'infraccion_id', (i_aj ->> 'id')::bigint, 'ley_clave', 'Ordenanza 261/2022 · Art. 45',
      'multiplo', nuevo_mult, 'monto_manual', NULL, 'usuario', 'Directora de Faltas', 'date_updated', ca - 2 * dia));
    hist := hist || jsonb_build_array(jsonb_build_object('id', 1004, 'infraccion_id', (i_aj ->> 'id')::bigint, 'fecha', ca - 2 * dia, 'usuario', 'Directora de Faltas', 'accion', 'Montos por artículo ajustados',
      'detalle', 'Ordenanza 261/2022 Art. 45: múltiplo ' || nuevo_mult || ' · Atenuante: primera infracción del titular', 'estado_anterior', NULL, 'estado_nuevo', NULL));
  END IF;

  s := s || jsonb_build_object('memo', memos, 'subsanacion', subs, 'causa_ley_ajuste', ajustes,
    'causa_historial', (s -> 'causa_historial') || hist, 'documento', (s -> 'documento') || docs);

  UPDATE sandbox_snapshot SET datos = s WHERE nombre = 'default';
  RAISE NOTICE 'Snapshot «default» actualizado: % memos, % subsanaciones, % ajustes', jsonb_array_length(memos), jsonb_array_length(subs), jsonb_array_length(ajustes);
END $$;

NOTIFY pgrst, 'reload schema';
