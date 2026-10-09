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

1. Entrá como **inspector**. En el menú, en **Actas de tránsito**, elegí **Labrar acta**.
2. El sistema reserva solo el **número de acta** (por ejemplo T-001023) y el **legajo**, y toma la fecha y la hora. No se pueden cambiar.
3. Completá los pasos con **Siguiente**:
   - **Acta:** cómo está el infractor: presente, ausente, se niega a firmar o no identificado (NN).
   - **Lugar:** el botón **«Usar mi ubicación (GPS)»** completa la dirección y si el lugar está dentro o fuera del ejido urbano. Las entre calles son opcionales.
   - **Infractor:** si está presente, nombre, documento y domicilio son obligatorios. Si es una empresa, se elige **Persona jurídica** y se cargan razón social y CUIT. El correo es solo un dato de contacto.
   - **Vehículo:** dominio, tipo y licencia.
   - **Artículos:** con **«Agregar artículo»** se busca por número o palabra. Abajo se marcan las medidas: retención de licencia o de vehículo, acarreo y alcoholemia.
   - **Fotos:** hasta 5, más las observaciones.
   - **Firma:** se revisa el resumen, el infractor firma con el dedo en el recuadro y se presiona **«Firmar y confirmar»**.
4. Desde ese momento **el acta no se puede modificar**. Se imprime el **ticket con el QR** y se le entrega al infractor.

> Si el inspector se equivoca antes de firmar, usa **«Descartar acta»** e indica el motivo. Ese número queda anulado y no se vuelve a usar.

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
- **Presentar descargo**, con su escrito y pruebas.
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
