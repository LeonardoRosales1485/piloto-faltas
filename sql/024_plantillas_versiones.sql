-- Plantillas: borrador y publicación, historial de versiones, estados de origen y uso.
-- Los campos «publicados» siguen siendo los de siempre (contenido_html, estado_resultante, ...): son los que usa
-- el sistema para generar escritos. Lo que se edita queda en borrador_json hasta «Publicar cambios».

ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS estados_origen TEXT;      -- JSON con los estados desde los que se recomienda (NULL = cualquiera)
ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS borrador_json TEXT;       -- cambios sin publicar (configuración + contenido)
ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS borrador_por VARCHAR(120);
ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS borrador_at BIGINT;
ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS publicada_at BIGINT;      -- NULL = nunca se publicó (no se puede usar)
ALTER TABLE plantilla ADD COLUMN IF NOT EXISTS publicada_por VARCHAR(120);

-- tipo_acta admite varios valores separados por coma (multas,contravenciones)
ALTER TABLE plantilla ALTER COLUMN tipo_acta TYPE VARCHAR(80);

UPDATE plantilla SET publicada_at = date_created, publicada_por = 'Carga inicial' WHERE publicada_at IS NULL;

CREATE TABLE IF NOT EXISTS plantilla_version (
  id BIGSERIAL PRIMARY KEY,
  plantilla_id BIGINT NOT NULL REFERENCES plantilla(id),
  version INT NOT NULL,
  datos_json TEXT NOT NULL,        -- título, categoría, tipo de acta, contenido y reglas publicadas
  nota TEXT,                       -- qué cambió (lo escribe quien publica)
  publicada_por VARCHAR(120) NOT NULL,
  publicada_at BIGINT NOT NULL,
  UNIQUE (plantilla_id, version)
);
CREATE INDEX IF NOT EXISTS plantilla_version_plantilla_idx ON plantilla_version (plantilla_id);

-- Versión 1 de las plantillas existentes
INSERT INTO plantilla_version (plantilla_id, version, datos_json, nota, publicada_por, publicada_at)
SELECT p.id, 1, json_build_object(
    'titulo', p.titulo, 'categoria', p.categoria, 'tipo_acta', p.tipo_acta, 'contenido_html', p.contenido_html,
    'estado_resultante', p.estado_resultante, 'estados_origen', p.estados_origen,
    'requiere_revision', p.requiere_revision, 'numerable', p.numerable)::text,
  'Carga inicial', 'Carga inicial', p.date_created
FROM plantilla p
WHERE NOT EXISTS (SELECT 1 FROM plantilla_version v WHERE v.plantilla_id = p.id);

-- Uso de cada plantilla (escritos generados y último uso)
CREATE INDEX IF NOT EXISTS documento_plantilla_idx ON documento (plantilla_id);
CREATE OR REPLACE VIEW plantilla_uso AS
SELECT plantilla_id, count(*)::int AS usos, max(date_created) AS ultimo_uso
FROM documento
WHERE plantilla_id IS NOT NULL
GROUP BY plantilla_id;

-- Solo el servidor (service_role) lee estas tablas: la vista no debe quedar expuesta a la clave pública.
REVOKE ALL ON plantilla_uso FROM anon, authenticated;
REVOKE ALL ON plantilla_version FROM anon, authenticated;
GRANT ALL ON plantilla_uso, plantilla_version TO service_role;
GRANT ALL ON SEQUENCE plantilla_version_id_seq TO service_role;

NOTIFY pgrst, 'reload schema';
