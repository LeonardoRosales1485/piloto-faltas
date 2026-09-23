-- Run once in Supabase SQL editor (safe to re-run: idempotent schema + seeds).
-- Do not enable RLS on these tables for client-facing access.

CREATE TABLE IF NOT EXISTS usuario (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(120) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  apellido VARCHAR(120) NOT NULL,
  email VARCHAR(180),
  sector VARCHAR(180),
  rol VARCHAR(40) NOT NULL,
  date_created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogo (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(60) NOT NULL,
  nombre VARCHAR(180) NOT NULL
);

CREATE TABLE IF NOT EXISTS ley (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  articulo VARCHAR(80) NOT NULL,
  descripcion TEXT,
  categoria_nombre VARCHAR(120),
  multiplicador NUMERIC(12,2) NOT NULL DEFAULT 1,
  infraccion_tipo_id INT NOT NULL,
  infraccion_tipo_nombre VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS infraccion (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  infraccion_tipo_id INT NOT NULL,
  infraccion_tipo_nombre VARCHAR(40) NOT NULL,
  legajo_number VARCHAR(40),
  legajo_anio VARCHAR(8),
  legajo_caratula VARCHAR(255),
  legajo_numero_acta VARCHAR(40),
  legajo_fecha VARCHAR(40),
  legajo_observada INT DEFAULT 0,
  infractor_nombre VARCHAR(255),
  infractor_persona_tipo INT DEFAULT 0,
  infractor_documento_tipo_nombre VARCHAR(40),
  infractor_documento_numero VARCHAR(40),
  domicilio_infraccion_localidad_nombre VARCHAR(120),
  infractor_domicilio VARCHAR(255),
  infractor_departamento VARCHAR(80),
  infractor_provincia_nombre VARCHAR(80),
  infractor_localidad_nombre VARCHAR(120),
  infractor_partido_nombre VARCHAR(120),
  infractor_fecha_nacimiento VARCHAR(40),
  infractor_codigo_postal VARCHAR(20),
  infractor_actividad_economica VARCHAR(180),
  vehiculo_numero_dominio VARCHAR(40),
  vehiculo_numero_control_interno VARCHAR(40),
  vehiculo_numero_licencia VARCHAR(40),
  vehiculo_tipo_nombre VARCHAR(80),
  vehiculo_municipalidad_emisora VARCHAR(120),
  domicilio_infraccion_calle VARCHAR(180),
  domicilio_infraccion_numero VARCHAR(40),
  observaciones TEXT,
  retencion_de_licencia INT DEFAULT 0,
  retencion_de_vehiculo INT DEFAULT 0,
  estado VARCHAR(40) DEFAULT 'Activo',
  metadata_json TEXT,
  date_created BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS infraccion_ley (
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  ley_nombre VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS infraccion_dependencia (
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  dependencia_nombre VARCHAR(180) NOT NULL
);

CREATE TABLE IF NOT EXISTS infraccion_imagen (
  id BIGSERIAL PRIMARY KEY,
  uuid VARCHAR(64) NOT NULL UNIQUE,
  status INT DEFAULT 1,
  date_created BIGINT NOT NULL,
  infraccion_id BIGINT NOT NULL REFERENCES infraccion(id) ON DELETE CASCADE,
  preview_key VARCHAR(255),
  full_key VARCHAR(255),
  preview_raw TEXT,
  full_raw TEXT
);

CREATE TABLE IF NOT EXISTS configuracion (
  id BIGSERIAL PRIMARY KEY,
  llave VARCHAR(120) NOT NULL UNIQUE,
  valor VARCHAR(120) NOT NULL,
  publico VARCHAR(8) NOT NULL DEFAULT '1'
);

CREATE INDEX IF NOT EXISTS idx_infraccion_tipo ON infraccion(infraccion_tipo_id);
CREATE INDEX IF NOT EXISTS idx_infraccion_acta ON infraccion(legajo_numero_acta);
CREATE INDEX IF NOT EXISTS idx_infraccion_patente ON infraccion(vehiculo_numero_dominio);

-- ---------------------------------------------------------------------------
-- Seed: usuarios
-- ---------------------------------------------------------------------------

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'admin', '$2b$10$2qgGci3ApJIExW0hFJQC6e/ZTkspjzCay8ecByy5CcTBhn5KsNNfO',
  'Administrador', 'Sistema', 'admin@municipalidad.gob.ar', 'Administración General', 'Administrador',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'admin');

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'operador', '$2b$10$pyyUQz7vDwyQzwTbGGJf0.wenWWlLSABOsFhVynUVWwyX.9CUQOcW',
  'Operador', 'Mesa', 'operador@municipalidad.gob.ar', 'Mesa de Entradas', 'Usuario',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'operador');

INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'inspector', '$2b$10$Ewfpm9mJX4nTLRgA4Bnime4FgVhOfrRSEVHhe1Xi7us2kMcrIs6Gu',
  'Inspector', 'Vial', 'inspector@municipalidad.gob.ar', 'Inspección de Tránsito', 'Inspector',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'inspector');

-- ---------------------------------------------------------------------------
-- Seed: catalogos
-- ---------------------------------------------------------------------------

INSERT INTO catalogo (tipo, nombre)
SELECT v.tipo, v.nombre
FROM (VALUES
  ('documento', 'DNI'),
  ('documento', 'LC'),
  ('documento', 'LE'),
  ('documento', 'Pasaporte'),
  ('provincia', 'Buenos Aires'),
  ('localidad', 'Malvinas Argentinas'),
  ('localidad', 'Ingeniero Pablo Nogués'),
  ('localidad', 'Tortuguitas'),
  ('localidad', 'Los Polvorines'),
  ('localidad', 'Villa de Mayo'),
  ('partido', 'Malvinas Argentinas'),
  ('partido', 'Tigre'),
  ('partido', 'General San Martín'),
  ('partido', 'San Isidro'),
  ('vehiculo', 'Automóvil'),
  ('vehiculo', 'Motocicleta'),
  ('vehiculo', 'Camión'),
  ('vehiculo', 'Camioneta'),
  ('vehiculo', 'Colectivo'),
  ('dependencia', 'Juzgado de Faltas'),
  ('dependencia', 'Dirección de Tránsito'),
  ('dependencia', 'Inspecciones Generales'),
  ('dependencia', 'Seguridad Ciudadana'),
  ('estado', 'Activo'),
  ('estado', 'Pendiente'),
  ('estado', 'Cerrado'),
  ('ley_categoria', 'Velocidad'),
  ('ley_categoria', 'Estacionamiento'),
  ('ley_categoria', 'Documentación'),
  ('ley_categoria', 'Estado Mecánico'),
  ('ley_categoria', 'Luces'),
  ('ley_categoria', 'Semáforos')
) AS v(tipo, nombre)
WHERE NOT EXISTS (
  SELECT 1 FROM catalogo c WHERE c.tipo = v.tipo AND c.nombre = v.nombre
);

-- ---------------------------------------------------------------------------
-- Seed: leyes
-- ---------------------------------------------------------------------------

INSERT INTO ley (uuid, nombre, articulo, descripcion, categoria_nombre, multiplicador, infraccion_tipo_id, infraccion_tipo_nombre)
SELECT gen_random_uuid()::text, 'Ordenanza 261/2022', 'Art. 45', 'Exceder la velocidad máxima', 'Velocidad', 20, 1, 'multas'
WHERE NOT EXISTS (SELECT 1 FROM ley WHERE nombre = 'Ordenanza 261/2022' AND articulo = 'Art. 45');

INSERT INTO ley (uuid, nombre, articulo, descripcion, categoria_nombre, multiplicador, infraccion_tipo_id, infraccion_tipo_nombre)
SELECT gen_random_uuid()::text, 'Ordenanza 261/2022', 'Art. 46', 'Estacionar en lugares prohibidos', 'Estacionamiento', 10, 1, 'multas'
WHERE NOT EXISTS (SELECT 1 FROM ley WHERE nombre = 'Ordenanza 261/2022' AND articulo = 'Art. 46');

INSERT INTO ley (uuid, nombre, articulo, descripcion, categoria_nombre, multiplicador, infraccion_tipo_id, infraccion_tipo_nombre)
SELECT gen_random_uuid()::text, 'Ordenanza 189/2021', 'Art. 12', 'Circular sin licencia vigente', 'Documentación', 15, 1, 'multas'
WHERE NOT EXISTS (SELECT 1 FROM ley WHERE nombre = 'Ordenanza 189/2021' AND articulo = 'Art. 12');

INSERT INTO ley (uuid, nombre, articulo, descripcion, categoria_nombre, multiplicador, infraccion_tipo_id, infraccion_tipo_nombre)
SELECT gen_random_uuid()::text, 'Ordenanza 45/2019', 'Art. 3', 'Ruidos molestos en horario nocturno', 'Ruidos', 8, 2, 'contravenciones'
WHERE NOT EXISTS (SELECT 1 FROM ley WHERE nombre = 'Ordenanza 45/2019' AND articulo = 'Art. 3');

-- ---------------------------------------------------------------------------
-- Seed: configuracion
-- ---------------------------------------------------------------------------

INSERT INTO configuracion (llave, valor, publico)
VALUES ('finanza_unidad_fija', '2000', '1')
ON CONFLICT (llave) DO NOTHING;

INSERT INTO configuracion (llave, valor, publico)
VALUES ('finanza_acarreo_auto', '45000', '1')
ON CONFLICT (llave) DO NOTHING;

INSERT INTO configuracion (llave, valor, publico)
VALUES ('finanza_acarreo_moto', '30000', '1')
ON CONFLICT (llave) DO NOTHING;

INSERT INTO configuracion (llave, valor, publico)
VALUES ('finanza_salario_minimo', '250000', '1')
ON CONFLICT (llave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: infracciones (multas + contravenciones) and related rows
-- ---------------------------------------------------------------------------

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1001', '2026', '1001', '2026-01-14T09:25:00',
  'Gonzalo Romero', 'DNI', '28954321', 'AB123CD', 'Automóvil', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1001');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1002', '2026', '1002', '2026-02-03T18:40:00',
  'María Fernanda López', 'DNI', '30124578', 'AA222BB', 'Automóvil', 0, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1002');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1003', '2026', '1003', '2026-02-19T11:10:00',
  'Juan Carlos Gómez', 'DNI', '27125998', 'BC345EF', 'Motocicleta', 1, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1003');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1004', '2026', '1004', '2026-03-08T16:55:00',
  'Laura Martínez', 'DNI', '32987456', 'CD456GH', 'Automóvil', 0, 1, 'Cerrado', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1004');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1005', '2026', '1005', '2026-04-21T08:15:00',
  'Diego Rodríguez', 'DNI', '30456987', 'DE567IJ', 'Camioneta', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1005');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1006', '2026', '1006', '2026-05-12T20:30:00',
  'Ana Lucía Fernández', 'DNI', '35698741', 'EF678KL', 'Automóvil', 0, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1006');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1007', '2026', '1007', '2026-06-02T13:45:00',
  'Pablo Sosa', 'DNI', '28745632', 'FG789MN', 'Camión', 0, 1, 'Cerrado', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1007');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1008', '2026', '1008', '2026-07-19T10:05:00',
  'Carolina Díaz', 'DNI', '33254781', 'GH890OP', 'Automóvil', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1008');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1009', '2026', '1009', '2026-08-25T17:20:00',
  'Martín Álvarez', 'DNI', '29587412', 'HI901QR', 'Motocicleta', 1, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1009');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1010', '2026', '1010', '2026-09-14T09:50:00',
  'Silvia Pérez', 'DNI', '34785269', 'IJ012ST', 'Automóvil', 0, 0, 'Cerrado', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1010');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1011', '2026', '1011', '2026-10-06T15:35:00',
  'Roberto Acuña', 'DNI', '27589631', 'JK123UV', 'Camioneta', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1011');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 1, 'multas', '1012', '2026', '1012', '2026-11-22T12:10:00',
  'Valeria Suárez', 'DNI', '32145789', 'KL234WX', 'Automóvil', 0, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '1012');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 2, 'contravenciones', '2001', '2026', '2001', '2026-01-28T21:00:00',
  'Comercio Don Pedro', 'DNI', '30558214', 'LM345YZ', 'Camioneta', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '2001');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 2, 'contravenciones', '2002', '2026', '2002', '2026-03-11T11:40:00',
  'Mario Gómez SRL', 'DNI', '30987456', 'MN456AB', 'Camión', 0, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '2002');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 2, 'contravenciones', '2003', '2026', '2003', '2026-05-30T09:20:00',
  'Patricia Ledesma', 'DNI', '28459632', 'NO567CD', 'Automóvil', 0, 0, 'Cerrado', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '2003');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 2, 'contravenciones', '2004', '2026', '2004', '2026-07-08T14:50:00',
  'Estación de Servicio Patria', 'DNI', '30698741', 'OP678EF', 'Camión', 0, 0, 'Activo', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '2004');

INSERT INTO infraccion (
  uuid, infraccion_tipo_id, infraccion_tipo_nombre, legajo_number, legajo_anio, legajo_numero_acta, legajo_fecha,
  infractor_nombre, infractor_documento_tipo_nombre, infractor_documento_numero, vehiculo_numero_dominio, vehiculo_tipo_nombre,
  retencion_de_licencia, retencion_de_vehiculo, estado, date_created
)
SELECT gen_random_uuid()::text, 2, 'contravenciones', '2005', '2026', '2005', '2026-09-17T08:30:00',
  'Ferretería El Tornillo', 'DNI', '31258749', 'PQ789GH', 'Camioneta', 0, 0, 'Pendiente', (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM infraccion WHERE legajo_numero_acta = '2005');

-- infraccion_ley (by acta)
INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1001', 'Ordenanza 261/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES
  ('1002', 'Ordenanza 261/2022'),
  ('1002', 'Ordenanza 113/2018')
) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1003', 'Ordenanza 189/2021')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1004', 'Ordenanza 312/2023')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1005', 'Ordenanza 261/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1006', 'Ordenanza 261/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1007', 'Ordenanza 312/2023')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES
  ('1008', 'Ordenanza 189/2021'),
  ('1008', 'Ordenanza 312/2023')
) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1009', 'Ordenanza 261/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1010', 'Ordenanza 113/2018')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES
  ('1011', 'Ordenanza 261/2022'),
  ('1011', 'Ordenanza 189/2021')
) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('1012', 'Ordenanza 312/2023')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('2001', 'Ordenanza 402/2023')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('2002', 'Ordenanza 350/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('2003', 'Ordenanza 402/2023')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('2004', 'Ordenanza 288/2021')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

INSERT INTO infraccion_ley (infraccion_id, ley_nombre)
SELECT i.id, v.ley_nombre
FROM infraccion i
CROSS JOIN (VALUES ('2005', 'Ordenanza 350/2022')) AS v(acta, ley_nombre)
WHERE i.legajo_numero_acta = v.acta
  AND NOT EXISTS (
    SELECT 1 FROM infraccion_ley il WHERE il.infraccion_id = i.id AND il.ley_nombre = v.ley_nombre
  );

-- infraccion_dependencia (Dirección de Tránsito for all sample actas)
INSERT INTO infraccion_dependencia (infraccion_id, dependencia_nombre)
SELECT i.id, 'Dirección de Tránsito'
FROM infraccion i
WHERE i.legajo_numero_acta IN (
  '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010', '1011', '1012',
  '2001', '2002', '2003', '2004', '2005'
)
AND NOT EXISTS (
  SELECT 1 FROM infraccion_dependencia id
  WHERE id.infraccion_id = i.id AND id.dependencia_nombre = 'Dirección de Tránsito'
);
