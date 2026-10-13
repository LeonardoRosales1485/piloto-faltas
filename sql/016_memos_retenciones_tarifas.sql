-- 16. Memos internos de la causa (solo personal de Faltas; no se ven en el portal).
CREATE TABLE IF NOT EXISTS memo (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  usuario VARCHAR(120) NOT NULL,
  fecha BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS memo_infraccion_idx ON memo (infraccion_id);

-- 17. Retenciones: liberación del vehículo (acarreo + estadía se calculan al liberar).
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS vehiculo_liberado_at BIGINT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS vehiculo_liberacion_json TEXT;

-- 18. Valores y tarifas como en stg (valores iniciales de stg; editables en «Valores y tarifas»).
INSERT INTO configuracion (llave, valor, publico) VALUES
  ('finanza_acarreo_camion', '79365', '1'),
  ('finanza_medio_salario', '59', '1'),
  ('finanza_estadia_auto_3a7', '28600', '1'),
  ('finanza_estadia_auto_8a30', '84915', '1'),
  ('finanza_estadia_auto_mas31_por_dia', '4220', '1'),
  ('finanza_estadia_moto_3a7', '12333', '1'),
  ('finanza_estadia_moto_8a30', '42460', '1'),
  ('finanza_estadia_moto_mas31_por_dia', '2110', '1'),
  ('finanza_estadia_camion_3a7', '42460', '1'),
  ('finanza_estadia_camion_8a30', '128480', '1'),
  ('finanza_estadia_camion_mas31_por_dia', '6345', '1')
ON CONFLICT (llave) DO NOTHING;

-- Memos en las opciones sandbox.
CREATE OR REPLACE FUNCTION sandbox_tablas() RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(t ORDER BY o), ARRAY[]::TEXT[])
  FROM unnest(ARRAY['ciudadano','lote','infraccion','infraccion_ley','infraccion_dependencia','infraccion_imagen',
                    'causa_historial','presentacion','documento','boleta','notificacion','correo_saliente','subsanacion','memo'])
       WITH ORDINALITY AS x(t, o)
  WHERE to_regclass('public.' || t) IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
