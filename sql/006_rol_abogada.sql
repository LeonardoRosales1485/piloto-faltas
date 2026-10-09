-- Rol Abogada: mismos permisos que la Directora, alcance contravenciones (tipo 2) y sustancias (tipo 3).
-- La Directora pasa a ver sólo actas de tránsito (tipo 1). El alcance se aplica en la API.
INSERT INTO usuario (uuid, username, password_hash, nombre, apellido, email, sector, rol, date_created)
SELECT gen_random_uuid()::text, 'abogada', '$2b$10$zs7sxMyA39qeo/UBcbhV0.T0QrUFEhQt86SzIX3XqxLoyCpncmhKC',
  'Abogada', 'de Contravenciones', 'abogada@municipalidad.gob.ar', 'Dirección de Faltas', 'Abogada',
  (extract(epoch from now()) * 1000)::bigint
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE username = 'abogada');
