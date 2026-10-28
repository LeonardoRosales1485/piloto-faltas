-- Actas migradas: actas labradas antes de este sistema (solo para la base de «piloto-faltas-post»).
-- Son solo el acta (datos para buscarla + el escaneo). No son causas: no tienen número nuevo, estados, bandejas,
-- boletas, plazos ni portal. «Restablecer piloto» no las borra. Se puede correr más de una vez.

CREATE TABLE IF NOT EXISTS acta_migrada (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  infraccion_tipo_id INT NOT NULL CHECK (infraccion_tipo_id IN (1, 2, 3)),  -- 1 tránsito, 2 contravenciones, 3 sustancias
  numero_acta VARCHAR(40) NOT NULL,          -- número del sistema anterior, tal cual
  fecha DATE,                                -- fecha del labrado
  legajo VARCHAR(40),
  infractor_nombre VARCHAR(200),
  infractor_documento VARCHAR(20),           -- DNI o CUIT, solo dígitos
  dominio VARCHAR(12),
  articulos TEXT,
  lugar VARCHAR(250),
  inspector VARCHAR(120),
  observaciones TEXT,
  archivo_nombre VARCHAR(200),
  archivo_raw TEXT,                          -- escaneo del acta (data URL); no se reemplaza una vez cargado
  lote VARCHAR(40),                          -- importación masiva de la que vino (vacío = carga manual)
  cargado_por VARCHAR(120) NOT NULL,
  cargado_at BIGINT NOT NULL,
  correcciones_json TEXT NOT NULL DEFAULT '[]', -- [{fecha, usuario, campos: {campo: {antes, despues}}}]
  CONSTRAINT acta_migrada_numero_unico UNIQUE (infraccion_tipo_id, numero_acta)
);
CREATE INDEX IF NOT EXISTS acta_migrada_documento_idx ON acta_migrada (infractor_documento);
CREATE INDEX IF NOT EXISTS acta_migrada_dominio_idx ON acta_migrada (dominio);
CREATE INDEX IF NOT EXISTS acta_migrada_fecha_idx ON acta_migrada (fecha);

ALTER TABLE acta_migrada ENABLE ROW LEVEL SECURITY;  -- solo el servidor (service role) la lee y la escribe

NOTIFY pgrst, 'reload schema';
