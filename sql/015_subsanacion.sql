-- Subsanación de datos del acta (una por causa). El acta original (infraccion) no se modifica:
-- las correcciones se guardan acá como {campo: {antes, despues}} y se aplican al «dato vigente».
CREATE TABLE IF NOT EXISTS subsanacion (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL UNIQUE REFERENCES infraccion(id) ON DELETE CASCADE,
  campos_json TEXT NOT NULL,
  motivo TEXT NOT NULL,
  usuario VARCHAR(120) NOT NULL,
  documento_id BIGINT,
  date_created BIGINT NOT NULL
);

-- La subsanación entra en las opciones sandbox (borrar / guardar / cargar datos dummy).
CREATE OR REPLACE FUNCTION sandbox_tablas() RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(t ORDER BY o), ARRAY[]::TEXT[])
  FROM unnest(ARRAY['ciudadano','lote','infraccion','infraccion_ley','infraccion_dependencia','infraccion_imagen',
                    'causa_historial','presentacion','documento','boleta','notificacion','correo_saliente','subsanacion','memo'])
       WITH ORDINALITY AS x(t, o)
  WHERE to_regclass('public.' || t) IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
