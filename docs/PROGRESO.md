# Control de progreso: cambios de la reunión

Seguimiento de los cambios pedidos por la Dirección de Faltas. Cada ítem tiene su prompt detallado en [`docs/prompts`](prompts/README.md).
Actualizar este archivo en el mismo commit en que se termina cada ítem.

**Estados:** ✅ Hecho · 🟡 En curso · ⬜ Pendiente · ⏸️ En pausa / a definir

Avance: **9 / 20**

| # | Cambio | Estado | Commit | Notas |
|---|--------|--------|--------|-------|
| 01 | [Legajo y año en inputs separados](prompts/01-legajo-y-anio-separados.md) | ✅ | 71d730b | |
| 02 | [Quitar el correo del labrado](prompts/02-quitar-correo-del-infractor.md) | ✅ | 470a082 · 68e6fbf | El correo se carga ahora desde la causa (opcional, back office). |
| 03 | [Marcas y modelos configurables](prompts/03-marcas-y-modelos-configurables.md) | ✅ | b7e7af3 · 2a47247 | Con ingreso libre si no está en la lista. |
| 04 | [Municipio emisor autocompletable](prompts/04-municipio-emisor-autocompletable.md) | ✅ | 8c2563a · 2a47247 | Buscador con ingreso libre; fallback a los 135 partidos + CABA. |
| 05 | [Ordenanzas para Directora y admin](prompts/05-ordenanzas-para-directora.md) | ✅ | 91b7f5f | |
| 06 | [Ocultar «unidades» en artículos](prompts/06-ocultar-unidades-en-articulos.md) | ✅ | 250c9f9 | También se ocultan en la API para el rol Inspector. Ticket y acta impresa no muestran importes. |
| 07 | [«Se niega a firmar» bajo la firma](prompts/07-negativa-a-firmar-bajo-la-firma.md) | ✅ | (este commit) | Paso 1: Presente / Ausente / NN. La negativa se marca en «Revisión y firma». |
| 08 | [Stepper con faltantes en rojo](prompts/08-stepper-con-faltantes-en-rojo.md) | ✅ | (este commit) | Reglas en `faltantesPorPaso` (crear-editar-utils.ts), en sintonía con `firmarActa`. |
| 09 | [«Lugar de infracción»](prompts/09-lugar-de-infraccion.md) | ✅ | (este commit) | Stepper, resumen, ficha de la causa y mensajes. |
| 10 | [Ocultar GPS en el bloque de ejido](prompts/10-ocultar-gps-en-ejido.md) | ⬜ | | |
| 11 | [Selección de artículos como stg](prompts/11-articulos-como-stg.md) | ⬜ | | Copiar el selector de stg (BOD). |
| 12 | [Pago voluntario vs. Descargo vs. Ignorar](prompts/12-pago-voluntario-vs-descargo-vs-ignorar.md) | ⬜ | | Hacer antes que 13 y 14. |
| 13 | [Descargo antes del fallo](prompts/13-descargo-antes-del-fallo.md) | ⬜ | | Depende de 12. |
| 14 | [Presentaciones en el detalle](prompts/14-presentaciones-en-el-detalle.md) | ⬜ | | Depende de 12. |
| 15 | [Subsanar datos](prompts/15-subsanar-datos.md) | ⬜ | | Ver `prompts/croquis-subsanacion.png`. |
| 16 | [Memos internos](prompts/16-memos-internos.md) | ⬜ | | Nota interna simple en pestaña «Memos internos». |
| 17 | [Acarreos y retenciones](prompts/17-acarreos-y-retenciones.md) | ⬜ | | Hacer después de 18 (tarifas). |
| 18 | [«Valores y tarifas» como stg](prompts/18-finanzas-como-stg.md) | ⬜ | | |
| 19 | [Ocultar «Correos enviados»](prompts/19-ocultar-correos-enviados.md) | ⬜ | | |
| 20 | [Evidencia en el acta](prompts/20-evidencia-en-el-acta.md) | ⬜ | | |

## Otros ajustes fuera de la lista

| Cambio | Commit |
|--------|--------|
| Radio y texto alineados en «Situación del infractor» | dab2d1e |
| Correo del infractor editable desde la causa | 68e6fbf |
| Localidad antes que partido (catálogo BA + CABA, ingreso libre) y alcoholemia alineada | 2a47247 |

## Fuera del alcance del prototipo

- Comparación del ejido contra la capa de Pablo.
