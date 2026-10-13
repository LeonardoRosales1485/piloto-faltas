-- Sandbox: usar solo las tablas que existen en la base (si falta correr alguna migración, «Borrar todo» no falla).
CREATE OR REPLACE FUNCTION sandbox_tablas() RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(t ORDER BY o), ARRAY[]::TEXT[])
  FROM unnest(ARRAY['ciudadano','lote','infraccion','infraccion_ley','infraccion_dependencia','infraccion_imagen',
                    'causa_historial','presentacion','documento','boleta','notificacion','correo_saliente','subsanacion','memo'])
       WITH ORDINALITY AS x(t, o)
  WHERE to_regclass('public.' || t) IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
