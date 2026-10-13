# Cómo usar la plataforma · Sistema de Faltas (piloto)

Guía paso a paso para recorrer un acta de tránsito de punta a punta: desde que el inspector la labra hasta que se archiva. Al final están los caminos alternativos (descargo y fallo, medida preventiva, cuotas).

## Antes de empezar

- **Sistema interno:** se entra desde la página de login (`/login`), con el usuario de cada rol.
- **Portal del ciudadano:** se entra desde `/portal`.

| Quién | Usuario de prueba | Qué hace |
|---|---|---|
| Inspector Tránsito | `inspector` / `inspector123` | Labra actas de tránsito. Entra directo a «Labrar acta» y sólo ve sus propios borradores: no ve actas firmadas ni causas |
| Inspector Contrav. | `inspector_contrav` / `inspector123` | Igual que el anterior, pero entra directo al acta de contravención |
| Agente de Faltas | `operador` / `operador123` | Tramita las causas |
| Directora | `directora` / `directora123` | Revisa y firma escritos. Sólo ve causas de **tránsito** |
| Abogada | `abogada` / `abogada123` | Mismos permisos que la Directora, pero sólo ve causas de **contravención** (y sustancias alimenticias) |
| Usuario tributario | `tributario` / `tributario123` | Actualiza valores y tarifas |
| Administrador | `admin` / `admin123` | Configura plantillas, textos y feriados |
| Ciudadano | `valeria@example.com` / `ciudadano123` (DNI 30111222) | Consulta, paga y presenta descargos |

> En la pantalla de ingreso hay botones de **acceso rápido** para cada rol: un clic y entrás.

> Para probar el circuito completo con Valeria, cargá su **DNI 30111222** en el acta: así el acta le aparece sola en «Mis actas» del portal.

---

## 1. El inspector labra el acta

1. Entrá como **inspector**. Se abre el **inicio** con dos botones grandes: **«Crear nueva acta»** y **«Ver mis borradores»**. Si tenés autorizado más de un tipo de acta, el botón dice **«Generar un acta»** y después elegís el tipo (tránsito, contravención o sustancias alimenticias). Los inspectores no tienen menú lateral: la barra de arriba tiene **Inicio**, el tema y **Salir**.
2. El sistema reserva solo el **número de acta** (por ejemplo T-001023) y el **legajo**, y toma la fecha y la hora. No se pueden cambiar.
3. Completá los pasos con **Siguiente**:
   - **Acta:** cómo está el infractor: presente, ausente o no identificado (NN). No viene elegido: hay que marcarlo. Si después se niega a firmar, se marca en el paso de firma.
   - **Lugar de infracción:** en un operativo, queda precargado el lugar de la última acta firmada (se puede cambiar). El botón **«Usar mi ubicación (GPS)»** completa la dirección y calcula solo si el lugar está dentro o fuera del ejido urbano (las coordenadas no se muestran y el inspector no lo cambia; si no hay GPS, lo determina Faltas desde la causa con **«Corregir»**). Las entre calles son opcionales.
   - **Infractor:** si está presente, nombre, documento y domicilio son obligatorios. Si es una empresa, se elige **Persona jurídica** y se cargan razón social y CUIT. Primero se elige la localidad y después el partido (si no está en la lista, se escribe libre). El correo no va en el acta: lo puede agregar Faltas desde la causa. En tránsito, acá también va el **N.° de licencia de conducir**.
   - **Vehículo:** dominio, tipo, marca y modelo son obligatorios (marca y modelo, si no están en la lista, se escriben libres). También el municipio emisor de la licencia.
   - **Artículos:** con **«Agregar artículo»** se busca por artículo o nombre y se toca **«Agregar»** en cada uno (queda «Agregado»; no se repite). Se quitan con la papelera de la tabla. El inspector no ve unidades ni importes: la valorización la hace Faltas. Abajo se marcan las medidas: retención de licencia o de vehículo, acarreo y alcoholemia.
   - **Fotos:** al menos 1 y hasta 5, más las observaciones.
   - **Firma:** se revisa el resumen y se toca **«Abrir pad de firma»**: toda la pantalla queda para que el infractor firme con el dedo, con los botones **Borrar** y **Listo** abajo. Si se niega, se marca **«El infractor se niega a firmar»** (el botón del pad queda en gris). Después se presiona **«Firmar y confirmar»**.

   Si falta un dato obligatorio, el paso se marca **en rojo** en la barra de pasos (después de pasar por él o al intentar firmar), y en la firma se listan los faltantes con un enlace a cada paso.
4. Al firmar se ve una **pantalla final** con todo lo cargado, para ver el acta o imprimir el ticket, y **«Listo, volver al inicio»**. Desde ese momento **el acta no se puede modificar**. Se imprime el **ticket con el QR** y se le entrega al infractor.

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

1. En el portal, en **Boletas**, el ciudadano toca **«Pagar (simulado)»**. La boleta queda **«a verificar»**.
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
4. La **Directora** (o la **Abogada**, si la causa es de contravención) entra a **Escritos y firma**, pestaña **«En revisión»**. Abre el escrito y puede **corregirlo**, **devolverlo con una observación** o **firmarlo digitalmente**. Al firmar, el sistema le asigna número.
5. De vuelta en la causa, en la pestaña Escritos, el agente toca **Notificar**. El ciudadano queda notificado del fallo cuando lo abre en el portal, o al instante si tiene domicilio electrónico.
6. Desde ahí corren **5 días hábiles**: el ciudadano puede **pagar el total** o **apelar**.
   - **Si apela** y se le concede, la causa pasa a **«En Juzgado»**.
   - **Si no hace nada**, la causa aparece en la bandeja **«Fallo vencido»** y el agente usa **«Derivar a Apremios»**.
   - **Cuando el Juzgado o Apremios informan el resultado**, se carga con **«Registrar resultado externo»**.

### B. Acta con medida preventiva (por ejemplo, retención de licencia)

1. La causa aparece en **«Medidas a resolver»**. El agente toca **«Resolución de medida preventiva»**, completa el escrito y lo envía a la Directora para que lo firme.
2. La medida sigue vigente **aunque el infractor pague**: la causa no se archiva.
3. Para levantarla, el agente genera la **«Disposición de levantamiento»** y la Directora la firma. Ahí la medida se levanta y, si ya estaba todo pago, la causa se archiva sola.

### C. Plan de cuotas

1. El ciudadano lo pide desde el portal. El agente lo acepta y define cuántas cuotas otorga. Se emite una boleta por cuota y la causa pasa a **«Cuotas»**.
2. Si una cuota vence sin pagarse, en la causa aparece **«Continuar procedimiento»**: la causa vuelve al camino del fallo, o va a Apremios si las cuotas eran de un fallo.

---

## Los escritos

- **Desde la causa**, con **«Generar escrito»**, se elige una plantilla. El escrito se abre en una hoja A4 con los datos del acta ya completados.
- **Por defecto el texto de la plantilla está bloqueado** y solo se completan los **campos resaltados**, por ejemplo un número de expediente o un monto. Arriba de la hoja hay un panel con esos mismos campos, que indica cuántos faltan.
- **Si hace falta cambiar el texto** en un caso puntual, el botón **«Editar todo el texto»** habilita la edición completa de **ese** escrito. Queda registrado en el historial y la plantilla no cambia.
- **Escritos que requieren revisión** (fallos, resoluciones, disposiciones): se envían a la Directora, que los firma. Los demás se dejan **definitivos** directamente.
- **Descarga:** cualquier escrito se descarga en **PDF** o **DOCX**. Desde la causa también se descarga el **legajo completo en PDF**.
- **Plantillas:** se editan como admin en **Configuración → Plantillas de escritos**, con botones para insertar campos del acta y campos a completar.

## Otras herramientas

- **Correos enviados:** muestra todo lo que el sistema le habría enviado al ciudadano. En el piloto no salen correos reales.
- **Reportes:** actas por tipo, estado y artículo, más lo recaudado. Se pueden exportar a Excel.
- **Valores y tarifas** (usuario tributario): unidad fija, estadía, acarreo, etc.
- **Configuración** (admin): plantillas de escritos, ordenanzas, textos del portal y feriados.
- **Usuarios** (admin, en Configuración): alta, edición, cambio de contraseña y baja de usuarios. Las bajas no borran: el usuario queda inactivo.
- **Roadmap de la causa**: arriba a la derecha, en el detalle de cada causa, se ve en qué etapa está (labrada, notificación, descargo/pago, fallo, cierre).
- **Auditoría** (Directora y admin): quién hizo qué y cuándo.

## Qué está simulado en el piloto

- **Ingreso:** usuario y clave locales, en lugar del usuario municipal (SSO).
- **Firma digital** del inspector y de la Directora: deja constancia de quién firmó y cuándo, con un código de verificación.
- **Correos:** quedan registrados en «Correos enviados».
- **Pagos:** Malvinas 2000 se simula con el botón «Pagar (simulado)» y la confirmación en Pagos.
- **Fuera de esta fase:** notificaciones en persona (cédulas), Depósito Vehicular y funcionamiento sin señal.


## Presentaciones, fallo y subsanación (actualizado)

- **Tres caminos del infractor** una vez notificado: **pago voluntario**, **descargo** o **no hacer nada**. En tránsito son excluyentes (si pide el pago voluntario no puede presentar descargo, y al revés). Las mismas reglas valen para «Presentación en mesa». El detalle de la causa muestra el camino elegido y la etapa del recorrido lo refleja.
- **Vencido el plazo sin presentación**, la causa aparece sola en **«Para fallo»** con la marca «Sin presentación (vencido el plazo)» y queda constancia en el historial.
- **Descargo antes del fallo:** mientras haya un descargo pendiente, «Dictar fallo» está deshabilitado y la causa no figura en «Para fallo» (se marca «Presentación a resolver»). Al aceptar el descargo, el aviso ofrece **«Dictar fallo»**.
- **Presentaciones en la causa:** las pendientes se ven arriba del detalle, con el texto, los adjuntos y los botones Aceptar / Observar / Rechazar. La pestaña «Presentaciones» tiene el historial con las respuestas. La bandeja «Presentaciones» sigue disponible.
- **Subsanar datos:** se corrigen los datos del acta (infractor, vehículo, lugar, artículos, observaciones) con un motivo obligatorio, **una sola vez por causa**. El acta firmada no cambia: arriba de la ficha aparecen las pestañas **«Acta subsanada» | «Acta original»**, con los datos corregidos resaltados. Se genera la constancia, y los escritos, la valorización y el portal usan los datos corregidos. La acción pasa a «Ver subsanación».


## Memos, retenciones, tarifas y evidencia (actualizado)

- **Memos internos:** en la causa, la pestaña **«Memos internos»** (o la acción «Memo interno») guarda notas del personal de Faltas. No cambian el estado y no se ven en el portal; sí en el legajo completo interno. El estado «Espera respuesta» queda disponible desde «Cambiar estado».
- **Retenciones:** menú **«Retenciones»**: estadísticas (retenidos, liberados, montos pendiente y recaudado), filtro por fechas y listado de vehículos retenidos. **«Liberar»** muestra el total a pagar (acarreo según el tipo de vehículo + estadía según los días en depósito), emite la boleta y, si la retención era la medida vigente, deja la disposición de levantamiento en borrador.
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
- Al generar un escrito desde plantilla, los datos que la causa ya tiene (N° de acta, titular, legajo, montos, vencimiento, números de fallo/resolución) se completan solos; el resto queda para completar y todo se puede editar.
- En «Escritos y documentos», el botón de papelera quita un escrito en borrador o un adjunto cargado por error. Los firmados, los notificados y los que llegaron con una presentación del infractor no se pueden quitar.
- Imprimir el ticket pide confirmación antes de imprimir.
