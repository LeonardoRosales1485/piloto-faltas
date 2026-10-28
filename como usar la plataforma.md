# Cómo usar la plataforma · Sistema de Faltas (piloto)

Guía paso a paso para recorrer un acta de tránsito de punta a punta: desde que el inspector la labra hasta que se archiva. Al final están los caminos alternativos (descargo y fallo, medida preventiva, cuotas).

## Antes de empezar

- **Sistema interno:** se entra desde la página de login (`/login`), con el usuario de cada rol.
- **Portal del ciudadano:** se entra desde `/portal`.

| Quién | Usuario de prueba | Qué hace |
|---|---|---|
| Inspector Tránsito | `inspector` / `inspector123` | Labra actas de tránsito. Entra directo a «Labrar acta» y sólo ve sus propios borradores: no ve actas firmadas ni causas |
| Inspector Contrav. | `inspector_contrav` / `inspector123` | Igual que el anterior, pero entra directo al acta de contravención |
| Directora de Tránsito | `directora` / `directora123` | Revisa y firma escritos. Sólo ve causas de **tránsito** |
| Agente de Tránsito | `operador` / `operador123` | Tramita las causas de **tránsito** |
| Responsable Contravenciones | `responsable_contrav` / `responsable123` | Como la Directora, pero para causas de **contravención** |
| Agente de Contravenciones | `agente_contrav` / `agente123` | Tramita las causas de **contravención** |
| Responsable Sustancias | `responsable_sust` / `responsable123` | Como la Directora, pero para causas de **sustancias alimenticias** |
| Agente de Sustancias | `agente_sust` / `agente123` | Tramita las causas de **sustancias alimenticias** |
| Usuario tributario | `tributario` / `tributario123` | Actualiza valores y tarifas |
| Intendente | `intendente` / `intendente123` | Solo firma fallos y resoluciones aprobados por la Dirección, o pide revisión. Entra directo a «Para firmar» |
| Administrador | `admin` / `admin123` | Configura plantillas, textos y feriados. No tiene botón de acceso rápido: se entra escribiendo usuario y contraseña |
| Ciudadano | `valeria@example.com` / `ciudadano123` (DNI 30111222) | Consulta, paga y presenta descargos |

> En la pantalla de ingreso hay botones de **acceso rápido** agrupados por área (Tránsito, Contravenciones, Sustancias): a la izquierda quien dirige el área y a la derecha el agente. Más abajo, «Inspectores y portal ciudadano».
>
> Cada usuario del back office solo ve las causas, escritos, presentaciones y pagos de su área. El área se define en **Usuarios** con «Tipos de acta que gestiona».

> Para probar el circuito completo con Valeria, cargá su **DNI 30111222** en el acta: así el acta le aparece sola en «Mis actas» del portal.

> **Con teclado:** las ventanas emergentes (ver acta, confirmaciones, formularios) se cierran con **Escape**, igual que con un clic afuera, y al cerrarse el foco vuelve al botón que las abrió. Las tablas anchas se pueden recorrer con Tab y desplazar con las flechas.

> **Alto contraste:** el botón con el ícono de medio círculo (◐ «Alto contraste») sube el contraste de textos, bordes, campos y foco, en tema claro y oscuro. En el sistema interno está en la barra lateral, arriba del botón de tema (y en el menú desplegado, fila «Contraste»); los inspectores lo tienen en la barra superior; en el portal, arriba a la derecha; y en el login, debajo del formulario. La elección queda guardada en el navegador; si nunca se eligió, se activa solo cuando el sistema operativo pide más contraste.

> **Tamaño de texto:** hay tres tamaños: normal, grande y muy grande. En el menú desplegado del sistema interno, en el portal (arriba a la derecha) y en el login están los botones **A / A+ / A++**; en la barra lateral y en la barra del inspector hay un botón con el ícono de altura de texto que pasa al tamaño siguiente. Queda guardado en el navegador. Las hojas de los escritos, el ticket y las actas para imprimir no cambian de tamaño.

---

## 1. El inspector labra el acta

1. Entrá como **inspector**. Se abre el **inicio** con dos botones grandes: **«Crear nueva acta»** e **«Imprimir último ticket»** (reimprime el último ticket firmado en ese equipo con ese usuario; muestra su número y hora). Si tenés autorizado más de un tipo de acta, el botón dice **«Generar un acta»** y después elegís el tipo (tránsito, contravención o sustancias alimenticias). Los inspectores no tienen menú lateral: la barra de arriba tiene **Inicio**, el tema y **Salir**.
2. El sistema reserva solo el **número de acta** (por ejemplo T-001023) y el **legajo**, y toma la fecha y la hora. No se pueden cambiar.
3. Completá los pasos con **Siguiente**:
   - **Acta:** número, legajo y fecha y hora (se asignan solos).
   - **Lugar de infracción:** en un operativo, queda precargado el lugar de la última acta firmada (se puede cambiar). El botón **«Usar mi ubicación (GPS)»** completa la dirección y calcula solo si el lugar está dentro o fuera del ejido urbano (las coordenadas no se muestran y el inspector no lo cambia; si no hay GPS, lo determina Faltas desde la causa con **«Corregir»**). En actas de tránsito, el **sentido de circulación** («Mano» o «Contramano») es obligatorio. Las entre calles son opcionales.
   - **Infractor:** primero la **identificación de la persona**: presente, ausente o no identificado. No viene elegida: hay que marcarla. Si después se niega a firmar, se marca en el paso de firma. Si no está identificado, no se cargan datos. Si está presente, nombre, documento y domicilio son obligatorios. Si es una empresa, se elige **Persona jurídica** y se cargan razón social y CUIT. Primero se elige la localidad y después el partido (si no está en la lista, se escribe libre). El correo no va en el acta: lo puede agregar Faltas desde la causa. En tránsito, acá también va el **N.° de licencia de conducir** y, opcionalmente, sus **categorías** (A.1.1 a G.3, como figuran en la licencia nacional; se marcan todas las que tenga). Las categorías salen en el resumen antes de firmar, en el acta y en el detalle de la causa.
   - **Vehículo:** dominio, tipo, marca y modelo son obligatorios (marca y modelo, si no están en la lista, se escriben libres). También el municipio emisor de la licencia.
   - **Artículos:** con **«Agregar artículo»** se busca por artículo o nombre y se toca **«Agregar»** en cada uno (queda «Agregado»; no se repite). Se quitan con la papelera de la tabla. El inspector no ve unidades ni importes: la valorización la hace Faltas. Abajo se marcan las medidas: retención de licencia o de vehículo y alcoholemia (el acarreo y la estadía los cobra Faltas al liberar el vehículo).
   - **Fotos:** al menos 1 y hasta 5, más las observaciones.
   - **Firma:** se revisa el resumen y se toca **«Abrir pad de firma»**: toda la pantalla queda para que el infractor firme con el dedo, con los botones **Borrar** y **Listo** abajo. Si se niega, se marca **«El infractor se niega a firmar»** (el botón del pad queda en gris). Después se presiona **«Firmar y confirmar»**.

   Si falta un dato obligatorio, el paso se marca **en rojo** en la barra de pasos (después de pasar por él o al intentar firmar), y en la firma se listan los faltantes con un enlace a cada paso.
4. Al firmar se ve una **pantalla final** con todo lo cargado, para ver el acta o imprimir el ticket, y **«Listo, volver al inicio»** (los botones están arriba, antes del resumen). En cualquier pantalla, **«← Inicio»** (arriba) lleva a la pantalla principal del inspector. Desde ese momento **el acta no se puede modificar**. Se imprime el **ticket con el QR** y se le entrega al infractor.
   - **Impresora:** en el Senraise H10S imprime directo. En el Symcode MJ-Q50 usa su impresora interna («Nyx»); en otros POS, la impresora interna por Bluetooth. Si no puede imprimir, avisa el motivo y ofrece «Imprimir con el sistema». Para revisar o ajustar la impresora de un equipo: en el login, mantener apretado «App POS v…» y usar **«Prueba de impresora»**.

> Si el inspector se equivoca antes de firmar, usa **«Descartar acta»** e indica el motivo. Ese número queda anulado y no se vuelve a usar.

> En el celular, la barra «Acta de tránsito» con el estado del borrador y el número de acta aparecen al pie de cada paso.

## 2. El acta entra como causa

Al firmar, el acta aparece sola en el sistema de Faltas como causa en estado **«Iniciado»**.

1. Entrá como **operador**. Vas a ver **Causas**, con sus bandejas: Sin notificar, Para fallo, Pagos y cuotas, etc.
2. Al tocar el número de acta se abre la **causa digital**:
   - **Pestañas:** el acta, el historial de todo lo que pasó, los escritos, las presentaciones, las boletas y las notificaciones.
   - **Panel derecho:** las acciones disponibles según el estado.

## 3. El infractor queda notificado en el portal

1. El ciudadano escanea el QR del ticket. Ve que el acta es válida y toca **«Ver y gestionar mi acta»**.
2. Si no tiene cuenta, la crea con **«Crear una cuenta»**: carga sus datos y el código que le llega por correo. En el piloto el correo es simulado y el código se muestra en pantalla.
3. Al entrar al acta, el portal le avisa que **al abrirla queda notificado**. Cuando la abre:
   - la causa pasa a **«Notificado»**;
   - empiezan a correr los plazos: **30 días corridos** en tránsito y **15** en contravención.
4. En **Mis datos** puede constituir el **domicilio electrónico** firmando la declaración jurada. Desde ahí las notificaciones siguientes le llegan por correo sin necesidad de entrar al portal.

## 4. El infractor elige qué hacer

En su acta del portal ve **«¿Qué puede hacer?»**, con las opciones que le corresponden:

- **Pagar con descuento (pago voluntario):** en tránsito, si lo elige ya no puede presentar descargo, y el portal se lo advierte.
- **Presentar descargo**: escribe su presentación en el portal (mínimo 20 caracteres) **o** adjunta el escrito firmado; una de las dos es obligatoria, junto con el DNI de ambos lados. El «formulario modelo de descargo» se descarga en Word (.docx) con el número de acta precargado. Al elegir una opción, la pantalla baja sola hasta el formulario.
- **Pedir plan de cuotas.**

Para cualquier opción debe adjuntar el **DNI de frente y de dorso**, y el **estatuto** si es una empresa.

**Camino feliz: pide pago voluntario.**

## 5. El agente resuelve la presentación

1. Como **operador**, entrá a **Presentaciones**.
2. Abrí la solicitud de pago voluntario, mirá los adjuntos y tocá **Aceptar**.
3. El sistema hace tres cosas:
   - emite la **boleta** con el 50 % de la multa más los derechos de oficina;
   - arma el **compromiso de pago** desde la plantilla;
   - pasa la causa a **«Esp. Acreditar Pago»**.

   Al ciudadano le llega la respuesta por correo.

## 6. El infractor paga y Faltas confirma

1. El ciudadano ve la boleta en el portal y la abona fuera del sistema (Malvinas 2000). Desde la causa, Faltas toca **«Informar pago»** en la boleta: queda **«a verificar»**.
2. Como **operador**, entrá a **Pagos**, pestaña **«A verificar»**, y tocá **Confirmar**. Esto equivale a la acreditación de Malvinas 2000.
3. Si se pagó todo y **no hay medida preventiva vigente**, la causa pasa sola a **«Archivo por pago»** y deja de verse en el portal. **Fin del camino feliz.**

---

## Caminos alternativos

### A. Descargo y fallo

1. El ciudadano presenta un descargo desde el portal.
2. En **Presentaciones**, el agente puede:
   - **Aceptar:** la causa pasa a **«Descargo»** y aparece en la bandeja **Para fallo**.
   - **Observar:** le explica qué falta y el ciudadano puede **reenviarlo una única vez**.
3. En la causa, el agente toca **«Dictar fallo»** y elige si es condenatorio o absolutorio. Se abre el escrito ya completado con los datos del acta:
   - completa los campos resaltados, si hay alguno;
   - toca **«Enviar a revisión»**.
4. La **Directora** (o el **Responsable** del área, si la causa es de contravención o de sustancias) entra a **Escritos y firma**, pestaña **«En revisión»**. Abre el escrito y puede **corregirlo**, **devolverlo con una observación** o **firmarlo digitalmente**. Al firmar, el sistema le asigna número.
5. De vuelta en la causa, en la pestaña Escritos, el agente toca **Notificar**. El ciudadano queda notificado del fallo cuando lo abre en el portal, o al instante si tiene domicilio electrónico.
6. Desde ahí corren **5 días hábiles**: el ciudadano puede **pagar el total** o **apelar**.
   - **Si apela** y se le concede, la causa pasa a **«En Juzgado»**.
   - **Si no hace nada**, la causa aparece en la bandeja **«Fallo vencido»** y el agente usa **«Derivar a Apremios»**.
   - **Cuando el Juzgado o Apremios informan el resultado**, se carga con **«Registrar resultado externo»**.

### B. Acta con medida preventiva (por ejemplo, retención de licencia)

1. La causa aparece en **«Medidas a resolver»**. El agente toca **«Resolución de medida preventiva»**, completa el escrito y lo envía a la Directora para que lo firme.
2. La medida sigue vigente **aunque el infractor pague**: la causa no se archiva.
3. Para levantarla, el agente genera la **«Disposición de levantamiento»** y la Directora la firma. Ahí la medida se levanta (se devuelve la licencia) y, si ya estaba todo pago, la causa se archiva sola. Si además había un vehículo retenido, después se registra su liberación en **Retenciones**.

### C. Plan de cuotas

1. El ciudadano lo pide desde el portal. El agente lo acepta y define cuántas cuotas otorga. Se emite una boleta por cuota y la causa pasa a **«Cuotas»**.
2. Si una cuota vence sin pagarse, en la causa aparece **«Continuar procedimiento»**: la causa vuelve al camino del fallo, o va a Apremios si las cuotas eran de un fallo.

---

## Próximo paso de la causa

Arriba de cada causa, el recuadro **«Próximo paso»** dice qué falta, a quién le toca (agente, Directora o Responsable, infractor u organismo externo) y tiene el botón para avanzar. Por ejemplo: con el fallo firmado, **Notificar el fallo**; si el infractor no lo abre en el portal, **Considerar notificado** (empieza a correr el plazo para pagar o apelar); con el plazo vencido, **Derivar a Apremios**.

Si la multa ya está paga o la causa está cerrada pero el **vehículo sigue retenido**, el recuadro no dice «cerrada»: indica **«Liberar el vehículo»** y el paso que falta (emitir la boleta de acarreo y estadía en Retenciones, esperar el pago, dictar y firmar la disposición de levantamiento, registrar la liberación). Mientras el vehículo esté retenido, la causa sigue mostrando **«Boleta de estadía»** aunque esté cerrada (hasta que se emita la boleta de liberación).

Lo mismo con la **licencia retenida**: con la multa paga o la causa resuelta, el próximo paso es **«Devolver la licencia: dictar la disposición de levantamiento»**. Si están retenidos el vehículo y la licencia, el recuadro muestra los dos pendientes; la misma disposición de levantamiento sirve para ambos.

## Los escritos

- **Desde la causa**, con **«Generar escrito»**, se elige una plantilla. El escrito se abre en una hoja A4 donde **todos los datos son campos**: los que la causa ya conoce (titular, DNI, domicilio, N° de acta, montos, fechas…) vienen **precargados** (subrayado punteado, marcados «de la causa» en el panel) y se pueden corregir **solo para ese escrito** (el acta no cambia); los que la causa no tiene quedan **vacíos** (en amarillo) y son obligatorios. El número y la fecha del escrito los asigna el sistema al firmar o dejar definitivo.
- **Por defecto el texto de la plantilla está bloqueado** y solo se editan los **campos**. Al lado de la hoja, el panel «Datos del escrito» muestra todos los campos e indica cuántos faltan.
- **Si hace falta cambiar el texto** en un caso puntual, el botón **«Editar todo el texto»** habilita la edición completa de **ese** escrito. Queda registrado en el historial y la plantilla no cambia.
- **Escritos que requieren revisión** (fallos, resoluciones, disposiciones): se envían a la Directora, que los firma. Los demás se dejan **definitivos** directamente.
- **Descarga:** cualquier escrito se descarga en **PDF** o en **Word (editable)**. El Word se abre con Word, LibreOffice o Google Docs; con el Bloc de notas se ven caracteres raros. Desde la causa también se descarga el **legajo completo en PDF**.
- **Plantillas:** el admin las edita en **Configuración → Plantillas de escritos**; quien redacta escritos puede consultarlas (solo lectura) desde **Escritos y firma → Plantillas**.
  - **Lista:** se filtra por categoría, tipo de acta, efecto en la causa y situación. Muestra a qué estado pasa la causa, si lleva firma, cuántos escritos se generaron y si es **«Usada por el sistema»** (fallos, compromisos, medida y levantamiento: no conviene deshabilitarlas).
  - **Nueva plantilla:** en blanco, **duplicando** una existente o **importando un Word (.docx)**.
  - **Editor:** la hoja A4 con membrete en el centro. Los campos se ven como etiquetas: **azul** = se completa solo con los datos del acta; **amarillo** = lo completa quien redacta. Se insertan desde la pestaña **Campos** (agrupados y con buscador) o escribiendo **«[»** en la hoja. Al pegar desde Word se limpia el formato sobrante.
  - **Configuración:** título, categoría, tipos de acta, a qué estado pasa la causa al quedar definitivo/firmado y **en qué estados se recomienda**. Al generar un escrito desde la causa, esas plantillas aparecen primero como «★ Recomendada».
  - **Revisión:** avisa errores (campo desconocido, sin título) que impiden publicar, y sugerencias (lleva número pero el texto no lo muestra, cambia el estado sin firma, etc.).
  - **Guardar y publicar:** «Guardar borrador» (o Ctrl+S) no afecta los escritos; recién **«Publicar cambios»** hace que los próximos escritos usen la nueva versión. Los escritos ya generados nunca cambian.
  - **Vista previa:** muestra la plantilla completada con un acta real (la más reciente o la que se indique), sin generar nada.
  - **Historial:** cada publicación queda como versión, con quién, cuándo y qué cambió; se puede comparar y restaurar.
  - **Mapa de estados:** para cada estado, qué escritos llevan a él y cuáles se recomiendan desde él.

## Otras herramientas

- **Correos enviados:** muestra todo lo que el sistema le habría enviado al ciudadano. En el piloto no salen correos reales.
- **Reportes:** actas por tipo, estado y artículo, más lo recaudado. Se pueden exportar a Excel.
- **Valores y tarifas** (usuario tributario): unidad fija, estadía, acarreo, etc.
- **Configuración** (admin): plantillas de escritos, ordenanzas, textos del portal y feriados.
- **Usuarios** (admin, en Configuración): alta, edición, cambio de contraseña y baja de usuarios. Las bajas no borran: el usuario queda inactivo.
- **Funciones opcionales** (admin, en Configuración): funciones que no son requerimiento del piloto y están ocultas por defecto. Hoy: **Seguimiento GPS** (mapa de inspectores). Al activarla aparece en el menú y el botón «GPS» en Inspectores. También **Depuración en el POS** («easter egg» para pruebas): con esto activo, en el inicio del inspector, 7 toques seguidos sobre el logo «SISTEMA DE FALTAS» de la barra superior abren la lista con todas las actas de sus tipos; se sale con «Salir» o cerrando la pestaña. La página se recarga para aplicar el cambio.
- **Roadmap de la causa**: arriba a la derecha, en el detalle de cada causa, se ve en qué etapa está (labrada, notificación, descargo/pago, fallo, cierre).
- **Auditoría** (Directora y admin): quién hizo qué y cuándo.

## Qué está simulado en el piloto

- **Ingreso:** usuario y clave locales, en lugar del usuario municipal (SSO).
- **Firma digital** del inspector y de la Directora: deja constancia de quién firmó y cuándo, con un código de verificación.
- **Correos:** quedan registrados en «Correos enviados».
- **Pagos:** Malvinas 2000 se simula: Faltas informa el pago desde la causa («Informar pago») y lo confirma en Pagos.
- **Fuera de esta fase:** notificaciones en persona (cédulas), Depósito Vehicular y funcionamiento sin señal.


## Presentaciones, fallo y subsanación (actualizado)

- **Tres caminos del infractor** una vez notificado: **pago voluntario**, **descargo** o **no hacer nada**. En tránsito son excluyentes (si pide el pago voluntario no puede presentar descargo, y al revés). Las mismas reglas valen para «Presentación en mesa». El detalle de la causa muestra el camino elegido y la etapa del recorrido lo refleja.
- **Vencido el plazo sin presentación**, la causa aparece sola en **«Para fallo»** con la marca «Sin presentación (vencido el plazo)» y queda constancia en el historial.
- **Descargo antes del fallo:** mientras haya un descargo pendiente, «Dictar fallo» está deshabilitado y la causa no figura en «Para fallo» (se marca «Presentación a resolver»). Al aceptar el descargo, el aviso ofrece **«Dictar fallo»**.
- **Presentaciones en la causa:** las pendientes se ven arriba del detalle, con el texto, los adjuntos y los botones Aceptar / Observar / Rechazar. La pestaña «Presentaciones» tiene el historial con las respuestas. La bandeja «Presentaciones» sigue disponible.
- **Subsanar datos:** se corrigen los datos del acta (infractor, vehículo, lugar, artículos, observaciones) con un motivo obligatorio, **una sola vez por causa**. El acta firmada no cambia: arriba de la ficha aparecen las pestañas **«Acta subsanada» | «Acta original»**, con los datos corregidos resaltados. Se genera la constancia, y los escritos, la valorización y el portal usan los datos corregidos. La acción pasa a «Ver subsanación».


## Memos, retenciones, tarifas y evidencia (actualizado)

- **Memos internos:** en la causa, la pestaña **«Memos internos»** (o la acción «Memo interno») guarda notas del personal de Faltas. No cambian el estado y no se ven en el portal; sí en el legajo completo interno. El estado «Espera respuesta» queda disponible desde «Cambiar estado».
- **Retenciones:** menú **«Retenciones»**: estadísticas (retenidos, liberados, montos pendiente y recaudado), filtro por fechas y listado de vehículos retenidos. La liberación va en el orden del Informe: **pago → disposición de levantamiento → liberación**.
  1. **«Emitir boleta»** muestra el total a pagar (acarreo según el tipo de vehículo + estadía según los días en depósito) y emite la boleta. El vehículo **sigue retenido**. Si la retención era la medida vigente, deja la disposición de levantamiento en borrador.
  2. La columna Estado muestra en qué va: **Boleta emitida** (falta el pago), **Falta disposición** (pagado, falta la firma de la Directora), **Listo para liberar**.
  3. Con la boleta acreditada y la disposición firmada, **«Registrar liberación»** marca el vehículo como liberado (con un detalle opcional, por ejemplo quién lo retiró). Si no corresponde cobrar acarreo y estadía, con la disposición firmada se puede **liberar sin boleta** (pide confirmación).
- **Valores y tarifas:** como en el sistema anterior: Unidad Tributaria, Acarreo (autos, motos, camiones), Medio Salario, Derecho de Oficina y Estadías por tipo de vehículo (3 a 7 días, 8 a 30 días y +31 por día). Se editan todos juntos con **«Editar»**.
- **Registro de correos:** ya no aparece en el menú general; el Administrador lo ve en Configuración → «Registro de correos».
- **Evidencia en el acta:** junto a «Ver acta» está el interruptor **«Mostrar evidencia»** para imprimir el acta con o sin las fotos (se recuerda en el equipo). Las fotos se pueden ver ampliadas tocándolas, también en el portal del infractor.


## Permisos por tipo de usuario y por usuario (Administrador)

En **Configuración → Usuarios** hay dos pestañas:

- **Tipos de usuario y permisos:** una tabla con cada permiso (Labrar actas, Ver causas, Gestionar causas, Valores y tarifas, Ordenanzas, Configuración, etc.) y una casilla por tipo de usuario. Lo que se marque define qué secciones ve ese tipo. Las casillas resaltadas difieren del valor por defecto y se pueden **restablecer**.
- **Usuarios → Editar:** abre la **vista del usuario**, con sus datos (tipo de usuario, tipos de acta si es inspector, contraseña) y todos sus permisos agrupados (Actas, Causas, Presentaciones, Escritos, Pagos, Gestión, Configuración). Cada permiso puede quedar **Según su tipo**, **Permitir** o **Denegar**, con buscador y «Restablecer todo». Lo elegido para el usuario tiene prioridad sobre su tipo.

El Administrador conserva siempre «Configuración» para no quedarse sin acceso. Los usuarios ven los cambios al volver a entrar o al recargar la página.


## Montos por artículo y escritos

- En la causa, sección «Artículos y valorización», **Editar montos por artículo** permite cambiar el múltiplo de cada artículo o marcar **Manual** y fijar un subtotal para esa causa. El catálogo de ordenanzas no cambia y queda constancia en el historial.
- Al generar un escrito desde plantilla, los datos que la causa ya tiene (N° de acta, titular, legajo, montos, vencimiento, números de fallo/resolución) quedan precargados en sus campos; el resto queda vacío para completar, y todo se puede corregir. Si después se subsana el acta, los escritos ya generados conservan lo cargado.
- En «Escritos y documentos», el botón de papelera quita un escrito en borrador o un adjunto cargado por error. Los firmados, los notificados y los que llegaron con una presentación del infractor no se pueden quitar.
- Imprimir el ticket pide confirmación antes de imprimir.

- Al firmarse el acta quedan fijos la UF y el múltiplo de cada artículo de ese momento. Si después cambian en «Valores y tarifas» u «Ordenanzas», la causa muestra un aviso y el botón **Actualizar a valores vigentes**; sin tocarlo, mantiene los valores del labrado.

## Remitir causas a Apremios

1. En **Causas**, marque las casillas de las causas a remitir (la selección se mantiene al cambiar de página o de filtros) y toque **Exportar para Apremios**. También está en cada causa, en las acciones.
2. Elija si las causas pasan a «En Apremios» y toque **Generar PDF**.
3. Se abre el informe y el diálogo de impresión: elija **Guardar como PDF** y envíelo por correo a Apremios.

El PDF trae el remito del lote (número APR-AAAA-NNNN, listado y total con espacio para la firma de la Directora) y, por cada causa, una carátula con los datos del deudor, el acta, el fallo y su notificación, los artículos y el **saldo adeudado al momento de exportar** (multa menos pagos acreditados), seguida del legajo completo sin los memos internos. Cada exportación queda en el historial de la causa con el lote y el monto.

## Al iniciar la causa: esperar al infractor o considerarlo notificado

- En «Iniciado», la acción recomendada es **Esperar al infractor**. **Sí** pasa la causa a «En notificación» (se espera que el infractor vea el acta en el portal); **No** la deja en «Iniciado» y la acción pasa a ser **Considerar notificado**.
- **Considerar notificado** (en «Iniciado» tras elegir No, o en «En notificación»): **Sí** pasa la causa a «Notificado» desde ese momento, con su plazo y la constancia en el historial; **No** la deja como está.
- Si el infractor abre el acta en el portal, la causa se notifica sola como hasta ahora.

## Opciones sandbox (Administrador, entorno de pruebas)

En **Configuración → Opciones sandbox** hay cuatro acciones. Todas piden escribir una palabra para confirmar y **no se pueden deshacer**:

- **Restablecer piloto:** deja la base como recién instalada: sin actas ni causas, solo los usuarios de prueba y la configuración de origen (plantillas de escritos originales, ordenanzas, valores y tarifas, feriados, textos del portal, catálogos, marcas y modelos de vehículos y permisos por defecto). Se pierden las ediciones de usuarios, plantillas y configuración.
- **Borrar todo:** solo datos; elimina actas, causas, escritos, presentaciones, boletas, notificaciones, correos, memos, subsanaciones y cuentas del portal, y reinicia la numeración (la próxima acta de tránsito es T-001001). Se conservan usuarios, plantillas, ordenanzas, valores y tarifas, feriados y textos del portal.
- **Resetear usuarios:** deja solo los usuarios de prueba (admin, inspectores, Directora y Agente de tránsito, Responsable y Agente de contravenciones y de sustancias, Tributario y Becario) con sus contraseñas originales.
- **Cargar datos dummy:** borra todo y carga un conjunto de prueba con las fechas corridas al día de hoy. **Datos de sistema** trae 26 actas en todas las bandejas (con fotos, firmas, escritos, pagos, memos, una subsanación y un monto ajustado); **Foto guardada** es el estado que el Administrador guardó con «Guardar estado actual como dummy» (hay una sola).

## Cambios de la reunión del 20/10/2026 (fase 1)

- **Labrado:** «Municipio emisor» (de la licencia) está ahora en el paso del infractor, junto a la licencia.
- **Inspectores:** no tienen listado de actas. El borrador se guarda solo al cambiar de paso; no hay «Guardar borrador» ni «Descartar acta». Si vuelven al inicio con un acta sin firmar (botones «Inicio» o el «atrás» de Android), se les avisa y queda como **«Acta incompleta»** (número anulado). Si cierran la app a mitad de un acta, ese borrador se da por incompleto al empezar otra acta, o solo a las 12 horas sin firmar. Desde el inicio pueden reimprimir el último ticket firmado en ese equipo.
- **Datos sin completar al llegar a «Revisión y firma» (inspector):** aparece «Faltan datos a completar, ¿desea indicar "Desconocido" en los siguientes campos?» con la lista. Si no hay artículo, hay que elegir al menos uno en ese mismo aviso. Al aceptar, se completa con «Desconocido» y el acta se registra como **«Acta incompleta»** (no se firma; número anulado). Con «Volver a completar» se sigue cargando; el aviso también se puede abrir desde la lista de faltantes del último paso.
- **Ticket y acta:** cada artículo muestra primero la descripción del hecho y después la norma. Con retención de licencia sale la leyenda de **boleta de citación del inculpado**; con retención de vehículo, la **advertencia de compactación** (textos provisorios, editables en *Configuración › Textos del portal*).
- **Portal:** un solo botón **«Pago»** (también vencido el plazo). La DD.JJ. de domicilio electrónico se ofrece al validar el correo y no se vuelve a pedir.
- **Pedidos de pago:** al aceptarlos, la Dirección elige «Con el descuento del pago voluntario» o «Monto pleno».
- **Montos:** mientras la causa está abierta se calculan con los valores vigentes; quedan fijos al emitir la boleta.
- **Descargos:** «Observar (pase a subsanar)» con pedidos de documentación frecuentes; «No admitir» reemplaza a «Rechazar».
- **Causa:** ya no existe «Desestimar»; el dominio, el lugar de la falta y el ejido no se pueden corregir.
- **Liberación:** la boleta de acarreo y estadía vale 48 horas; para registrar la entrega hay que tildar titularidad, formulario 08, seguro y licencia.
- **Solo Tránsito:** en *Configuración › Funciones opcionales*, oculta contravenciones y sustancias para la prueba piloto.

## Bandejas de trabajo y «Seguir acta» (fase 2, minuta 20/10/2026)

- **Bandejas:** el menú lateral tiene un grupo **Bandejas** con un contador por bandeja, como los correos no leídos. El sistema ubica cada causa en **una sola** bandeja según lo que tiene pendiente: *Nuevas*, *En notificación*, *Para notificar por cédula* (más de 10 días sin entrar al portal), *Descargos y presentaciones*, *Pagos a acreditar*, *Para fallo*, *Para revisión* (escritos en borrador o devueltos), *Para firma*, *Medidas y retenciones*; y de consulta *En plazo*, *Gestión externa* y *Archivo*. «Todas las causas», el primer ítem del grupo, conserva los filtros de antes.
- **Resumen:** arriba de la lista aparece «Tiene para hacer: …» con la cantidad de cada bandeja con tareas y un enlace a cada una.
- **Búsqueda:** dentro de una bandeja, el buscador recorre todas las causas y muestra en qué bandeja está cada una.
- **Seguir acta:** interruptor en la cabecera de la causa (queda guardado en el navegador, activado por defecto). Si una acción hace que la causa cambie de bandeja, la causa sigue abierta y el menú marca la bandeja nueva; desactivado, vuelve a la bandeja de origen.

## Antes de la prueba en calle (fase 3, minuta 20/10/2026)

- **Ticket de retención:** si el acta tiene retención de vehículo o de licencia, en la pantalla final del inspector (y en la causa, junto a «Ticket») aparece **«Ticket de retención (vehículo)»** o **«(licencia)»**. Lleva número de acta, dominio o licencia y QR, con el recuadro «Pegar en el parabrisas» o «Abrochar a la licencia». En el POS necesita la app **1.0.2**.
- **Reingresos:** cuando el infractor ya notificado vuelve a abrir la causa en el portal, el historial registra «Reingreso del infractor al portal» (una vez por día). No cambia la notificación ni los plazos.
- **Control de liberación por QR:** con la liberación registrada, en **Retenciones** aparece **«Constancia QR»**; la disposición de levantamiento firmada también lleva el QR. El corralón lo escanea (`/liberacion/…`) y ve **«Liberación vigente»** (hasta cuándo), **«vencida»** o **«No entregar»**. Con la liberación vigente, **«Registrar entrega»** deja constancia de quién retiró.
- **Boleta complementaria:** si la boleta de acarreo y estadía venció (48 h), no se registra la liberación ni se entrega el vehículo. En Retenciones, **«Boleta complementaria»** cobra la diferencia a hoy; si no hay diferencia, renueva la validez.
- **Confirmación manual de pagos:** en la causa (pestaña de boletas) y en **Pagos**, **«Confirmar con comprobante»** acredita el pago con el comprobante adjunto (queda en la causa) y la declaración de responsabilidad, para cuando la acreditación se demora. La boleta queda paga y **«A conciliar»** (filtro nuevo en Pagos); con **«Conciliar»** se marca acreditada o, si no llegó, vuelve a impaga.
- **Guía para inspectores:** `docs/GUIA-INSPECTORES.md`, para la capacitación.

## Después de la prueba (fase 4, minuta 20/10/2026)

> Requiere correr `sql/032_recursos_y_trazabilidad.sql` en Supabase.

- **Recursos:** solapa **«Recursos»** en la causa. **«Elevar recurso»** (también en las acciones, con el fallo notificado) registra instancia, tipo, fecha y n.° de expediente y pasa la causa a «En Juzgado». Al conceder una apelación del portal, el recurso se crea solo. Con **«Agregar movimiento»** se hace el seguimiento.
- **Sentencias:** **«Registrar sentencia»** pide el resultado y la sentencia adjunta. *Confirma* o *modifica*: anula las boletas impagas y re-emite la boleta por el monto ordenado (queda «Esp. Acreditar Pago»). *Revoca*: archivo por absolución. *Nulidad*: archivo por nulidad.
- **Informe mensual para el Tribunal de Cuentas:** en **Reportes**, al pie. Se elige el mes y lista los pagos por fecha de acreditación, con multas, derecho de oficina, acarreo y estadía (las cuotas se prorratean). Exporta a Excel (CSV) e imprime/PDF. Marca los pagos confirmados a mano que siguen a conciliar.
- **Acta con correcciones:** si la causa tiene subsanación, junto a «Ver acta» aparece **«Acta con correcciones (PDF)»**: el acta con los datos corregidos, la leyenda «ACTA CON CORRECCIONES» y la tabla de cambios. El acta original no se modifica.
- **Hash y trazabilidad:** el acta lleva al pie quién la firmó, la fecha y hora y el código de verificación. Los escritos definitivos también muestran el código, quién lo generó y cuándo. En «Escritos y documentos», **«Verificar»** recalcula el código con el texto guardado y avisa si coincide.
- **Límites de adjuntos:** PDF o imagen (JPG, PNG), hasta 3 MB por archivo, 10 archivos y 50 fojas por presentación (propuesta, en la configuración: `adjuntos_max_mb`, `adjuntos_max_archivos`, `adjuntos_max_fojas`). Las fotos se achican solas. Se controla en el portal y en el servidor (también en «Adjuntar documento», comprobantes y sentencias).
- **Vista dividida:** en las bandejas, en pantallas anchas, el botón **«Vista dividida»** muestra la lista a la izquierda y la causa elegida a la derecha. «Abrir completa» la lleva a pantalla entera. Con «Seguir acta» apagado, el panel se cierra cuando la causa cambia de bandeja.

## Decisiones del 22/10/2026

> Requiere correr `sql/033_intendente_y_decisiones.sql` en Supabase.

- **Firma del Intendente:** los **fallos y las resoluciones** los firma el Intendente. La Directora (o el Responsable del área) los revisa y, en lugar de «Firmar digitalmente», toca **«Aprobar y enviar a firma del Intendente»**: el escrito queda «Para firma del Intendente» y no se puede modificar. El Intendente entra con su usuario a una pantalla única, **«Para firmar»** (menú lateral mínimo): ve la lista, abre cada escrito y lo **firma** o **pide revisión** con una observación (vuelve a «Escritos y firma» de la Directora con esa observación). El sello del escrito dice «Intendente Municipal». Las disposiciones las sigue firmando la Directora. Qué categorías firma el Intendente se define en la configuración (`firma_intendente_categorias`).
- **Descuento del pago:** corresponde el **50 %** si el infractor **no presentó descargo** y la causa no tiene fallo, dentro o fuera de plazo. Al aceptar un pedido de pago se elige «Según corresponda» o **«Quitar el descuento»** (con el motivo en la respuesta, queda en el historial). En «Emitir boleta», el tipo «Pago» aplica la regla y «Pago sin descuento» pide el motivo. Con descargo presentado no se puede dar el descuento. Las cuotas siguen sin descuento.
- **UF:** sin cambios: los montos se actualizan solos con los valores vigentes mientras la causa está abierta y se fijan al emitir la boleta; los ajustes manuales siguen valiendo.

## Solicitud de pago y cobros por $0 (pedido del 22/10/2026)

- **El infractor no paga desde el portal.** «Solicitar pago» y «Solicitar plan de cuotas» son solo solicitudes: quedan en «Presentaciones» y las habilita un agente, la Directora o el Responsable (como hasta ahora, «Aceptar» emite las boletas). En el portal las boletas se ven, pero ya no está el botón «Pagar»: se abonan en los medios habilitados y el pago lo registra Faltas («Informar pago» / «Confirmar acreditación» o «Confirmar con comprobante»).
- **Cobro por $0:** si al emitir la boleta (desde la causa o al aceptar un pedido de pago) el total da $ 0, no se emite boleta: se genera la **«Constancia: no registra monto a abonar»** (PDF, con código de verificación), que se abre sola y queda en «Escritos y documentos» y en el portal. Lo mismo con la boleta de estadía cuando no hay días con cargo. La causa no cambia de estado: si corresponde, se archiva desde «Archivar».
- **Descartar acta (Administrador):** en la causa, «Más acciones › Descartar acta» anula el acta en cualquier estado, con motivo (por ejemplo, actas de prueba). Sale de las bandejas y del portal, y queda en el historial. Solo lo ve el usuario Administrador.
- **Actas labradas** (back office, en el menú de cada tipo de acta; antes «Mis borradores»): todas las actas del tipo. El filtro «Estado» separa **Incompleta** (el inspector salió sin firmar, cerró la app, pasaron 12 h o completó con «Desconocido») de **Anulada** (descartada a mano). En **Reportes** figuran «Actas incompletas» y «Actas descartadas» del período.

## Reunión de validación del 27/10/2026 (deploy post 1.0)

> Todo esto va solo en **piloto-faltas-post** (base `uahubgleoemcvuzuumyv`, app **Faltas Post**). `piloto-faltas` queda congelado como referencia de la 1.0. Requiere `sql/034` y `sql/035`.

**Labrado en el POS**
- Situación del infractor: **De oficio, Presente, Se dio a la fuga, No aporta datos** (y «se niega a firmar» bajo la firma). Sin «NN» ni «Ausente».
- Faltantes: el paso queda en rojo (en el celular, la barra entera) y al cambiar de paso aparece un aviso de unos segundos con lo que falta; no bloquea. Solo bloquean el **artículo** y la **foto** que exige el artículo (Ordenanzas › «Requiere foto»). Firmar con faltantes pide el motivo y completa con «Desconocido»; **«Se dio a la fuga»** firma sin datos del infractor.
- Sin «Inicio» mientras se labra. **Plazo de labrado** por tipo (Configuración › Labrado en el POS: tránsito 1 h, contravenciones y sustancias 24 h) con **«Extender tiempo»**; vencido, el acta queda **abandonada** (número anulado). Al volver a «Crear nueva acta» se retoma la abierta.
- **PIN del inspector** (Inspectores › PIN; por defecto 1234) al salir de la pantalla de firma. Pruebas: 7 toques en la barra superior descartan el acta.
- DNI → completa el N.° de licencia. Sentido de circulación opcional, hacia una de las avenidas: Av. del Libertador Gral. San Martín, Av. del Sesquicentenario, Av. Pte. Arturo Umberto Illia, Av. Gregorio Lemos o Au. Panamericana. Sin N.° de control interno. Alcoholímetros: marcas y modelos administrables.
- Tickets: el del infractor (con **medidas adoptadas**) y el **del inspector** («va adjunto con la licencia / VTV»). Encabezado «Municipio Malvinas Argentinas · Subsecretaría de Tránsito y Bromatología».

**Back office**
- **Exportar** (un solo botón en la causa): Apremios (exige la nota de Apremios firmada), Juzgado de Paz (exige el escrito «Juzgado de Paz» firmado) o Solo PDF; se eligen y ordenan las piezas. La nota de Apremios firmada deja la causa en **«Nota apremios»**.
- **Para firma** (bandeja de escritos): filtros por tipo (cédulas, fallos, resoluciones, disposiciones, Apremios, Juzgado de Paz, compromisos).
- Estados del fallo: **«Fallo a la firma»** (en revisión), **«Fallo a la firma del Intendente»** y **«Fallo registrado»** (antes «Con Fallo»).
- **Responsable de la causa:** el último usuario que la trabajó; «Cambiar» en la cabecera, con «Asignar a este usuario» para dejarlo fijo. Se ve en la lista de causas.
- **Subsanaciones múltiples** (p. ej. transferencias sucesivas): cada una con su constancia; la ficha resalta los datos corregidos frente al acta original.
- **Portal:** solo queda notificado quien tiene el mismo DNI/CUIT que el acta vigente; otro usuario (p. ej. desde el QR) la ve sin acciones. Si una subsanación cambia el DNI, la causa aparece en la cuenta del nuevo titular y sale de la del anterior.
- **Cuotas sobre el 50 %:** el plan de cuotas sigue la misma regla del descuento (se quita con motivo).
- **Fallos en UF:** el fallo condenatorio expresa la multa en unidades fijas, a liquidar al valor vigente.
- **Configuración › Membretes:** logo, título y subtítulo por tipo de documento (el que no tiene tipos es el de por defecto).
- **Portal de inspectores** (menú lateral y botón en el inicio del inspector): actas labradas, retenciones (licencias y vehículos) y playón con el estado de la liberación; solo lectura. El inspector ve solo lo suyo (actas que labró, sus retenciones y los vehículos que retuvo); la supervisión ve todo.
