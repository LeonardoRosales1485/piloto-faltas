# Cobertura del «Informe de requerimientos para el Sistema de Faltas» en el piloto

Revisión del 14/10/2026, sección por sección, del PDF (carpeta Faltas/Fuentes) contra el código del piloto.
**Leyenda:** ✅ cubierto · 🟡 parcial · ❌ falta · ⏸️ decisión pendiente o diferido por acuerdo.

Resumen: el núcleo (labrado, causa digital, portal, escritos, pagos, fallos, apelación, Apremios, archivo) está.
Los faltantes se concentran en **funcionamiento sin señal**, **actos firmados por el Intendente / Sistema Integrador**,
**notificación por cédula y acuses**, **portal de inspectores y playón**, **módulo de Estados editable** y varios
**ajustes de formulario** (fotos, medidas, QR, licencia, registro del portal).

---

## 1. Alcance y criterios generales

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 1.a | Un solo sistema: labrado, causa, notificaciones, presentaciones, resoluciones, fallos, pagos, medidas, recursos, archivo, reportes | ✅ | Notificación en persona fuera de la fase 1 (ver 7.b). |
| 1.b | Tránsito, contravención y sustancias; Bromatología/comercio como contravención | ✅ | |
| 1.c | Legajo digital unificado con trazabilidad de cada cambio y agente | ✅ | Historial, auditoría y legajo PDF. |
| 1.d | Reglas, catálogos, textos, plazos y circuitos configurables | 🟡 | Catálogos, textos del portal, plazos, tarifas, plantillas y permisos sí. **Estados y circuitos no son editables** (ver 7, Módulo de Estados). |

## 2. Actas digitales

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 2.a | Usuario propio, nombre y legajo, firma solo quien labra | ✅ | Firma digital simulada (P-04). |
| 2.b | Inspectores de tránsito y de contravenciones con permisos distintos | ✅ | Módulos autorizados por inspector. |
| 2.c–d | Número y legajo automáticos, T-n / C-n / S-n con legajo compartido | ✅ | |
| 2.e | Inspector vinculado a su dependencia; nombre del área en el acta contravencional (Anexo II) | 🟡 | La dependencia se tilda a mano en el wizard; no se toma del perfil del inspector. Verificar que el catálogo tenga las 10 dependencias del Anexo II. |
| 2.f | GPS con corrección menor, entre calles opcional, ejido automático | ✅ | |
| 2.g | Fecha y hora automáticas, no editables | ✅ | |
| 2.h–i | Fecha, hora, ubicación, número y formulario **sin señal** | ❌ | Requiere conexión. |
| 2.j | 3 opciones: presente / se negó a identificarse / ausente | 🟡 | El piloto muestra «Presente / Ausente / NN»; alinear textos con el Informe. |
| 2.k | Se niega o ausente → sin datos personales (NN) | ✅ | |
| 2.l | Domicilio obligatorio completo (calle, altura, piso/dpto, provincia, partido, ciudad) | 🟡 | Se exige domicilio, no cada componente. |
| 2.l | Vehículo: tipo, dominio («Sin dominio»), marca y modelo («no visualiza») | 🟡 | Falta la opción explícita «Sin dominio». |
| 2.l | Retenciones y alcoholemia por defecto «NO»; artículos con buscador; firma o «se niega»; sin año ni CP | ✅ | |
| 2.m | **Categorías de la licencia y foto de la licencia** | ❌ | Solo el número de licencia. |
| 2.n | Alcoholemia positiva: valor y equipo | ✅ | |
| 2.o | Sin «mismo domicilio para notificación» | ✅ | |
| 2.p | **Domicilio electrónico opcional en el acta** | ⏸️ | Se quitó por pedido de la Directora (cambio 02): contradice el Informe; confirmar. |
| 2.q | Observaciones y **hasta 10 fotos** rotuladas «Imágenes de la infracción/contravención» | 🟡 | 5 fotos; rótulo distinto. |
| 2.r | Medidas por tipo; contravención: clausura, paralización de obra, secuestro de elementos / mercadería / animales, violación de medida | 🟡 | El catálogo tiene clausura preventiva, secuestro de mercadería, paralización de obra y **decomiso** (no está en el Informe). Faltan **clausura de obra, secuestro de elementos, secuestro de animales y violación de medida**. |
| 2.s | Retención de vehículo → indicar acarreo | ✅ | |
| 2.t | Revisión editable → confirmar → firma infractor → firma inspector | ✅ | |
| 2.u | **QR del ticket → portal (login). QR del acta → página oficial del Municipio.** Sin montos | 🟡 | Un solo QR (acta pública). Sin montos ✅. |
| 2.v | Modelos de acta de referencia para el PDF, con QR | ✅ | |

## 3. Tránsito

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 3.a | Vehículo obligatorio, ciudad, lugar, entre calles, GPS, ejido automático | ✅ | Ver «Sin dominio» en 2.l. |
| 3.b | Retención de licencia y de vehículo (pueden coexistir), sin medidas de contravención; acarreo, **ingreso y egreso del playón** | 🟡 | Medidas y acarreo ✅. Ingreso/egreso: «Retenciones» con fecha de ingreso cargada por Faltas y liberación; falta el **registro operativo del playón** (ver 6.b). |
| 3.c | Pago voluntario 30 días corridos; luego boleta sin beneficio; descargo y PV excluyentes, pero puede pagar sin beneficio | ✅ | |
| 3.d | Fallo notificado → apelación o boleta; pasados 5 días → legajo PDF a Apremios | ✅ | Exportación a Apremios con lote y carátula de deuda. |

## 4. Contravenciones

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 4.a | Generales y sustancias (Bromatología, comercio); ciudad, entre calles y **nomenclatura catastral** (opcional) | ✅ | Verificar que la nomenclatura catastral figure en el modelo de acta impreso. |
| 4.b | Medidas: clausura, **clausura de obra**, paralización, **secuestro de elementos**, mercadería, **animales**, **violación de medida**; sin retenciones | 🟡 | Ver 2.r. |
| 4.c | PV «conforme al criterio de la Dirección»; descargo y PV compatibles; cada solicitud evaluada por Faltas | 🟡 | Compatibles y evaluadas ✅. PV se ofrece siempre: falta definir si la Dirección lo habilita causa por causa. |

## 5. Portal web de infractores

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 5.a | Ticket con QR para ver el acta; registro para hacer trámites | 🟡 | El QR abre el acta pública, no el login del portal (ver 2.u). |
| 5.b | **Registro con los datos del Anexo III** | 🟡 | Faltan: **fecha de nacimiento, nacionalidad, partido/departamento, provincia, calle y n.° separados, piso, dpto.** (física) y **tipo societario, código postal, piso/dpto.** (jurídica); confirmación de e-mail. Validación por código ✅. |
| 5.c | **Consulta separada de tránsito y de contravenciones**, con textos propios; búsqueda por acta, dominio o tipo y n.° de documento | 🟡 | Búsqueda por acta/dominio/documento con filtro de tipo ✅. Falta separar las dos consultas con textos informativos propios y el **tipo de documento** como criterio. |
| 5.d | Por causa: acta, legajo, fecha, lugar, estado, medida vigente, acciones; «Visualizar» abre el PDF; pagada con medida sigue visible | ✅ | |
| 5.e | Pago: DNI ambos lados, estatuto si es jurídica, campo acotado, confirmación; sin monto en el portal; cuotas con advertencia | ✅ | Revisar que el portal no muestre montos en boletas antes de que Faltas las emita. |
| 5.f | Descargo: **formulario modelo** (el Anexo V lo pide en **PDF**), escrito PDF/JPG, DNI, estatuto, pruebas; aceptar u observar con un reenvío | 🟡 | Todo ✅ salvo el formato: hoy se descarga en **.docx**. Agregar versión PDF. |
| 5.g | Tras la sentencia: sin descargo, apelación con adjuntos; plazos y contacto; advertencias por tipo | ✅ | |
| 5.h | Notificaciones y respuestas por correo no-reply con constancia; domicilio electrónico habilita notificación | 🟡 | Correo simulado (registro de correos); falta el envío real. |

## 6. Portal de inspectores

| Pto | Requerimiento | Estado | Detalle |
|---|---|---|---|
| 6.a | **Consultar las actas que les correspondan** y sus medidas (n.° de acta, infractor, DNI, retenciones) | ❌ | El inspector solo ve sus borradores (el «modo depuración» es temporal). |
| 6.b | **Registro operativo del playón**: ingreso (fecha, hora, responsable) y egreso (fecha, hora, responsable, constancia) | 🟡 | «Retenciones» registra ingreso y liberación desde Faltas; faltan responsable, hora y **constancia de egreso**, y el uso desde el playón. |
| 6.c | El playón ve **solo la disposición de levantamiento firmada** y **tilda la liberación efectiva** | ❌ | |
| 6.d | Distinguir los vehículos retenidos con disposición de levantamiento | 🟡 | La lista de retenciones existe; falta el indicador «con levantamiento, listo para liberar». |

## 7. Procedimiento de la Dirección de Faltas

### Módulos

| Módulo | Requerimiento | Estado | Detalle |
|---|---|---|---|
| Ordenanzas / Ley | Artículos, ordenanza o ley, valor en UF **o Salarios** (opcional), detalle | 🟡 | UF ✅. **Valor en Salarios** no está. |
| Escritos | Plantillas con su cambio de estado (Anexo I), editables; datos del acta trasladados; marcar cuáles pasan a revisión de la Directora | ✅ | Precarga de datos de la causa. |
| Tributario | UF, salarios, derechos de oficina, estadía, acarreo; solo usuarios designados | ✅ | Permiso «Valores y tarifas». |
| **Estados** | **Agregar estados y modificar los existentes** | ❌ | Los 34 estados del Anexo I están fijos en el código. |

### 7.a Ingreso de acta y medidas

| Requerimiento | Estado | Detalle |
|---|---|---|
| Ingreso automático al firmar | ✅ | |
| Medidas pendientes de resolución aunque esté notificada o «para cédula» | ✅ | |
| Acceso del infractor al acta desde el labrado | ✅ | |

### 7.b Resoluciones y notificaciones

| Requerimiento | Estado | Detalle |
|---|---|---|
| **Resolución que confirma la medida, firmada por el Intendente y registrada en el Sistema Integrador** con **reserva de número y fecha** (≤ 24 h hábiles) | 🟡 | Hay resolución desde plantilla firmada por la Directora y numerada por el sistema. Falta: **reserva de número y fecha** al ingresar el acta con medida, **registro de n.°/fecha externos** y **escaneo** del acto firmado. |
| Notificación por domicilio electrónico con comprobante; por registro en el portal | ✅ | |
| **Cédula por Blue Mail o notificador** | ❌ | Fuera de la fase 1. |
| **Solapa de acuse**: fecha, resultado, **motivo de notificación fallida** y **escaneo de la constancia** | 🟡 | La pestaña muestra las notificaciones y su fecha; falta cargar resultado negativo con motivo y adjuntar el escaneo. |

### 7.c Pagos o descargos

| Requerimiento | Estado | Detalle |
|---|---|---|
| Bandeja de solicitudes; aceptar o rechazar | ✅ | |
| Boleta generada en Faltas y enviada por no-reply | 🟡 | Envío simulado; interfaz con Malvinas 2000 pendiente. |
| Descargo aceptado → bandeja «Descargo» para fallo | ✅ | |
| Monto estimado (UF × artículos), estadía según tarifaria, acarreo por tipo, derechos de oficina | ✅ | |
| UF por falta y monto editables por causa (ej.: 25 UF en vez de 150) | ✅ | Montos por artículo y valores del labrado. |
| UF por artículo editables en el módulo de ordenanzas | ✅ | |
| Escritos editados en el sistema, sin bajar y subir | ✅ | |
| Bandeja de revisión de la Directora, **diferenciada por tipo de escrito**; firma → PDF | ✅ | Verificar el filtro por tipo en la bandeja. |
| PDF firmado inmutable conservando el editable previo | ✅ | |
| Estados automáticos por escrito y cambio manual | ✅ | |

### 7.d–g Fallos, notificación del fallo, apelación, Apremios

| Requerimiento | Estado | Detalle |
|---|---|---|
| Fallo para PV impago o descargo | ✅ | |
| **Resoluciones y fallos firmados por el Intendente y registrados en el Sistema Integrador antes de notificar** | 🟡 | Hoy los firma la Directora en el sistema. Mismo faltante que en 7.b. |
| Bandeja de la Directora para corregir, firmar y **compartir** | 🟡 | Corregir y firmar ✅. «**Compartir**» (enviar el escrito firmado por correo) no está como acción. |
| **Notificación del fallo subiendo el escaneo del acto** | 🟡 | Se notifica el escrito del sistema; falta adjuntar el escaneo del acto firmado por el Intendente. |
| Apelación: aceptar/observar y resolución de conceder o rechazar; legajo completo en PDF al Juzgado de Paz | ✅ | |
| Apremios: fallo notificado sin pago ni apelación → causa completa en PDF | ✅ | |

### 7.h Archivo

| Requerimiento | Estado | Detalle |
|---|---|---|
| Tipos de archivo según estados | ✅ | |
| Finalizan: Apremios, no notificadas, nulidad (sale del portal), pagadas sin medida (sale del portal) | ✅ | Verificar que «Archivo nulidad» y «pagada» dejen de verse en el portal. |

## 8. Conclusión

| Requerimiento | Estado | Detalle |
|---|---|---|
| Prueba piloto integral (labrado, tránsito, contravención, portal infractores, portal inspectores) | 🟡 | Falta el portal de inspectores (6). |
| Prioridad: acta digital, Sistema de Faltas y portal web | ✅ | |
| Herramienta integral desde el inicio | ✅ | |

## Anexos

| Anexo | Requerimiento | Estado | Detalle |
|---|---|---|---|
| I | 34 estados con estado visible en el portal | ✅ | No editables (ver Módulo de Estados). |
| II | 10 dependencias que labran actas de ordenanza | 🟡 | Verificar el catálogo contra la lista. |
| III | Datos de registro del portal | 🟡 | Ver 5.b. |
| IV | Observaciones del dispositivo SYMCODE (medidas por tipo) | 🟡 | Ver 2.r. |
| V | Filtro por medida preventiva | ✅ | Bandeja «Medidas». |
| V | Mostrar solo la medida adoptada | ✅ | |
| V | Informes: actas, retenidos, licencias, clausuras, paralizaciones; **informe mensual de pagos por área** | 🟡 | Reportes generales ✅; informe mensual de pagos «por área» existe en reportes: **comparar con el modelo enviado el 09/01/2026** y agregar clausuras/paralizaciones por separado. |
| V | Migración de 5 años | ⏸️ | Sin migración por ahora. |
| V | **Vincular actas de la misma persona para el pago** | ❌ | |
| V | Recibo a nombre de quien firma el compromiso | ✅ | |
| V | Pago «a verificar» → «definitivo» | ✅ | |
| V | **Tipo leve/grave, mínimo y máximo de UF o salarios, monto del pago voluntario por artículo** | ❌ | |
| V | Desestimar sin eliminar, sin acciones posteriores | ✅ | |
| V | Observaciones en el acta | ✅ | |
| V | Rótulo «Imágenes de la infracción/contravención» | ❌ | |
| V | Descargo a evaluar; observado con un reenvío | ✅ | |
| V | Adjuntar el escaneo del acto firmado y notificar automáticamente si hay domicilio electrónico | 🟡 | Ver 7.b. |
| V | Notificaciones y respuestas por no-reply | 🟡 | Simulado. |
| V | PV en todas las de ordenanza; en tránsito 30 días y luego boleta; advertencias | ✅ | |
| V | Firma digital de la Directora y envío al correo del infractor | 🟡 | Firma simulada; falta «compartir». |
| V | Apartado de pendientes de la Directora | ✅ | |
| V | Solapa de acuse con escaneo, resultado, motivo y fecha | 🟡 | Ver 7.b. |

---

# Supuestos faltantes a incluir

Lista consolidada para planificar (complementa [PENDIENTES.md](PENDIENTES.md); los números entre corchetes remiten a sus ítems).

## Rápidos (ajustes de formulario y textos)

1. Hasta **10 fotos** y rótulo «Imágenes de la infracción/contravención» (2.q, Anexo V) [2].
2. Medidas de contravención completas: **clausura de obra, secuestro de elementos, secuestro de animales, violación de medida**; revisar «decomiso» (2.r, 4.b).
3. Opciones de identificación con el texto del Informe: «Identificado o presente / Se negó a identificarse / Ausente» (2.j).
4. Domicilio del infractor con todos sus componentes obligatorios (2.l).
5. Opción **«Sin dominio»** en el vehículo (2.l, 3.a).
6. Dependencia labrante tomada del perfil del inspector y catálogo verificado contra el Anexo II (2.e).
7. Formulario modelo de descargo también en **PDF** (5.f, Anexo V).
8. Consulta del portal separada **tránsito / contravenciones** con textos propios y búsqueda por **tipo y n.° de documento** (5.c).
9. Registro del portal con todos los campos del **Anexo III** (5.b).
10. Verificar nomenclatura catastral en el acta impresa, archivo nulidad/pagada fuera del portal y filtro por tipo en la bandeja de la Directora.

## Medianos

11. **Dos QR**: ticket → login del portal; acta PDF → página oficial del Municipio (2.u, 5.a) [8].
12. **Categorías y foto de la licencia de conducir** (2.m).
13. **Valor en Salarios** además de UF en ordenanzas (7, Módulo de Ordenanzas).
14. **Leve/grave, mínimo y máximo de UF/salarios y monto de PV por artículo**, con validación al ajustar montos (Anexo V) [3].
15. **Portal de inspectores**: consulta de sus actas firmadas y medidas (6.a).
16. **Playón**: registro de ingreso y egreso con responsable, hora y constancia; ver solo la disposición de levantamiento firmada y tildar la liberación; indicador de retenidos listos para liberar (6.b–d, 3.b) [13].
17. **Solapa de acuse** completa: resultado positivo/negativo, motivo, fecha y escaneo (7.b, Anexo V).
18. **Compartir** escritos firmados por correo desde la causa (7.d, Anexo V).
19. **Vincular actas** de la misma persona para un pago conjunto (Anexo V) [11].
20. Informe mensual de pagos según el **modelo del 09/01/2026** y estadísticas de clausuras/paralizaciones (Anexo V) [12].

## Grandes

21. **Funcionamiento sin señal** del acta digital (2.h–i) [6].
22. **Actos del Intendente / Sistema Integrador**: reserva de número y fecha al ingresar un acta con medida, registro de n.°/fecha externos, escaneo del acto firmado y notificación con ese escaneo (7.b, 7.d, 7.e) [5].
23. **Notificación por cédula** (Blue Mail / notificador) [9].
24. **Módulo de Estados editable**: alta y modificación de estados y su texto en el portal (7, 1.d).
25. Envío real de correos no-reply y **interfaz con Malvinas 2000** (5.h, 7.c) [10].

## A confirmar con el cliente

26. **Domicilio electrónico en el acta**: el Informe lo pide (2.p) y la Directora pidió quitarlo.
27. **Pago voluntario «según criterio»** en contravenciones (4.c) [4].
28. **Firma**: ¿las resoluciones y fallos los firma la Directora en el sistema (como el piloto) o el Intendente fuera del sistema con registro posterior? Define el alcance del punto 22.
29. Rubro/actividad y datos del establecimiento en contravención [1].
