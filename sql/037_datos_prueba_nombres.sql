-- 037 · Nombres secuenciales (sql/036) también en los datos de prueba (solo en la base post).
-- Los snapshots del sandbox («default» y los demás) guardan quién hizo cada cosa con los nombres viejos
-- («Inspector Vial», «Operador Mesa», «Agente de Tránsito», «Abogada de Contravenciones»…). Al «Restablecer piloto»
-- o «Cargar datos dummy» volvían esos nombres: se reemplazan por Inspector N / Agente N y «Responsable Contravenciones».
-- Solo se reemplazan valores completos (entre comillas), no texto dentro de escritos.

-- 1. Snapshots del sandbox
UPDATE sandbox_snapshot SET datos = (replace(replace(replace(replace(replace(replace(replace(replace(datos::text, '"Inspector Vial"', '"Inspector 1 (Tránsito)"'), '"Inspector de Contravenciones"', '"Inspector 3 (Contravenciones)"'), '"Inspector de Bromatología"', '"Inspector 5 (Sustancias Alimenticias)"'), '"Operador Mesa"', '"Agente 1 (Tránsito)"'), '"Agente de Tránsito"', '"Agente 1 (Tránsito)"'), '"Agente de Contravenciones"', '"Agente 3 (Contravenciones)"'), '"Agente de Sustancias Alimenticias"', '"Agente 5 (Sustancias Alimenticias)"'), '"Abogada de Contravenciones"', '"Responsable Contravenciones"'))::jsonb WHERE TRUE;

-- 2. Los mismos nombres en los datos cargados ahora
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'causa_historial' AND column_name = 'usuario') THEN
    EXECUTE $q$UPDATE causa_historial SET usuario = CASE usuario WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE usuario END WHERE usuario IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documento' AND column_name = 'creado_por') THEN
    EXECUTE $q$UPDATE documento SET creado_por = CASE creado_por WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE creado_por END WHERE creado_por IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documento' AND column_name = 'firmado_por') THEN
    EXECUTE $q$UPDATE documento SET firmado_por = CASE firmado_por WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE firmado_por END WHERE firmado_por IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notificacion' AND column_name = 'registrado_por') THEN
    EXECUTE $q$UPDATE notificacion SET registrado_por = CASE registrado_por WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE registrado_por END WHERE registrado_por IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'infraccion' AND column_name = 'inspector_nombre') THEN
    EXECUTE $q$UPDATE infraccion SET inspector_nombre = CASE inspector_nombre WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE inspector_nombre END WHERE inspector_nombre IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'presentacion' AND column_name = 'resuelto_por') THEN
    EXECUTE $q$UPDATE presentacion SET resuelto_por = CASE resuelto_por WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE resuelto_por END WHERE resuelto_por IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memo' AND column_name = 'autor') THEN
    EXECUTE $q$UPDATE memo SET autor = CASE autor WHEN 'Inspector Vial' THEN 'Inspector 1 (Tránsito)' WHEN 'Inspector de Contravenciones' THEN 'Inspector 3 (Contravenciones)' WHEN 'Inspector de Bromatología' THEN 'Inspector 5 (Sustancias Alimenticias)' WHEN 'Operador Mesa' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Tránsito' THEN 'Agente 1 (Tránsito)' WHEN 'Agente de Contravenciones' THEN 'Agente 3 (Contravenciones)' WHEN 'Agente de Sustancias Alimenticias' THEN 'Agente 5 (Sustancias Alimenticias)' WHEN 'Abogada de Contravenciones' THEN 'Responsable Contravenciones' ELSE autor END WHERE autor IN ('Inspector Vial', 'Inspector de Contravenciones', 'Inspector de Bromatología', 'Operador Mesa', 'Agente de Tránsito', 'Agente de Contravenciones', 'Agente de Sustancias Alimenticias', 'Abogada de Contravenciones')$q$;
  END IF;
END $$;
