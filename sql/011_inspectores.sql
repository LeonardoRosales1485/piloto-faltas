-- ABM de inspectores (sección «Inspectores»): terminal asignada y estado de la firma.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS terminal VARCHAR(40);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS firma_activa BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE usuario SET terminal = 'T-01' WHERE username = 'inspector' AND terminal IS NULL;
UPDATE usuario SET terminal = 'T-02' WHERE username = 'inspector_contrav' AND terminal IS NULL;

NOTIFY pgrst, 'reload schema';
