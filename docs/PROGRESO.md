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
| 20 | [Evidencia en el acta](prompts/20-evidencia-en-el-acta.md) | ✅ | f2fa1a1 | Interruptor «Mostrar evidencia» (recordado por usuario), fotos también en actas de contravención/sustancias y en el portal, galería ampliada. El link público del QR ya no muestra las fotos: «Ver evidencias» lleva al portal, donde se ven con la cuenta del infractor (QA CONT-MOB-3). |

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
| Labrado con infractor ausente: nombre/razón social y documento/CUIT dejan de ser obligatorios (pantalla y servidor) | — |
| Permisos «Actas de tránsito / de contravención / de sustancias alimenticias» (grupo Actas) en el ABM por tipo de usuario y por usuario: definen qué actas ve y labra cada inspector en la app (por tipo de usuario se combinan con el tipo de inspector; dados al usuario, mandan). También filtran la lista de actas en el servidor | — |
| Login en dos columnas en escritorio (formulario a la izquierda, acceso rápido a la derecha) sin scroll, compacto en pantallas bajas; en celular/POS sigue en una columna | — |
| Causa: recuadro «Próximo paso» (qué falta, a quién le toca y botón para avanzar: notificar el fallo/resolución, firmar, resolver presentaciones, dictar fallo, derivar, etc.) y «Considerar notificado» para fallos, resoluciones y disposiciones que el infractor no abrió en el portal (empieza a correr el plazo) | — |
| Sin F5: la causa, las bandejas (causas, presentaciones, escritos, pagos, retenciones) y la causa en el portal se recargan solas después de cualquier acción (también hecha en otra pestaña), al volver a la pestaña y cada 20 s | — |
| Auditoría: cada usuario ve solo el historial de las causas de los tipos de acta que gestiona (el Responsable de contravenciones veía causas de tránsito y al abrirlas quedaba «Cargando causa…»). La causa que no se puede abrir (inexistente o fuera del alcance) muestra el motivo con «Volver» y «Reintentar» en lugar de quedar cargando | — |
| Escritos en borrador: [Documento:Numero] y [Documento:Fecha] se ven como «número / fecha a asignar» (etiqueta en el editor, texto en PDF y DOCX) en lugar del marcador; el sistema los completa al quedar definitivo o firmado | — |
| QA CONT-2: la Directora y los Responsables pueden labrar actas, solo de su área (los tipos de acta que gestionan); botón «Nueva acta» en la bandeja de causas para quien puede labrar. Los Agentes no labran por defecto (se habilita en Permisos) | — |
| QA CONT-4 (DOCX «en chino» al abrirlo con el Bloc de notas): el formulario modelo de descargo del portal se ofrece primero como «Imprimir o guardar en PDF» (hoja imprimible en el navegador) y aparte «Descargar en Word (editable)» con aclaración de con qué abrirlo; en el back office el botón dice «Word (editable)» y avisa con qué abrirlo | — |
| QA CONT-6: en el editor de escritos, «PDF» y «Word» quedan deshabilitados mientras haya cambios sin guardar y, en un borrador con campos a completar, hasta que se guarde al menos una vez (salen de lo guardado y se veían vacíos), con aviso | — |
| QA UI-CONT-7: causa cerrada sin señales contradictorias: el roadmap resalta en verde la etapa final («Pagada», «Archivada»…), las etapas salteadas quedan tenues (también en tema oscuro, donde las cumplidas se veían oscuras y la salteada en blanco) y el plazo no se muestra en estados finales (causa, bandeja y presentaciones) | — |
| QA UI-CONT-08: el portal encuentra las actas del infractor aunque el documento o CUIT tenga puntos, espacios o guiones (búsqueda tolerante); acta y cuenta del portal guardan el documento normalizado; `sql/026_documentos_normalizados.sql` corrige los datos existentes. Aplica igual a tránsito, contravención y sustancias | — |
| QA UI-CONT-09: un descargo rechazado cuenta como presentado: no se puede presentar otro y, en tránsito, se pierde el pago voluntario y queda la boleta sin beneficio (100 %). En contravención el pago voluntario sigue disponible (RN-41 · PI-15), a confirmar con el cliente | — |
| QA AUTH-CONT-10: portal del infractor con la misma protección de sesión que el back office: «Salir» no deja la pantalla en el historial, «Atrás», volver a la pestaña o salir en otra pestaña llevan al ingreso, un 401 cierra la sesión y las páginas del portal no se guardan en la caché del navegador | — |
| QA STEPS (labrado): al dejar un paso incompleto aparece un aviso con lo que falta; el paso en el que se está no se marca en rojo (vuelve a marcarse al salir si sigue incompleto) | — |
| Acta de contravención y sustancias (PDF): la casilla «Ejido urbano» muestra «[X] Dentro / [ ] Fuera» según la ubicación GPS (antes quedaba vacía; el acta de tránsito ya lo tenía) | — |
| Acta de tránsito: nuevo campo obligatorio «Sentido de circulación» (Mano / Contramano) en el paso «Lugar de infracción», validado en el wizard y al firmar; sale en el PDF de tránsito junto a las entre calles (QA XT02) | — |
| Plazos calculados en día argentino: antes el servidor (UTC) corría un día los vencimientos de las notificaciones posteriores a las 21 h. Vencen a las 23:59 hora argentina (QA) | — |
| PDF de contravención y sustancias con modelo propio (antes salía el de tránsito: Ley 24.449, alcoholímetro). Todas las actas traen QR de verificación (RN 2.u; apunta a la verificación pública del acta hasta que se defina la URL oficial, A8). El PDF de tránsito muestra el sentido de circulación (QA) | — |
| Inspector: navegación de vuelta más clara. «Inicio» conserva el texto en el POS; la barra de sección pasa a ser «← Inicio › Acta de …» (Inicio es botón, la sección solo título); en la pantalla final, «Ver acta», «Imprimir ticket» y «Listo, volver al inicio» van arriba del resumen y se oculta la barra de sección (QA) | — |
| Labrado: «Municipio emisor» (y «Marca») ordenados alfabéticamente (QA) | — |
| «Seguimiento GPS» oculto por defecto (no es requerimiento; el código queda). Se muestra desde «Configuración › Funciones opcionales» (administrador; clave `mostrar_seguimiento_gps`). Apagado, nadie tiene el permiso: sin menú, sin botón «GPS» en Inspectores y sin acceso a la pantalla ni a la API | — |
| Escritos: todos los datos son campos del formulario. Las variables del sistema ([Acta:…], [Causa:…], [System:…], [Usuario:…]) y los campos a completar que la causa conoce se generan como inputs **precargados** (editables solo en ese escrito; vacíos y obligatorios si la causa no tiene el dato). [Documento:Numero/Fecha] siguen automáticos. Panel «Datos del escrito» con marca «de la causa». Vista previa de plantillas y compromisos de pago adaptados | — |
| Editor de escritos: al enfocar un dato en el panel se resalta (en ámbar) su campo en la hoja y la hoja se desplaza hasta él; al enfocar un campo de la hoja se resalta su fila en el panel | — |
| Editor de escritos (escritorio): «Datos del escrito» y la hoja ocupan el alto de la pantalla, cada uno con su propio scroll; el panel ya no queda cortado con un hueco en blanco debajo | — |
| Accesibilidad, paso 1 (auditoría A11Y: A11Y-001, 002, 003, 005, 006, 008, 009, 012 y 014): en tema oscuro el azul de texto pasa a #60a5fa y los botones primarios y elementos activos con texto blanco usan un token propio (#2563eb); texto secundario más oscuro en claro (#4b5563); bordes de campos de formulario con contraste ≥3:1 (#878787 claro / #8b8b8b oscuro); links de Bootstrap legibles en oscuro; rojo de peligro #b91c1c (en oscuro #f87171 como texto, fondo sólido #b91c1c); pasos inactivos y salteados del roadmap y contador de filtros con contraste AA; foco visible global de 3px (#2563eb claro / #93c5fd oscuro, también en botones y campos); con «reducir movimiento» se anulan las transiciones y animaciones de entrada propias | — |
| Accesibilidad, paso 2 (portal y login: A11Y-004, 010, 011 y 016): el enlace al perfil del portal tiene nombre accesible también en el celular («Mi perfil (nombre)»); las bandejas de Causas, Escritos y firma y Pagos tienen un título h1 para lectores de pantalla; el registro del portal valida en la página y muestra el error debajo de cada campo (aria-invalid + aria-describedby) con un resumen anunciado y el foco en el primer campo a corregir; los errores de login del portal y del sistema interno se anuncian (role="alert"); el login interno queda dentro de un landmark main con encabezado y el acceso rápido como sección con nombre | — |

## Fuera del alcance del prototipo

- Comparación del ejido contra la capa de Pablo.
