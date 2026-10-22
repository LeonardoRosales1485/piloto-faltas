-- Minuta 20/10/2026, fase 1.
-- 1. Leyendas legales del acta (ticket y PDF), editables en «Textos del portal». PROVISORIAS: las redactó BOD hasta
--    que la Dirección / Prensa pasen el texto definitivo.
INSERT INTO texto_portal (llave, titulo, texto) VALUES
  ('leyenda_boleta_inculpado', 'Acta: leyenda de boleta de inculpado (con retención de licencia)',
   'BOLETA DE CITACIÓN DEL INCULPADO: la presente acta reemplaza a la licencia de conducir retenida y habilita a su titular a conducir en forma provisoria por el plazo de treinta (30) días corridos desde su confección (art. 72, Ley 24.449).'),
  ('leyenda_compactacion', 'Acta: advertencia de compactación (con retención de vehículo)',
   'ADVERTENCIA: el vehículo retenido que no sea retirado del depósito municipal dentro de los seis (6) meses de su ingreso será sometido a compactación, conforme a la normativa vigente.')
ON CONFLICT (llave) DO NOTHING;

-- 2. Liberación de vehículos (provisorio hasta que la Dirección confirme): la boleta de acarreo y estadía vale 48 h y la
--    estadía se cobra desde el primer día (tramos 1–7, 8–30 y 31+). Editables en la base (configuración).
INSERT INTO configuracion (llave, valor, publico) VALUES
  ('liberacion_validez_horas', '48', '1'),
  ('estadia_dias_sin_cargo', '0', '1')
ON CONFLICT (llave) DO NOTHING;
