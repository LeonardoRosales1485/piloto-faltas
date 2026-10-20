-- 030: categorías (clases y subclases) de la licencia de conducir en el acta de tránsito.
-- Selección múltiple y opcional. Se guarda como lista JSON en TEXT, igual que medidas_preventivas
-- (ej.: '["B.1","A.2.1"]'). NULL = no se cargó. Solo agrega una columna: no toca datos existentes.
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS vehiculo_licencia_categorias TEXT;

NOTIFY pgrst, 'reload schema';
