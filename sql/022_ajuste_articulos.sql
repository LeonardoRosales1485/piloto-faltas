-- Montos por artículo en cada causa (como «Artículos» de stg): múltiplo propio y/o subtotal manual.
-- No toca el catálogo de leyes ni el acta firmada; la valorización usa estos valores si existen.
CREATE TABLE IF NOT EXISTS causa_ley_ajuste (
  id BIGSERIAL PRIMARY KEY,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  ley_clave VARCHAR(300) NOT NULL,
  multiplo NUMERIC(12,2) CHECK (multiplo IS NULL OR multiplo >= 0),
  monto_manual NUMERIC(14,2) CHECK (monto_manual IS NULL OR monto_manual >= 0),
  usuario VARCHAR(120) NOT NULL,
  date_updated BIGINT NOT NULL,
  UNIQUE (infraccion_id, ley_clave)
);

-- Entra en las opciones sandbox (borrar / guardar / cargar datos dummy).
CREATE OR REPLACE FUNCTION sandbox_tablas() RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(t ORDER BY o), ARRAY[]::TEXT[])
  FROM unnest(ARRAY['ciudadano','lote','infraccion','infraccion_ley','infraccion_dependencia','infraccion_imagen',
                    'causa_historial','presentacion','documento','boleta','notificacion','correo_saliente','subsanacion','memo',
                    'causa_ley_ajuste'])
       WITH ORDINALITY AS x(t, o)
  WHERE to_regclass('public.' || t) IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
