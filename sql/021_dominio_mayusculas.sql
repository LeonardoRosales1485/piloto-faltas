-- Dominios siempre en mayúsculas y sin espacios (los nuevos ya se guardan así).
UPDATE infraccion SET vehiculo_numero_dominio = upper(regexp_replace(vehiculo_numero_dominio, '\s+', '', 'g'))
WHERE vehiculo_numero_dominio IS NOT NULL AND vehiculo_numero_dominio <> upper(regexp_replace(vehiculo_numero_dominio, '\s+', '', 'g'));
