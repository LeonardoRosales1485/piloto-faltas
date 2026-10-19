-- Documento y CUIT sin separadores (QA UI-CONT-08): el portal busca las actas del infractor por su documento y no las
-- encontraba si el acta o la cuenta lo tenían con puntos, espacios o guiones. Desde ahora se guardan normalizados;
-- esto corrige los datos ya cargados.
UPDATE infraccion SET infractor_documento_numero = nullif(upper(regexp_replace(infractor_documento_numero, '[\s.\-/]', '', 'g')), '')
WHERE infractor_documento_numero ~ '[\s.\-/]' OR infractor_documento_numero ~ '[a-z]';
UPDATE infraccion SET infractor_cuit = nullif(upper(regexp_replace(infractor_cuit, '[\s.\-/]', '', 'g')), '')
WHERE infractor_cuit ~ '[\s.\-/]';
UPDATE ciudadano SET documento_numero = nullif(upper(regexp_replace(documento_numero, '[\s.\-/]', '', 'g')), '')
WHERE documento_numero ~ '[\s.\-/]' OR documento_numero ~ '[a-z]';
UPDATE ciudadano SET cuit = nullif(upper(regexp_replace(cuit, '[\s.\-/]', '', 'g')), '')
WHERE cuit ~ '[\s.\-/]';
