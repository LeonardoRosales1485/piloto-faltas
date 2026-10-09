-- Acta de tránsito según el modelo de la Dirección: legajo y dependencia del inspector.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS legajo VARCHAR(40);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS inspector_legajo VARCHAR(40);
ALTER TABLE infraccion ADD COLUMN IF NOT EXISTS inspector_dependencia VARCHAR(180);

UPDATE usuario SET legajo = '10234' WHERE username = 'inspector' AND legajo IS NULL;
UPDATE usuario SET legajo = '10871' WHERE username = 'inspector_contrav' AND legajo IS NULL;

-- Actas ya labradas: se completan con los datos actuales del inspector.
UPDATE infraccion i SET inspector_legajo = u.legajo, inspector_dependencia = u.sector
FROM usuario u WHERE u.username = i.inspector_username AND i.inspector_legajo IS NULL;

NOTIFY pgrst, 'reload schema';
