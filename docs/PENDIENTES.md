# Pendientes del Sistema de Faltas

Relevamiento del 14/10/2026: lo que falta respecto del Informe de requerimientos (y Anexo V) y de las decisiones tomadas.
Marcar con ✅ y el commit al terminar cada ítem, igual que en [PROGRESO.md](PROGRESO.md).

**Estados:** ⬜ Pendiente · 🟡 En curso · ✅ Hecho · ⏸️ A definir con el cliente

**Prioridad sugerida:** para producción, 14 a 17 (seguridad y límites) y 6 (sin señal). Para la demo al cliente, 1, 2 y 20.

## Contravenciones y sustancias

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 1 | Datos del establecimiento (nombre de fantasía, n.° de habilitación, domicilio del local) | ⬜ | Hoy irían en los datos del infractor u observaciones. Definir con el cliente qué hacer con rubro/actividad (los modelos de acta lo traen; el Anexo V elimina «actividad económica»). |
| 2 | Hasta 10 fotos por acta | ⬜ | Hoy `MAX_IMAGENES = 5` (crear-editar-utils.ts). Ojo con el tamaño de las fotos (ver 15 y 18). |
| 3 | UF mínima/máxima y leve/grave por artículo (Anexo V) | ⏸️ | Hoy cada artículo tiene un múltiplo único; la edición de montos por causa lo cubre en parte, sin validar contra un rango. |
| 4 | Pago voluntario «según criterio» en contravención | ⏸️ | Hoy se ofrece igual que en tránsito. Confirmar si la Dirección lo habilita causa por causa. |
| 5 | Resolución de medida preventiva firmada por el Intendente | ⬜ | Registrar n.° y fecha del Sistema Integrador (reserva ≤ 24 h hábiles) y adjuntar el escaneo. Hoy: modelo provisorio BOD firmado por la Directora. |

## App del inspector

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 6 | Funcionamiento sin señal (offline / PWA) | ⬜ | Hoy requiere conexión. Incluye numeración reservada offline (T/C/S). |
| 7 | Firma digital real (P-04) | ⏸️ | Hoy simulada. |
| 8 | Dos QR (ticket → portal; PDF → sitio oficial) | ⬜ | Hoy hay uno solo. |

## Notificaciones

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 9 | Notificación en persona: cédulas por Blue Mail / notificador / SUGIT y acuses con escaneo | ⬜ | Fuera de la fase 1. Ejemplos de Blue Mail/SUGIT a definir (P-15). |

## Pagos e integraciones

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 10 | Interfaz con Malvinas 2000 (boletas y acreditación de pagos) | ⬜ | Hoy simulado. |
| 11 | Pago de varias actas vinculadas con una boleta | ⬜ | |
| 12 | Informe mensual de pagos y demás informes del Anexo V | ⬜ | Revisar cuáles faltan. |
| 13 | Depósito / playón: estadías, constancia de egreso, mercadería secuestrada | ⏸️ | Diferido (decisión 05/10). |

## Seguridad y escala (auditoría 12/10)

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 14 | Autorización por objeto (IDOR) en el portal | ⬜ | Hoy se puede abrir (y dejar notificada) una causa ajena o pagar una boleta ajena; `infraccion/save` no controla el inspector dueño. |
| 15 | Límite de 4,5 MB por pedido en Vercel | ⬜ | Adjuntos del portal (DNI) sin comprimir en base64; `/api/infraccion/imagen/paginate` devuelve la imagen dos veces. |
| 16 | Tope de 1000 filas de PostgREST | ⬜ | `/api/causas`, `/api/reportes`, presentaciones y `ciudadanoDeCausa` se cortan sin avisar. |
| 17 | Índices, transacciones y rate limit del login | ⬜ | Índices en infraccion_imagen, infraccion_ley, infraccion_dependencia, presentacion, inspector_username; escrituras sin transacción; zona horaria del servidor en hábiles y reportes. |
| 18 | Fotos en Storage en lugar de base64 en la base | ⬜ | |
| 19 | SSO real para el personal | ⬜ | |

## A definir con el cliente

| # | Pendiente | Estado | Notas |
|---|-----------|--------|-------|
| 20 | Flujo de la causa después de «Notificado» | ⏸️ | Leo lo valida con el cliente. Ya hecho: «Esperar al infractor» y «Considerar notificado». |
| 21 | Matriz de permisos final (P-22) | ⏸️ | La define BOD. |
| 22 | Tramos de estadía (montos fijos o no), acceso de la Abogada a «Valores y tarifas», lugar entre actas en la base, tipos de usuario creables/renombrables | ⏸️ | |
| 23 | Migración de datos del sistema actual (~5 años) | ⏸️ | Por ahora: sin migración. |
