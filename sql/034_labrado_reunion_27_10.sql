-- Reunión de validación del 27/10/2026: labrado en el POS. Solo para la base de «piloto-faltas-post».
-- Correr después de 033. Se puede correr más de una vez.

-- 1. Plazo de labrado: el acta abierta vence (y queda «Acta abandonada») si no se firma ni se extiende a tiempo.
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS labrado_vence_at BIGINT;
INSERT INTO configuracion (llave, valor, publico) VALUES
  ('labrado_plazo_horas_multas', '1', '1'),
  ('labrado_plazo_horas_contravenciones', '24', '1'),
  ('labrado_plazo_horas_sustancias', '24', '1')
ON CONFLICT (llave) DO NOTHING;

-- 2. Foto obligatoria según el artículo (Ordenanzas). Mal estacionamiento la pide por defecto.
ALTER TABLE ley ADD COLUMN IF NOT EXISTS requiere_foto INT NOT NULL DEFAULT 0;
UPDATE ley SET requiere_foto = 1 WHERE requiere_foto = 0 AND (descripcion ILIKE '%estacion%' OR categoria_nombre ILIKE '%estacion%');

-- 3. PIN del inspector (para salir de la pantalla de firma cuando el equipo lo tiene el infractor). Prototipo: 1234.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS pin VARCHAR(12) NOT NULL DEFAULT '1234';

-- 4. Alcoholímetros: marcas y modelos administrables (Configuración → Labrado en el POS).
--    El modelo se guarda como «Marca · Modelo».
INSERT INTO catalogo (tipo, nombre)
SELECT x.tipo, x.nombre FROM (VALUES
  ('alcoholimetro_marca', 'ICBB'),
  ('alcoholimetro_marca', 'Dräger'),
  ('alcoholimetro_marca', 'Lion'),
  ('alcoholimetro_marca', 'Intoximeters'),
  ('alcoholimetro_modelo', 'ICBB · TC'),
  ('alcoholimetro_modelo', 'Dräger · Alcotest 6820'),
  ('alcoholimetro_modelo', 'Dräger · Alcotest 7510'),
  ('alcoholimetro_modelo', 'Lion · Alcolmeter 500'),
  ('alcoholimetro_modelo', 'Intoximeters · Alco-Sensor FST')
) AS x(tipo, nombre)
WHERE NOT EXISTS (SELECT 1 FROM catalogo c WHERE c.tipo = x.tipo AND c.nombre = x.nombre);

NOTIFY pgrst, 'reload schema';
