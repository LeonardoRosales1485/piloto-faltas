-- Minuta 20/10/2026, fase 4. Correr después de 031. Se puede correr más de una vez.

-- 1. Recursos (apelaciones) elevados al Juzgado de Paz u otra instancia, con su seguimiento y la sentencia.
CREATE TABLE IF NOT EXISTS recurso (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL DEFAULT 'apelacion',
  instancia VARCHAR(120) NOT NULL,
  expediente VARCHAR(80),
  fecha_elevacion BIGINT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'elevado' CHECK (estado IN ('elevado', 'en_tramite', 'resuelto')),
  resultado VARCHAR(40),
  monto_ordenado NUMERIC(14, 2),
  sentencia_documento_id BIGINT REFERENCES documento(id) ON DELETE SET NULL,
  movimientos_json TEXT NOT NULL DEFAULT '[]',
  creado_por VARCHAR(120),
  date_created BIGINT NOT NULL,
  resuelto_at BIGINT
);
CREATE INDEX IF NOT EXISTS recurso_infraccion_idx ON recurso (infraccion_id);

-- 2. Trazabilidad de la firma: quién y cuándo generó el código de verificación (para recalcularlo y verificarlo).
ALTER TABLE documento ADD COLUMN IF NOT EXISTS hash_por VARCHAR(120);
ALTER TABLE documento ADD COLUMN IF NOT EXISTS hash_at BIGINT;

-- 3. Fecha de acreditación de los pagos (informe mensual para el Tribunal de Cuentas). Las ya acreditadas toman la de pago.
ALTER TABLE boleta ADD COLUMN IF NOT EXISTS acreditado_at BIGINT;
UPDATE boleta SET acreditado_at = pagado_at WHERE estado = 'definitiva' AND acreditado_at IS NULL;

-- 4. Límites de los adjuntos (descargos, presentaciones y comprobantes). PROVISORIOS hasta que la Dirección los defina.
INSERT INTO configuracion (llave, valor, publico) VALUES
  ('adjuntos_max_mb', '3', '1'),
  ('adjuntos_max_archivos', '8', '1'),
  ('adjuntos_max_fojas', '30', '1')
ON CONFLICT (llave) DO NOTHING;

-- 5. Los recursos entran en las opciones sandbox (borrar / guardar / cargar datos dummy / restablecer).
CREATE OR REPLACE FUNCTION sandbox_tablas() RETURNS TEXT[] LANGUAGE sql STABLE AS $$
  SELECT coalesce(array_agg(t ORDER BY o), ARRAY[]::TEXT[])
  FROM unnest(ARRAY['ciudadano','lote','infraccion','infraccion_ley','infraccion_dependencia','infraccion_imagen',
                    'causa_historial','presentacion','documento','boleta','notificacion','correo_saliente','subsanacion','memo',
                    'causa_ley_ajuste','recurso'])
       WITH ORDINALITY AS x(t, o)
  WHERE to_regclass('public.' || t) IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
