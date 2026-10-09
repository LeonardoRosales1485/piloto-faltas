# Pendientes del acta de tránsito

## Medidas en la vía pública y acarreo (quitados)

El «Modelo de acta digital (Tránsito)» enviado por la Dirección de Faltas no incluye **medidas en la vía pública** ni
**acarreo al depósito**. Por eso, desde el 09/10/2026:

- El paso de artículos del labrado de tránsito ya no ofrece la opción «Acarreo al depósito».
- El acta de tránsito impresa no muestra acarreo ni medidas en la vía pública (solo retención de licencia y de vehículo).

Lo que **no** se tocó, para poder volver atrás sin migrar datos:

- La columna `infraccion.acarreo` sigue en la base; las actas viejas que la tengan en 1 la conservan.
- La valorización (`causa-srv.ts`) sigue sumando el acarreo si la columna vale 1, y el detalle de la causa lo sigue mostrando.

**A confirmar con la Dirección:** si el acarreo se registra por otra vía (p. ej. el depósito) o si debe volver al acta.
Si vuelve, alcanza con restaurar la opción en `CrearEditarInfraccion.tsx` (está comentada) y agregarla al acta en
`acta-oficial.ts` (`actaTransitoHtml`).
