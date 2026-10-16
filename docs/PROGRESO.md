# Control de progreso: cambios de la reunión

Seguimiento de los cambios pedidos por la Dirección de Faltas. Cada ítem tiene su prompt detallado en [`docs/prompts`](prompts/README.md).
Actualizar este archivo en el mismo commit en que se termina cada ítem.

**Estados:** ✅ Hecho · 🟡 En curso · ⬜ Pendiente · ⏸️ En pausa / a definir

Avance: **20 / 20**

| # | Cambio | Estado | Commit | Notas |
|---|--------|--------|--------|-------|
| 01 | [Legajo y año en inputs separados](prompts/01-legajo-y-anio-separados.md) | ✅ | 71d730b | |
| 02 | [Quitar el correo del labrado](prompts/02-quitar-correo-del-infractor.md) | ✅ | 470a082 · 68e6fbf | El correo se carga ahora desde la causa (opcional, back office). |
| 03 | [Marcas y modelos configurables](prompts/03-marcas-y-modelos-configurables.md) | ✅ | b7e7af3 · 2a47247 | Con ingreso libre si no está en la lista. |
| 04 | [Municipio emisor autocompletable](prompts/04-municipio-emisor-autocompletable.md) | ✅ | 8c2563a · 2a47247 | Buscador con ingreso libre; fallback a los 135 partidos + CABA. |
| 05 | [Ordenanzas para Directora y admin](prompts/05-ordenanzas-para-directora.md) | ✅ | 91b7f5f | |
| 06 | [Ocultar «unidades» en artículos](prompts/06-ocultar-unidades-en-articulos.md) | ✅ | 250c9f9 | También se ocultan en la API para el rol Inspector. Ticket y acta impresa no muestran importes. |
| 07 | [«Se niega a firmar» bajo la firma](prompts/07-negativa-a-firmar-bajo-la-firma.md) | ✅ | 0c04c0c | Paso 1: Presente / Ausente / NN. La negativa se marca en «Revisión y firma». |
| 08 | [Stepper con faltantes en rojo](prompts/08-stepper-con-faltantes-en-rojo.md) | ✅ | 0c04c0c | Reglas en `faltantesPorPaso` (crear-editar-utils.ts), en sintonía con `firmarActa`. |
| 09 | [«Lugar de infracción»](prompts/09-lugar-de-infraccion.md) | ✅ | 0c04c0c | Stepper, resumen, ficha de la causa y mensajes. |
| 10 | [Ocultar GPS en el bloque de ejido](prompts/10-ocultar-gps-en-ejido.md) | ✅ | 931f535 | Coordenadas se guardan pero no se muestran; ejido automático y no editable por el inspector; Faltas lo corrige desde la causa. |
| 11 | [Selección de artículos como stg](prompts/11-articulos-como-stg.md) | ✅ | 931f535 | Relevado en stg (documentado en el prompt): botón Agregar/Agregado, sin repetidos, tabla con papelera. |
| 12 | [Pago voluntario vs. Descargo vs. Ignorar](prompts/12-pago-voluntario-vs-descargo-vs-ignorar.md) | ✅ | 931f535 | Excluyentes en tránsito (contravención sigue el Informe: compatibles). Mesa con las mismas reglas que el portal. Vencido sin presentación → «Para fallo» con marca e historial. |
| 13 | [Descargo antes del fallo](prompts/13-descargo-antes-del-fallo.md) | ✅ | 931f535 | «Dictar fallo» deshabilitado + 409 en el servidor; fuera de «Para fallo» mientras esté pendiente; acceso directo al aceptar. |
| 14 | [Presentaciones en el detalle](prompts/14-presentaciones-en-el-detalle.md) | ✅ | 931f535 | Componente `TarjetaPresentacion` compartido con la bandeja. Adjuntos como enlaces (sin vista previa embebida). |
| 15 | [Subsanar datos](prompts/15-subsanar-datos.md) | ✅ | 931f535 | Requiere correr `sql/015_subsanacion.sql`. Pestañas «Acta subsanada / Acta original»; escritos, valorización y portal usan el dato vigente. |
| 16 | [Memos internos](prompts/16-memos-internos.md) | ✅ | f2fa1a1 | Pestaña «Memos internos» y acción «Memo interno» en lugar de «Nota a un área». No cambia el estado; en el legajo interno, no en el portal. |
| 17 | [Acarreos y retenciones](prompts/17-acarreos-y-retenciones.md) | ✅ | f2fa1a1 | Sección «Retenciones» como stg. Liberar = acarreo por tipo + estadía por tramos; emite boleta y deja la disposición de levantamiento en borrador si había medida. |
| 18 | [«Valores y tarifas» como stg](prompts/18-finanzas-como-stg.md) | ✅ | f2fa1a1 | Estructura y textos de stg; sin «Información de tarifas». Estadía: tramo 3–7 y 8–30 como monto fijo, desde el día 31 se suma el valor diario (a confirmar). |
| 19 | [Ocultar «Correos enviados»](prompts/19-ocultar-correos-enviados.md) | ✅ | f2fa1a1 | Solo Administrador, en Configuración → «Registro de correos». La tabla y el registro siguen. |
| 20 | [Evidencia en el acta](prompts/20-evidencia-en-el-acta.md) | ✅ | f2fa1a1 | Interruptor «Mostrar evidencia» (recordado por usuario), fotos también en actas de contravención/sustancias y en el portal, galería ampliada. El link público suma el botón «Evidencias» con las fotos (sin datos personales). |

## Otros ajustes fuera de la lista

| Cambio | Commit |
|--------|--------|
| Radio y texto alineados en «Situación del infractor» | dab2d1e |
| Correo del infractor editable desde la causa | 68e6fbf |
| Localidad antes que partido (catálogo BA + CABA, ingreso libre) y alcoholemia alineada | 2a47247 |
| Permisos editables por el Administrador: por tipo de usuario y por usuario (el del usuario tiene prioridad); Valores y tarifas para la Directora; menús del sidebar contraídos | 50ecf0b |
| Firma del infractor a pantalla completa: botón «Abrir pad de firma», casilla «El infractor se niega a firmar», botones flotantes Borrar / Listo | f2fa1a1 |
| Labrado en operativo: provincias de todo el país, campos numéricos (licencia, control interno, serie y medición), el campo enfocado sube arriba en el celular (también en el modal de artículos), aviso al salir de la pantalla final, lugar de infracción precargado entre actas y regreso al inicio al descartar | 124bd7a |
| Inicio de inspectores (móvil y escritorio): «Crear nueva acta» / «Ver mis borradores» a pantalla completa, elección de tipo si tiene varios, sin menú lateral y con Inicio / tema / Salir en la barra | 847c19a |
| Pantalla final del labrado: resumen completo, ver acta / ticket y «Listo, volver al inicio»; quita el texto de ayuda del ejido | 7b98517 |
| Móvil: barra «Acta de tránsito» con el estado y número de acta al pie de cada paso | 931f535 |
| Obligatorios: situación del infractor sin preselección, vehículo (dominio, tipo, marca, modelo) y al menos una foto; N.° de licencia pasa al paso Infractor | 718758a |
| Portal ciudadano: la vista baja al formulario o al mensaje tras cada botón; formulario modelo de descargo en .docx real; escrito obligatorio salvo que se escriba la presentación; ojo de contraseña en portal y altas de usuarios | — |
| APK del POS: Flutter fijado en 3.32.8 (AGP 8) y parche de ProGuard en flutter_inappwebview | — |
| App del POS: fotos del acta con cámara/galería nativas (image_picker), porque el input de archivo del WebView no devolvía la imagen | — |
| Escritorio: el menú lateral se abre tras 0,5 s de hover sobre la barra y se cierra al salir si se abrió así | — |
| APK del POS: firma fija desde el repo y número de versión por ejecución, para poder actualizar la app instalada | — |
| Ticket del POS: logo de la municipalidad, cortes por palabra, separadores cortos; dominio siempre en mayúsculas (`sql/021`) | — |
| Depuración: 7 toques en la lista de borradores muestran todas las actas (hasta cerrar la pestaña o «Salir»); los select ya no desplazan la pantalla al enfocarse (ej.: alcoholemia «Positivo») | — |
| App del POS: actualización automática al iniciar desde Supabase Storage (versión actual y anterior), con pantalla de progreso; publicación desde compilar-apk.bat o GitHub Actions | — |
| Imprimir ticket: modal de confirmación antes de imprimir (labrado, lista y causa) | — |
| Causa: quitar escritos en borrador/revisión y adjuntos cargados por error (no firmados, notificados ni de presentaciones), con historial | — |
| Escritos desde plantilla: precargan los [Completar:…] que la causa ya conoce (N° de acta, titular, legajo, licencia, vehículo, montos, vencimiento, N° de fallo/resolución/disposición, cuotas) | — |
| Montos por artículo en la causa (como stg): múltiplo propio o subtotal manual por artículo; requiere `sql/022_ajuste_articulos.sql` | — |
| `instalar-apk.bat`: instala en el POS un APK ya compilado | — |
| Valores del labrado: la causa guarda la UF y los múltiplos al firmar; si cambian las tarifas no se recalcula sola, sino con «Actualizar a valores vigentes» (`sql/023`) | — |
| Causa: acciones divididas en «Acciones recomendadas» (según el estado) y «Más acciones» (desplegable, siempre disponibles) | — |
| Login en la app del POS: versión de la app al pie (se lee del user agent FaltasPOS/&lt;versión&gt;) | — |
| «Seleccionar artículos»: en pantallas táctiles el buscador no toma el foco solo (el teclado aparece al tocarlo); en escritorio sigue enfocado | — |
| «Ver acta» en el POS y en pantallas táctiles: modal con el acta y botón Cerrar, en lugar de la ventana de impresión (dejaba al usuario atrapado en el visor) | — |
| Listas: selector «Lista / Tarjetas» en causas, actas, ordenanzas, pagos, retenciones, usuarios y registro de correos; la elección se recuerda en el navegador (por defecto tarjetas en pantallas &lt; 1280 px) | — |
| Exportar para Apremios: desde la bandeja (selección de causas) o desde la causa; lote numerado APR-AAAA-NNNN, PDF con remito, carátula de deuda (saldo a la fecha de exportación) y legajo sin memos; opción de derivar a «En Apremios»; constancia en el historial | — |
| Tarjetas: selector en el encabezado de la lista, tarjetas con sombra, título, «Ver detalle ›» y toda la tarjeta clickeable; sidebar por hover en 1 s con el ítem señalado bajo el puntero; botón «Más acciones» corregido | — |
| Inicio de la causa: «Esperar al infractor» (Iniciado → En notificación, o constancia de no esperar) y «Considerar notificado» (→ Notificado, con plazo y notificación «considerada»). Resto del flujo a validar con el cliente | — |
| Plantillas de escritos rediseñadas: lista con filtros, uso y «Usada por el sistema»; editor aparte con hoja A4 y membrete, campos como etiquetas de color (panel agrupado con buscador y «[» para insertar), configuración en lenguaje claro, estados de origen (recomendadas en la causa), validación en vivo, vista previa con un acta real, borrador → «Publicar cambios», historial de versiones con comparación y restauración, nueva desde cero / duplicada / importada de Word, mapa de estados, permiso «Ver plantillas» (solo lectura), Ctrl+S y aviso al salir sin guardar; requiere `sql/024_plantillas_versiones.sql` | — |
| Login: se quita el botón de acceso rápido del Administrador (sigue entrando con usuario y contraseña) | — |
| Áreas: cada tipo de acta con su responsable y su agente (Directora/Agente de Tránsito, Responsable/Agente de Contravenciones, Responsable/Agente de Sustancias). Rol «Abogada» → «Responsable»; alcance por usuario («Tipos de acta que gestiona»); login con acceso rápido por área (responsable a la izquierda, agente a la derecha); requiere `sql/025_areas_responsables.sql` | — |
| Hora del acta en hora argentina: el servidor (Vercel, UTC) la dejaba 3 h adelantada; también las fechas y horas de los escritos ([System:FECHA/HORA/TEXTOFECHA]), las fechas de marcas de tiempo y la firma | — |
| Sesión: sin sesión se vuelve al login desde cualquier pantalla privada (al navegar, con «Atrás» tras salir, al volver a la pestaña o al salir en otra pestaña); la API con 401 manda al login («Su sesión venció») en vez de quedar cargando; las pantallas privadas no se guardan en la caché del navegador | — |
| Labrado con infractor ausente: el número de documento (o CUIT) deja de ser obligatorio (pantalla y servidor); el nombre o la razón social siguen siéndolo | — |

## Fuera del alcance del prototipo

- Comparación del ejido contra la capa de Pablo.
