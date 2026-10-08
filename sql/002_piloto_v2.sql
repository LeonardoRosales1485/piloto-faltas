-- =============================================================================
-- Sistema de Faltas · Piloto v2
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de init.sql. Es idempotente.
-- Agrega: numeración T/C/S, causa con estados del Anexo I, historial, documentos
-- y escritos, plantillas, portal de infractores, presentaciones, boletas,
-- notificaciones, lotes, feriados, correo simulado y usuarios de prueba.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Acta / causa: columnas nuevas en infraccion
-- ---------------------------------------------------------------------------
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS estado_faltas VARCHAR(60) DEFAULT 'Borrador';
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS situacion_infractor VARCHAR(20) DEFAULT 'presente'; -- presente | ausente | se_niega | nn
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS infractor_cuit VARCHAR(20);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS infractor_razon_social VARCHAR(255);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS infractor_email VARCHAR(180);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS infractor_calle_altura VARCHAR(40);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS entre_calle_1 VARCHAR(180);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS entre_calle_2 VARCHAR(180);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10,6);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(10,6);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS ejido VARCHAR(10); -- dentro | fuera
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS nomenclatura_catastral VARCHAR(120);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS acarreo INT DEFAULT 0;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS medidas_preventivas TEXT; -- JSON array de strings
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS medida_vigente INT DEFAULT 0;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS sustancias_descripcion TEXT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS inspector_username VARCHAR(80);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS inspector_nombre VARCHAR(200);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS firma_infractor TEXT; -- dataURL PNG
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS firma_inspector_hash VARCHAR(80);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS firmada_at BIGINT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS anulada_motivo TEXT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS notificada_at BIGINT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS vence_plazo_at BIGINT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS visible_portal INT DEFAULT 1;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS monto_estimado NUMERIC(14,2);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS monto_ajustado NUMERIC(14,2);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS monto_ajuste_motivo TEXT;
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS estadia_ingreso_at BIGINT;

-- Las actas existentes del seed pasan a causas en curso.
UPDATE infraccion SET estado_faltas = 'Iniciado', firmada_at = date_created
WHERE firmada_at IS NULL AND inspector_username IS NULL AND COALESCE(estado_faltas, 'Borrador') = 'Borrador';

CREATE INDEX IF NOT EXISTS idx_infraccion_estado_faltas ON infraccion(estado_faltas);
CREATE INDEX IF NOT EXISTS idx_infraccion_doc ON infraccion(infractor_documento_numero);

-- ---------------------------------------------------------------------------
-- 2. Numeración: series T, C, S y legajo común (P-02, P-21)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS talonario (
  serie VARCHAR(10) PRIMARY KEY,
  ultimo INT NOT NULL DEFAULT 0
);
INSERT INTO talonario (serie, ultimo) VALUES ('T', 1012), ('C', 2005), ('S', 0), ('LEG', 2005)
ON CONFLICT (serie) DO NOTHING;

CREATE OR REPLACE FUNCTION reservar_numero(p_serie TEXT) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  INSERT INTO talonario (serie, ultimo) VALUES (p_serie, 0) ON CONFLICT (serie) DO NOTHING;
  UPDATE talonario SET ultimo = ultimo + 1 WHERE serie = p_serie RETURNING ultimo INTO n;
  RETURN n;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Historial de la causa (trazabilidad)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS causa_historial (
  id BIGSERIAL PRIMARY KEY,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  fecha BIGINT NOT NULL,
  usuario VARCHAR(120),
  accion VARCHAR(80) NOT NULL,
  estado_anterior VARCHAR(60),
  estado_nuevo VARCHAR(60),
  detalle TEXT
);
CREATE INDEX IF NOT EXISTS idx_hist_infraccion ON causa_historial(infraccion_id);

-- ---------------------------------------------------------------------------
-- 4. Plantillas de escritos y documentos del legajo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plantilla (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  titulo VARCHAR(200) NOT NULL,
  categoria VARCHAR(60) NOT NULL DEFAULT 'General', -- Notificación, Resolución, Fallo, Pago, Nota, Disposición
  tipo_acta VARCHAR(40) NOT NULL DEFAULT 'todas', -- todas | multas | contravenciones | sustancias
  contenido_html TEXT NOT NULL,
  estado_resultante VARCHAR(60), -- estado al que pasa la causa al quedar definitivo
  requiere_revision INT NOT NULL DEFAULT 1,
  numerable INT NOT NULL DEFAULT 0, -- resoluciones y fallos llevan número y fecha
  activa INT NOT NULL DEFAULT 1,
  date_created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS documento (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL, -- escrito | adjunto | acuse | boleta
  plantilla_id BIGINT REFERENCES plantilla(id),
  presentacion_id BIGINT,
  titulo VARCHAR(255) NOT NULL,
  contenido_html TEXT,
  archivo_nombre VARCHAR(255),
  archivo_raw TEXT, -- dataURL
  estado VARCHAR(30) NOT NULL DEFAULT 'borrador', -- borrador | en_revision | devuelto | firmado | definitivo
  observacion TEXT,
  numero VARCHAR(40),
  fecha_numero BIGINT,
  hash VARCHAR(80),
  firmado_por VARCHAR(200),
  firmado_at BIGINT,
  creado_por VARCHAR(120),
  date_created BIGINT NOT NULL,
  date_updated BIGINT
);
CREATE INDEX IF NOT EXISTS idx_documento_infraccion ON documento(infraccion_id);
CREATE INDEX IF NOT EXISTS idx_documento_estado ON documento(estado);

-- ---------------------------------------------------------------------------
-- 5. Portal de infractores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciudadano (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  tipo_persona VARCHAR(10) NOT NULL DEFAULT 'fisica', -- fisica | juridica
  nombre VARCHAR(120),
  apellido VARCHAR(120),
  documento_tipo VARCHAR(20),
  documento_numero VARCHAR(30),
  razon_social VARCHAR(255),
  tipo_societario VARCHAR(60),
  cuit VARCHAR(20),
  email VARCHAR(180) NOT NULL UNIQUE,
  telefono VARCHAR(40),
  domicilio VARCHAR(255),
  localidad VARCHAR(120),
  password_hash VARCHAR(120) NOT NULL,
  email_verificado INT NOT NULL DEFAULT 0,
  codigo_verificacion VARCHAR(10),
  domicilio_electronico INT NOT NULL DEFAULT 0,
  ddjj_at BIGINT,
  date_created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS presentacion (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  ciudadano_id BIGINT REFERENCES ciudadano(id),
  origen VARCHAR(20) NOT NULL DEFAULT 'portal', -- portal | mesa
  tipo VARCHAR(30) NOT NULL, -- pago_voluntario | boleta | cuotas | descargo | apelacion
  texto TEXT,
  cuotas_solicitadas INT,
  cuotas_otorgadas INT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | aceptada | rechazada | observada | reenviada
  respuesta TEXT,
  reenvio_de BIGINT,
  resuelta_por VARCHAR(120),
  resuelta_at BIGINT,
  date_created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_presentacion_estado ON presentacion(estado);

-- ---------------------------------------------------------------------------
-- 6. Boletas y pagos (Malvinas 2000 simulado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boleta (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  numero VARCHAR(40) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  detalle_json TEXT,
  monto NUMERIC(14,2) NOT NULL,
  vencimiento BIGINT,
  cuota_nro INT,
  total_cuotas INT,
  a_nombre_de VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'emitida', -- emitida | a_verificar | definitiva | vencida | anulada
  pagado_at BIGINT,
  confirmado_por VARCHAR(120),
  date_created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boleta_infraccion ON boleta(infraccion_id);

-- ---------------------------------------------------------------------------
-- 7. Notificaciones, lotes (Blue Mail / notificador / SUGIT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lote (
  id BIGSERIAL PRIMARY KEY,
  numero VARCHAR(40) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- bluemail | notificador | sugit
  cantidad INT NOT NULL DEFAULT 0,
  creado_por VARCHAR(120),
  date_created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS notificacion (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  documento_id BIGINT REFERENCES documento(id),
  objeto VARCHAR(20) NOT NULL DEFAULT 'acta', -- acta | resolucion | fallo | disposicion
  via VARCHAR(20) NOT NULL, -- portal | electronica | cedula | mesa
  lote_id BIGINT REFERENCES lote(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente | en_lote | positiva | negativa
  resultado_motivo VARCHAR(255),
  fecha_resultado BIGINT,
  acuse_raw TEXT,
  registrado_por VARCHAR(120),
  date_created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_infraccion ON notificacion(infraccion_id);

-- ---------------------------------------------------------------------------
-- 8. Feriados (motor de plazos en días hábiles) y correo simulado
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feriado (
  fecha DATE PRIMARY KEY,
  descripcion VARCHAR(120)
);
INSERT INTO feriado (fecha, descripcion) VALUES
  ('2026-01-01','Año Nuevo'),('2026-02-16','Carnaval'),('2026-02-17','Carnaval'),
  ('2026-03-24','Día de la Memoria'),('2026-04-02','Malvinas'),('2026-04-03','Viernes Santo'),
  ('2026-05-01','Día del Trabajador'),('2026-05-25','Revolución de Mayo'),('2026-06-15','Güemes'),
  ('2026-06-20','Día de la Bandera'),('2026-07-09','Independencia'),('2026-08-17','San Martín'),
  ('2026-10-12','Diversidad Cultural'),('2026-11-23','Soberanía Nacional'),('2026-12-08','Inmaculada Concepción'),
  ('2026-12-25','Navidad'),('2027-01-01','Año Nuevo')
ON CONFLICT (fecha) DO NOTHING;

CREATE TABLE IF NOT EXISTS correo_saliente (
  id BIGSERIAL PRIMARY KEY,
  para VARCHAR(180) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  infraccion_id BIGINT,
  date_created BIGINT NOT NULL
);

-- ---------------------------------------------------------------------------
-- 9. Catálogos y configuración nuevos
-- ---------------------------------------------------------------------------
INSERT INTO catalogo (tipo, nombre)
SELECT v.tipo, v.nombre FROM (VALUES
  ('documento', 'CUIT'),
  ('medida_contravencion', 'Clausura preventiva'),
  ('medida_contravencion', 'Secuestro de mercadería'),
  ('medida_contravencion', 'Paralización de obra'),
  ('medida_contravencion', 'Decomiso'),
  ('tipo_societario', 'S.A.'),('tipo_societario', 'S.R.L.'),('tipo_societario', 'S.A.S.'),
  ('tipo_societario', 'Cooperativa'),('tipo_societario', 'Otra'),
  ('motivo_archivo', 'Archivo por pago'),('motivo_archivo', 'Archivo absolución'),
  ('motivo_archivo', 'Archivo nulidad'),('motivo_archivo', 'Archivo por Art. 5'),
  ('motivo_archivo', 'Archivo por Doc. (falta de mérito)'),('motivo_archivo', 'Archivo solicitud del área'),
  ('motivo_archivo', 'Archivo prescripción'),('motivo_archivo', 'Archivo Ley 14.547'),
  ('motivo_archivo', 'Archivado'),('motivo_archivo', 'Archivo judicial'),
  ('motivo_acuse', 'Entregada al destinatario'),('motivo_acuse', 'Entregada a tercero'),
  ('motivo_acuse', 'Domicilio inexistente'),('motivo_acuse', 'Se mudó'),
  ('motivo_acuse', 'Rechazada'),('motivo_acuse', 'Ausente reiterado')
) AS v(tipo, nombre)
WHERE NOT EXISTS (SELECT 1 FROM catalogo c WHERE c.tipo = v.tipo AND c.nombre = v.nombre);

ALTER TABLE configuracion ALTER COLUMN valor TYPE TEXT;

INSERT INTO configuracion (llave, valor, publico) VALUES
  ('finanza_derecho_oficina', '5000', '1'),
  ('finanza_estadia_diaria', '8000', '1'),
  ('plazo_pago_voluntario_dias', '30', '1'),
  ('plazo_contravencion_dias', '15', '1'),
  ('plazo_post_fallo_habiles', '5', '1'),
  ('descuento_pago_voluntario', '50', '1'),
  ('portal_contacto', 'Dirección de Faltas · Av. Pte. Perón 4000, Los Polvorines · Lunes a viernes de 8 a 13 h · faltas@malvinasargentinas.gob.ar', '1')
ON CONFLICT (llave) DO NOTHING;

-- Textos del portal (editables por Faltas). Valores largos: se guardan aparte.
CREATE TABLE IF NOT EXISTS texto_portal (
  llave VARCHAR(80) PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  texto TEXT NOT NULL
);
INSERT INTO texto_portal (llave, titulo, texto) VALUES
  ('aviso_notificacion', 'Aviso antes de ver el acta', 'Al abrir el acta usted quedará notificado/a en este momento. Desde hoy empiezan a correr los plazos para pagar o presentar su descargo. [Texto de ejemplo, editable por la Dirección de Faltas]'),
  ('advertencia_pago_voluntario', 'Advertencia de pago voluntario (tránsito)', 'Si solicita el pago voluntario con el 50 % de descuento, ya no podrá presentar descargo por esta acta. [Texto de ejemplo, editable por la Dirección de Faltas]'),
  ('advertencia_descargo_transito', 'Advertencia de descargo (tránsito)', 'Si presenta descargo, ya no podrá acceder al pago voluntario con descuento. [Texto de ejemplo, editable por la Dirección de Faltas]'),
  ('advertencia_cuotas', 'Advertencia de plan de cuotas', 'El plan de cuotas no incluye el descuento del pago voluntario. Si deja de pagar una cuota, la causa continúa el procedimiento. [Texto de ejemplo, editable por la Dirección de Faltas]'),
  ('ddjj_domicilio', 'Declaración jurada de domicilio electrónico', 'Declaro bajo juramento que constituyo como domicilio electrónico la casilla de correo indicada, donde se tendrán por válidas todas las notificaciones que me curse la Dirección de Faltas de la Municipalidad de Malvinas Argentinas. [Texto de ejemplo, editable por la Dirección de Faltas]'),
  ('formulario_descargo', 'Formulario modelo de descargo', 'Sr./Sra. Director/a de Faltas: Quien suscribe, [nombre y apellido], DNI [número], con domicilio en [domicilio], en relación al Acta N.° [número], vengo a presentar descargo en los siguientes términos: [exponga los hechos]. Ofrezco como prueba: [detalle]. Sin otro particular, saludo atentamente. [Texto de ejemplo, editable por la Dirección de Faltas]')
ON CONFLICT (llave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. Usuarios de prueba por rol
--     Roles: Administrador · Usuario (agente) · Inspector · Directora · Tributario · Becario
-- ---------------------------------------------------------------------------
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'directora', '$2b$10$0tPCjJxIqJGoPBN3Y/l9Luw/XUc4wCjObbWDicWwlIlLzNBQwuaia',
  'Directora', 'de Faltas', 'directora@municipalidad.gob.ar', 'Dirección de Faltas', 'Directora',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'directora');

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'tributario', '$2b$10$43fA2OzM6zjwyGmToHcFCuos4if7CgOTRPm5wZQtDDJC4Gfo7hMmy',
  'Usuario', 'Tributario', 'tributario@municipalidad.gob.ar', 'Rentas', 'Tributario',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'tributario');

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'becario', '$2b$10$dmXTRNZ4EYBqhnHZdRk8peM0dZuQVsdxEKsgT/GE8.wG.M1kwkWaK',
  'Becario', 'Faltas', 'becario@municipalidad.gob.ar', 'Dirección de Faltas', 'Becario',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'becario');

-- El operador existente actúa como agente de Faltas.
UPDATE usuario SET sector = 'Dirección de Faltas' WHERE username = 'operador';

-- Ciudadano de prueba para el portal (clave: ciudadano123)
INSERT INTO ciudadano (uuid, tipo_persona, nombre, apellido, documento_tipo, documento_numero, email, password_hash, email_verificado, date_created)
SELECT gen_random_uuid()::text, 'fisica', 'Valeria', 'Suárez', 'DNI', '30111222', 'valeria@example.com',
  '$2b$10$7g54B8AzCgcMqnPecVOzduHMVYOJtiA01lMHr2dcN1Fnmd44UvDim', 1, (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM ciudadano WHERE email = 'valeria@example.com');

-- Permisos para la clave service_role (Supabase ya los otorga; se repite por las dudas).
DO $$ BEGIN
  EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role';
  EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION reservar_numero(TEXT) TO service_role';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
