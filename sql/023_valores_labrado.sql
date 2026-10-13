-- Valores del momento del labrado: UF y múltiplo de cada artículo quedan fijos en la causa.
-- Si después cambian en «Valores y tarifas» u «Ordenanzas», la causa no cambia sola: la Dirección decide
-- actualizarla con el botón «Actualizar a valores vigentes».
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS valores_labrado_json TEXT;

-- Causas ya firmadas: se fijan con los valores actuales (los que venían usando hasta ahora).
UPDATE infraccion i SET valores_labrado_json = json_build_object(
  'uf', (SELECT valor::numeric FROM configuracion WHERE llave = 'finanza_unidad_fija'),
  'fecha', (extract(epoch FROM now()) * 1000)::bigint,
  'leyes', coalesce((
    SELECT json_object_agg(l.nombre || CASE WHEN coalesce(l.articulo, '') <> '' THEN ' · ' || l.articulo ELSE '' END, l.multiplicador)
    FROM infraccion_ley il
    JOIN ley l ON il.ley_nombre = l.nombre || ' · ' || l.articulo OR il.ley_nombre = l.nombre
    WHERE il.infraccion_id = i.id
  ), '{}'::json)
)::text
WHERE i.valores_labrado_json IS NULL AND i.estado_faltas <> 'Borrador';

NOTIFY pgrst, 'reload schema';
