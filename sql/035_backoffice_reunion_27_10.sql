-- Reunión de validación del 27/10/2026: back office. Solo para la base de «piloto-faltas-post».
-- Correr después de 034. Se puede correr más de una vez.

-- 1. Subsanaciones sucesivas (por ejemplo, transferencias del vehículo): varias por causa, con historial.
ALTER TABLE subsanacion DROP CONSTRAINT IF EXISTS subsanacion_infraccion_id_key;
CREATE INDEX IF NOT EXISTS subsanacion_infraccion_idx ON subsanacion (infraccion_id);

-- 2. Responsable de la causa: el último usuario que trabajó en ella, salvo que se asigne fijo.
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS responsable VARCHAR(120);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS responsable_fijo INT NOT NULL DEFAULT 0;

-- 3. Membretes por tipo de documento (Configuración → Membretes).
CREATE TABLE IF NOT EXISTS membrete (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  categorias TEXT NOT NULL DEFAULT '',      -- categorías de escrito separadas por coma; vacío = por defecto
  imagen_raw TEXT,                          -- logo (data URL); vacío = logo del municipio
  titulo VARCHAR(200) NOT NULL DEFAULT 'MUNICIPALIDAD DE MALVINAS ARGENTINAS',
  subtitulo VARCHAR(200) NOT NULL DEFAULT 'DIRECCIÓN DE FALTAS',
  activo INT NOT NULL DEFAULT 1,
  date_updated BIGINT
);

-- 4. Estado «Nota apremios»: la nota de Apremios firmada deja la causa lista para exportar y remitir.
UPDATE plantilla SET estado_resultante = 'Nota apremios' WHERE codigo LIKE 'NOTA_APREMIOS%' AND estado_resultante = 'En Apremios';

-- 5. Fallos en unidades fijas (UF), sin importe en pesos: se actualiza solo con el valor vigente de la UF.
UPDATE plantilla
SET contenido_html = replace(contenido_html, 'al pago de una multa de [Causa:Monto] ([Causa:Unidades] unidades fijas)',
                             'al pago de una multa de [Causa:Unidades] unidades fijas (UF), a liquidar al valor vigente de la UF a la fecha de pago')
WHERE codigo = 'FALLO_CONDENATORIO' AND contenido_html LIKE '%[Causa:Monto] ([Causa:Unidades] unidades fijas)%';
-- Nueva versión publicada de las plantillas cambiadas.
INSERT INTO plantilla_version (plantilla_id, version, datos_json, nota, publicada_por, publicada_at)
SELECT p.id, coalesce((SELECT max(v.version) FROM plantilla_version v WHERE v.plantilla_id = p.id), 0) + 1,
  json_build_object('titulo', p.titulo, 'categoria', p.categoria, 'tipo_acta', p.tipo_acta, 'contenido_html', p.contenido_html,
    'estado_resultante', p.estado_resultante, 'estados_origen', p.estados_origen, 'requiere_revision', p.requiere_revision,
    'numerable', p.numerable)::text,
  'Reunión 27/10: fallo en UF / estado «Nota apremios»', 'Sistema', (extract(epoch from now()) * 1000)::bigint
FROM plantilla p
WHERE (p.codigo = 'FALLO_CONDENATORIO' OR p.codigo LIKE 'NOTA_APREMIOS%')
  AND NOT EXISTS (SELECT 1 FROM plantilla_version v WHERE v.plantilla_id = p.id AND v.nota LIKE 'Reunión 27/10%');

-- 6. «Restablecer piloto» vuelve a este estado de configuración (con 034 y 035 incluidos: plantillas, plazos,
--    alcoholímetros, artículos con foto obligatoria). Solo toma tablas de configuración, no causas ni usuarios.
SELECT sandbox_capturar_origen();

NOTIFY pgrst, 'reload schema';
