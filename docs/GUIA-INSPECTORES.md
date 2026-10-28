# Guía rápida para inspectores · POS (piloto)

Guía corta para la capacitación de los inspectores antes de la prueba en calle. El detalle completo está en
«como usar la plataforma.md» (sección 1).

## 1. Al empezar el turno

1. Encendé el POS y abrí la app **Faltas Post** (la versión post 1.0; la app **Faltas** queda para la referencia). Si aparece **«Hay una versión nueva»**, instalala.
2. Ingresá con tu usuario. El inicio tiene **«Crear nueva acta»**, **«Imprimir último ticket»** y **«Consultar actas, retenciones y playón»** (solo tus actas, tus retenciones y los vehículos que retuviste).
3. Tu **PIN** es de 4 a 8 dígitos (por defecto **1234**; lo cambia el supervisor en Inspectores). Se pide cuando el equipo vuelve de las manos del infractor.
4. Revisá que haya papel. Para probar la impresora: en el login, mantené apretado **«App POS v…»** al pie y tocá **«Prueba de impresora»**.

## 2. Labrar el acta (paso a paso)

| Paso | Qué cargar | Ojo con |
|---|---|---|
| Lugar | **«Usar mi ubicación (GPS)»** y revisá la dirección | Sentido de circulación (hacia qué avenida, de una lista): opcional |
| Infractor | Situación: **de oficio, presente, se dio a la fuga o no aporta datos**. Si está presente: nombre, documento, domicilio; en tránsito, licencia | Al cargar el DNI se completa solo el N.° de licencia (si borrás la licencia, el DNI queda) |
| Vehículo | Dominio, tipo, marca y modelo | Ya no se pide el N.° de control interno |
| Artículos | «Agregar artículo», buscar y «Agregar» | **Obligatorio.** Algunos artículos piden **foto obligatoria** (badge «Requiere foto»). Alcoholímetro: marca y modelo de la lista |
| Fotos | Las que pida el artículo; si no, opcionales | Que se lea el dominio |
| Firma | Revisar el resumen, «Abrir pad de firma», «Firmar y confirmar» | Si se niega, «El infractor se niega a firmar» |

- Un paso con datos sin completar queda **en rojo** (en el celular, la barra de pasos se pone roja). Al pasar de paso aparece un aviso breve con lo que falta, **pero no bloquea**.
- Solo bloquean el **artículo** y la **foto** que pide el artículo. El resto se puede firmar igual: el sistema pregunta el motivo (se dio a la fuga, no aporta datos, de oficio u otro) y completa lo que falta con «Desconocido».
- Botón **«Se dio a la fuga»** al final: firma el acta sin datos del infractor.
- **No hay «Inicio» durante el labrado:** el acta se termina sí o sí. Tenés **1 h** en tránsito y **24 h** en contravenciones (lo configura la Dirección). El chip del reloj muestra el tiempo restante. Si vence sin firmar, el acta queda **abandonada** (número anulado). Si cerrás la app, al volver a «Crear nueva acta» se retoma la que estaba abierta.
- Al salir de la pantalla de firma (cuando el infractor tenía el equipo) se pide el **PIN**.
- **Después de firmar** el acta no se modifica más. Las correcciones las hace Faltas desde la causa (puede subsanar más de una vez).
- Solo pruebas: **7 toques seguidos sobre la barra superior** (no en el logo ni en los botones) descartan el acta en curso.

## 3. Tickets que se imprimen

1. **Ticket del infractor:** en la pantalla final, **«Imprimir ticket»**. Es uno solo (con las medidas adoptadas: retención de licencia o de vehículo). El QR lleva al acta.
2. **Ticket del inspector** (solo si hubo retención): **«Ticket del inspector»**. **Va adjunto con la licencia** retenida o **con la VTV** del vehículo.
3. Encabezado: **Municipio Malvinas Argentinas** · Subsecretaría de Tránsito y Bromatología.
4. Si la impresora falla, el POS ofrece **«Imprimir con el sistema»**. Desde el inicio, **«Imprimir último ticket»** reimprime el último acta firmada en el equipo.

> Para el ticket nuevo (encabezado y medidas adoptadas) hace falta la app **Faltas Post 1.1.0** o posterior.

## 4. Lo que tiene que saber el infractor

- **No debe pagarle nada al inspector.** Lo dice el ticket.
- Puede verificar el acta escaneando el QR. Para verla y gestionarla tiene que registrarse en el **portal** (`/portal`).
- Al abrir el acta en el portal queda **notificado**, solo si el DNI/CUIT de su cuenta coincide con el del acta. Las veces que vuelva a entrar quedan registradas, pero no cambian los plazos.

## 5. Vehículo retenido: qué pasa después

1. El vehículo va al depósito con el ticket del inspector adjunto a la VTV.
2. Para retirarlo, el titular va **en persona a la Dirección de Faltas** con titularidad, formulario 08, seguro y licencia. Paga acarreo y estadía (la boleta vale 48 h).
3. Faltas registra la liberación y entrega la **constancia con QR** (también va en la disposición de levantamiento).
4. En el **corralón** se escanea el QR: si dice **«Liberación vigente»** se entrega; si dice **«vencida»** o **«No entregar»**, no se entrega y la persona vuelve a Faltas (boleta complementaria por los días de más).

## 6. Problemas frecuentes

| Pasa esto | Hacé esto |
|---|---|
| No toma el GPS | Activá la ubicación del equipo, salí al aire libre y volvé a tocar el botón. Si no hay señal, cargá la dirección a mano |
| Pide PIN y no lo sé | Por defecto es 1234; si lo cambiaron, pedíselo al supervisor |
| No imprime | Revisá el papel y la tapa; probá «Prueba de impresora». Si sigue, «Imprimir con el sistema» |
| La app no se actualiza | Cerrala del todo y abrila de nuevo: busca la versión nueva al iniciar |
| Me equivoqué antes de firmar | Corregí en el paso (no hay «Descartar acta»: se termina o queda abandonada al vencer el plazo) |
| Me equivoqué después de firmar | Avisá a Faltas con el número de acta: lo subsanan desde la causa |
