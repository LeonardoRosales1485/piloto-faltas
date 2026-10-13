-- Quita la mención a «BOD» (no significa nada para el usuario) del aviso de los modelos provisorios.
UPDATE plantilla SET contenido_html = replace(contenido_html, 'Modelo provisorio redactado por BOD para el piloto', 'Modelo provisorio para el piloto')
WHERE contenido_html LIKE '%redactado por BOD%';
UPDATE documento SET contenido_html = replace(contenido_html, 'Modelo provisorio redactado por BOD para el piloto', 'Modelo provisorio para el piloto')
WHERE contenido_html LIKE '%redactado por BOD%' AND estado IN ('borrador', 'devuelto');
UPDATE sandbox_snapshot SET datos = replace(datos::text, 'Modelo provisorio redactado por BOD para el piloto', 'Modelo provisorio para el piloto')::jsonb
WHERE datos::text LIKE '%redactado por BOD%';
