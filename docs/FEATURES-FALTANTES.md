# Features faltantes y preguntas para definirlos

Consolidado del 14/10/2026 a partir de [ANALISIS-REQUERIMIENTOS.md](ANALISIS-REQUERIMIENTOS.md) (cobertura del Informe) y
[PENDIENTES.md](PENDIENTES.md) (pendientes técnicos y decisiones abiertas).
Cada feature trae qué falta, de dónde sale y las preguntas a responder antes de desarrollarlo.
Responder debajo de cada pregunta (✍️) y marcar el estado.

**Estados:** ⬜ Pendiente de respuesta · 💬 Respondido, listo para desarrollar · 🟡 En desarrollo · ✅ Hecho
**Tamaño:** S (horas) · M (1–3 días) · L (más de 3 días)

---

## A. Acta digital (inspector)

### A1. Hasta 10 fotos y rótulo «Imágenes de la infracción/contravención» · S · ⬜
Hoy: 5 fotos, rótulo «Imágenes y observaciones». Fuente: Informe 2.q, Anexo V.
- ¿El límite de 10 aplica igual a tránsito, contravención y sustancias? ✍️
- ¿Las fotos de la licencia (A5) cuentan dentro de las 10 o van aparte? ✍️
- ¿Mantenemos la compresión actual (1280 px) o necesitan más resolución para algún caso (p. ej. clausuras)? ✍️

### A2. Medidas preventivas de contravención completas · S · ⬜
Faltan: clausura de obra, secuestro de elementos, secuestro de animales, violación de medida. Hoy existe «Decomiso», que el Informe no menciona. Fuente: 2.r, 4.b, Anexo IV/V.
- ¿«Decomiso» se quita o se mantiene además de las del Informe? ✍️
- ¿«Clausura preventiva» del catálogo es la «Clausura» del Informe (mismo nombre o renombrar)? ✍️
- ¿Alguna medida exige un dato extra en el acta (p. ej. cantidad/descripción de lo secuestrado, lugar de depósito, faja de clausura n.°)? ✍️
- ¿Las medidas aplican igual a actas de sustancias alimenticias? ✍️

### A3. Opciones de identificación con el texto del Informe · S · ⬜
Hoy: «Presente / Ausente / NN». Informe 2.j: «Identificado o presente / Se negó a identificarse / Ausente».
- ¿Reemplazamos «NN» por «Se negó a identificarse» (sigue generando acta NN)? ✍️
- ¿«Se niega a firmar» (bajo la firma) queda como está? ✍️

### A4. Domicilio del infractor completo y obligatorio · S · ⬜
Hoy se exige el domicilio, no cada parte. Informe 2.l: calle, altura, piso/dpto, provincia, partido y ciudad.
- ¿Piso/dpto obligatorios o «si corresponde» (casa sin piso)? ✍️
- ¿Aplica también cuando el infractor «se niega a firmar» pero se identificó? ✍️
- Para personas jurídicas, ¿el domicilio es el de la sede o el del local donde se labró? ✍️

### A5. Categorías y foto de la licencia de conducir · M · ⬜
Hoy solo el número. Informe 2.m.
- ¿Lista de categorías a usar (A.1, A.2, B.1, B.2, C, D, E, G…)? ¿Selección múltiple? ✍️
- ¿Datos extra: vencimiento, jurisdicción emisora, «habilitante sí/no»? ✍️
- ¿Foto de frente y dorso, ambas obligatorias o opcionales? ✍️
- ¿Solo en tránsito o también en sustancias (transporte)? ✍️

### A6. Opción «Sin dominio» · S · ⬜
Informe 2.l y 3.a.
- ¿Es un tilde «Sin dominio» que bloquea el campo, o un valor especial? ✍️
- ¿Pide un dato alternativo (n.° de chasis/motor, descripción)? ✍️

### A7. Dependencia labrante desde el perfil del inspector · S · ⬜
Hoy se tilda a mano en el acta. Informe 2.e, Anexo II (10 dependencias).
- ¿Un inspector pertenece a una sola dependencia o puede tener varias? ✍️
- ¿El inspector puede cambiarla en el acta o queda fija? ✍️
- ¿Confirmamos las 10 dependencias del Anexo II como catálogo inicial? ✍️

### A8. Dos códigos QR · M · ⬜
Hoy un solo QR (acta pública). Informe 2.u y 5.a: ticket → login del portal; acta PDF → página oficial del Municipio.
- ¿Cuál es la URL de la «página oficial del Municipio» donde se valida el acta? ¿La hospeda el Municipio o la provee el sistema con su dominio? ✍️
- ¿El QR del ticket abre el login y, tras ingresar, va directo a esa acta? ✍️
- ¿El QR del PDF debe mostrar el acta completa o una constancia de validez (n.°, fecha, código de verificación)? ✍️

### A9. Datos del establecimiento y rubro en contravención · M · ⬜
No hay campos específicos. Los modelos de acta traen RUBRO/ACTIVIDAD; el Anexo V elimina «actividad económica».
- ¿Agregamos nombre de fantasía, n.° de habilitación y domicilio del local? ¿Cuáles obligatorios? ✍️
- ¿Rubro/actividad va o no? (Informe vs. Anexo V) ✍️
- ¿El infractor en contravención puede ser «titular» y «encargado» a la vez (dos personas)? ✍️

### A10. Domicilio electrónico en el acta · S · ⬜
El Informe lo pide (2.p); la Directora pidió quitarlo (cambio 02 del piloto).
- ¿Lo volvemos a agregar como opcional, o se mantiene solo desde la causa / el portal? ✍️
- Si se agrega, ¿el correo informado en el acta habilita la notificación electrónica o es solo contacto (sin DD.JJ.)? ✍️

### A11. Funcionamiento sin señal (offline) · L · ⬜
Hoy requiere conexión. Informe 2.h–i.
- ¿Qué tan frecuente es la falta de señal en los operativos? ¿Se labra una acta completa sin señal o solo se reserva número? ✍️
- ¿Cuántos números por tipo se reservan por adelantado en cada dispositivo (p. ej. 20 T + 20 C)? ✍️
- ¿Qué hacemos si dos dispositivos del mismo inspector quedan offline? ✍️
- ¿Se imprime el ticket offline (sin QR válido hasta sincronizar) o se espera a tener señal? ✍️
- ¿Prioridad: antes o después de la puesta en producción? ✍️

### A12. Firma digital real (P-04) · L · ⬜
Hoy simulada (inspector y Directora).
- ¿Qué mecanismo exige el Municipio: firma digital con certificado (token/AC-ONTI), firma electrónica con usuario + PIN, otro? ✍️
- ¿Aplica igual al inspector y a la Directora? ✍️

---

## B. Portal de infractores

### B1. Registro con los datos del Anexo III · S · ⬜
Faltan: fecha de nacimiento, nacionalidad, partido, provincia, calle y n.° separados, piso, dpto (física); tipo societario, código postal, piso/dpto (jurídica); confirmación de e-mail.
- ¿Todos obligatorios o algunos opcionales (piso/dpto, teléfono)? ✍️
- ¿Nacionalidad como lista o texto libre? ✍️
- ¿Lista de tipos societarios (S.A., S.R.L., S.A.S., cooperativa, asociación civil…)? ✍️

### B2. Consulta separada tránsito / contravenciones · S · ⬜
Hoy una sola búsqueda con filtro de tipo. Informe 5.c.
- ¿Dos pestañas o dos pantallas con su propio texto? ¿Nos pasan los textos de cada una? ✍️
- ¿La búsqueda por documento pide tipo (DNI/CUIT/CUIL) además del número? ✍️
- ¿Una persona ve en «Mis actas» todas sus causas de ambos tipos juntas o también separadas? ✍️

### B3. Formulario modelo de descargo en PDF · S · ⬜
Hoy .docx. Anexo V lo pide en PDF.
- ¿Ofrecemos ambos (PDF para imprimir y completar a mano, Word para completar en la PC) o solo PDF? ✍️
- ¿Nos pasan el modelo definitivo («luego se envía el speech específico»)? ✍️

### B4. Correos reales no-reply · M · ⬜
Hoy simulados (registro de correos). Informe 5.h, 7.c.
- ¿Desde qué casilla/dominio se envía (p. ej. no-reply@malvinasargentinas.gob.ar)? ¿El Municipio provee el servidor SMTP o usamos un servicio (SES, SendGrid)? ✍️
- ¿Qué correos salen: notificación del acta, respuesta a presentaciones, boleta, notificación de fallos/resoluciones, código de registro? ¿Alguno más? ✍️
- ¿Textos y firma institucional de cada correo? ✍️

### B5. Seguridad del portal (IDOR) · M · ⬜
Hoy se puede abrir (y dejar notificada) una causa ajena o pagar una boleta ajena buscando por dato. Auditoría 12/10.
- ¿Quién puede ver una causa: solo quien está registrado con el mismo documento/CUIT del infractor? ✍️
- ¿Un tercero (gestor, apoderado, titular del vehículo distinto del conductor) puede operar? ¿Cómo se acredita? ✍️
- ¿La búsqueda sin sesión muestra algo (solo «existe un acta, inicie sesión») o nada? ✍️

---

## C. Portal de inspectores y playón

### C1. Consulta de actas del inspector · M · ❌ Cancelada (minuta 20/10/2026)
**Decisión:** el inspector no tiene listado ni historial de las actas labradas (evita revisiones indebidas, filtraciones o presiones en la vía pública). Solo ve sus borradores; se quitó el modo depuración.
Hoy el inspector solo ve sus borradores. Informe 6.a.
- ¿Ve solo sus actas firmadas o todas las de su dependencia? ✍️
- ¿Qué datos ve: n.° de acta, infractor, DNI, medidas, estado de la causa? ¿Montos no? ✍️
- ¿Por cuánto tiempo hacia atrás (p. ej. últimos 90 días)? ✍️
- ¿Quitamos el «modo depuración» al terminar esto? ✍️

### C2. Registro operativo del playón · M · ⬜
Hoy «Retenciones» registra ingreso y liberación desde Faltas. Informe 6.b, 3.b.
- ¿Quién usa el playón: un usuario «Playón» nuevo, inspectores, o personal de Faltas? ✍️
- Ingreso: ¿fecha, hora, responsable y algo más (fotos del vehículo, inventario, kilometraje)? ✍️
- Egreso: ¿qué es la «constancia de egreso»? ¿Se genera en el sistema o se sube un escaneo firmado? ✍️
- ¿Hay más de un playón? ✍️

### C3. Disposición de levantamiento visible y tilde de liberación · M · ⬜
Informe 6.c–d.
- ¿El playón ve solo el PDF de la disposición firmada y un botón «Vehículo liberado»? ✍️
- ¿La liberación exige además verificar el pago de estadía/acarreo, o la disposición ya lo garantiza? ✍️
- ¿Qué pasa con los secuestros de contravención (mercadería, animales, elementos)? ¿Mismo circuito en otro depósito? ✍️

---

## D. Back office (Dirección de Faltas)

### D1. Actos firmados por el Intendente y Sistema Integrador · L · ⬜
Hoy las resoluciones y fallos los firma la Directora en el sistema. Informe 7.b, 7.d, 7.e.
- **¿Quién firma qué?** ¿Resoluciones de medida y fallos los firma el Intendente fuera del sistema, o alcanza con la firma de la Directora en el sistema? ✍️
- Reserva de número y fecha: ¿el número lo da el Sistema Integrador o nuestro sistema? ¿Formato del número? ✍️
- ¿Se puede integrar con el Sistema Integrador (API) o se carga a mano el n.° y fecha y se sube el escaneo? ✍️
- ¿El plazo de 24 h hábiles debe alertar (bandeja de vencidos)? ✍️

### D2. Solapa de acuse completa · M · ⬜
Hoy se ve la notificación y su fecha. Informe 7.b, Anexo V.
- ¿Lista de motivos de notificación fallida (la Dirección tenía 11)? ¿Nos la pasan? ✍️
- ¿Qué pasa con la causa ante una notificación negativa: reintento, nueva cédula, otro estado? ✍️
- ¿El escaneo es obligatorio para registrar el resultado? ✍️

### D3. Notificación por cédula (Blue Mail / notificador) · L · ⬜
Fuera de la fase 1.
- ¿Entra en esta etapa del piloto? ✍️
- ¿Blue Mail recibe un archivo por lote (formato)? ¿Nos pasan un ejemplo (P-15)? ✍️
- ¿El notificador municipal usa el sistema (carga el resultado) o lo carga Faltas? ✍️
- ¿SUGIT entra en este alcance? ✍️

### D4. Módulo de Estados editable · L · ⬜
Hoy los 34 estados del Anexo I están fijos. Informe 7 (Módulo de Estados), 1.d.
- ¿Qué se necesita editar: solo nombre y texto visible en el portal, o también agregar estados nuevos con su lugar en el circuito? ✍️
- Si se agrega un estado, ¿qué acciones habilita y a qué estados puede pasar? ¿Lo define la Dirección en pantalla? ✍️
- ¿Quién puede editarlo (solo Administrador / soporte BOD)? ✍️

### D5. Ordenanzas: valor en Salarios, leve/grave, mínimo y máximo, monto de PV · M · ⬜
Hoy: un múltiplo de UF por artículo. Informe 7 (Módulo de Ordenanzas), Anexo V.
- ¿Un artículo se valoriza en UF **o** en salarios (excluyente)? ¿Qué salario (SMVM, salario municipal)? ✍️
- Mínimo/máximo: ¿al dictar el fallo se elige un valor dentro del rango? ¿Y el monto del acta (estimado) cuál es: el mínimo? ✍️
- Leve/grave: ¿solo informativo o cambia montos/plazos? ✍️
- «Monto del pago voluntario» por artículo: ¿reemplaza al 50 % general? ✍️

### D6. Pago voluntario «según criterio» en contravención · S · ⬜
Hoy se ofrece siempre. Informe 4.c.
- ¿La Dirección lo habilita/deshabilita por causa, por artículo o por dependencia? ✍️
- ¿Si no está habilitado, el portal muestra la opción con un aviso o no la muestra? ✍️

### D7. Compartir escritos firmados por correo · S · ⬜
Informe 7.d, Anexo V.
- ¿A quién: solo al infractor (su correo) o a cualquier dirección que se escriba? ✍️
- ¿Sale con el PDF adjunto o con un link? ✍️
- ¿Compartir cuenta como notificación del escrito? ✍️

### D8. Vincular actas para un pago conjunto · M · ⬜
Anexo V.
- ¿Se vinculan solo actas del mismo infractor (mismo documento)? ✍️
- ¿Una sola boleta con el total, o boletas separadas con un pago conjunto? ✍️
- ¿Se cobra un derecho de oficina por acta o uno por boleta? ✍️
- ¿Al pagar, cada causa sigue su curso (archivo por pago) por separado? ✍️

### D9. Informe mensual de pagos según modelo · S · ⬜
Hay un informe de pagos por área en Reportes. Anexo V (modelo enviado el 09/01/2026).
- ¿Nos reenvían el modelo del 09/01? ✍️
- ¿«Área» = dependencia labrante, tipo de acta o ambos? ✍️
- ¿Exportable a Excel/PDF? ✍️

### D10. Interfaz con Malvinas 2000 · L · ⬜
Hoy boletas y acreditación simuladas (P-06).
- ¿Malvinas 2000 tiene API o intercambio por archivo? ¿Quién es el contacto técnico? ✍️
- ¿La boleta la genera Malvinas 2000 (y nos devuelve n.° y código de barras) o el sistema? ✍️
- ¿La acreditación de pagos llega automática (cada cuánto) o se carga a mano? ✍️

---

## E. Plataforma, seguridad y escala

### E1. Límites de tamaño y fotos en Storage · M · ⬜
Adjuntos del portal y fotos en base64 superan los 4,5 MB de Vercel; las fotos se guardan dentro de la base. Auditoría 12/10.
- ¿Podemos usar Supabase Storage (bucket privado) para fotos y adjuntos? ✍️
- ¿Tamaño máximo por adjunto aceptable para el portal (p. ej. 10 MB) y formatos (JPG, PNG, PDF)? ✍️

### E2. Tope de 1000 filas, índices, transacciones, rate limit · M · ⬜
Listas y reportes se cortan a las 1000 filas; faltan índices y transacciones; sin límite de intentos en el login. Auditoría 12/10.
- ¿Volumen esperado por año (actas y causas) para dimensionar? ✍️
- ¿Política de bloqueo del login (p. ej. 5 intentos y 15 min)? ✍️

### E3. SSO para el personal · M · ⬜
- ¿Qué proveedor usa el Municipio (Active Directory / Azure AD, Google Workspace, otro)? ✍️
- ¿Inspectores también entran por SSO o mantienen usuario propio en el POS? ✍️

### E4. Matriz de permisos final (P-22) · S · ⬜
Hoy editable por el Administrador.
- ¿Nos pasan la matriz por rol (Directora, Abogada, Administrativo, Mesa, Inspector, Playón)? ✍️
- ¿La Abogada accede a «Valores y tarifas»? ✍️
- ¿Se pueden crear o renombrar tipos de usuario? ✍️

### E5. Migración de datos del sistema actual · L · ⏸️
Decisión actual: sin migración.
- ¿Se mantiene, o hay que traer causas vivas (no prescriptas) al pasar a producción? ✍️
- Si se migra: ¿qué sistema/base origen y quién da acceso? ✍️

---

## F. Circuito de la causa

### F1. Flujo después de «Notificado» · M · ⬜
Ya hecho: «Esperar al infractor» y «Considerar notificado». El resto lo valida el cliente.
- ¿Qué acción recomendada sigue en «Notificado» (esperar plazo, emitir boleta, dictar fallo)? ✍️
- ¿Al vencer el plazo sin presentación la causa pasa sola a «Para fallo» (como hoy) o lo decide un agente? ✍️
- ¿Se repite «Esperar / Considerar notificado» para la notificación de resoluciones y fallos? ✍️

### F2. Tramos de estadía · S · ⬜
Hoy: 3–7 y 8–30 días como monto fijo; desde el día 31 se suma el valor diario.
- ¿Los tramos son montos fijos o valor por día dentro de cada tramo? ✍️
- ¿Los días 1 y 2 no se cobran? ✍️

### F3. Lugar de infracción entre actas · S · ⬜
Hoy se recuerda por usuario y dispositivo (en el navegador).
- ¿Debe guardarse en la base (compartido entre dispositivos del mismo inspector)? ✍️
