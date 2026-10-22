import { estadoFinal, infoEstado } from './dominio';

export type FilaCausa = Record<string, unknown> & {
  id: number; uuid: string; estado_faltas: string; medida_vigente: number | null; vence_plazo_at: number | null; firmada_at: number | null;
};

export const BANDEJAS = [
  { id: 'activas', titulo: 'En curso', ayuda: 'Todas las causas que no están archivadas' },
  { id: 'medidas', titulo: 'Medidas a resolver', ayuda: 'Actas con medida preventiva sin resolución (24 h hábiles)' },
  { id: 'notificacion', titulo: 'Sin notificar', ayuda: 'Causas iniciadas que el infractor todavía no abrió' },
  { id: 'para_fallo', titulo: 'Para fallo', ayuda: 'Descargos aceptados y plazos vencidos sin presentación' },
  { id: 'pagos', titulo: 'Pagos y cuotas', ayuda: 'Esperando acreditación o en plan de cuotas' },
  { id: 'post_fallo', titulo: 'Fallo vencido', ayuda: 'Pasaron los 5 días hábiles sin pago ni apelación: derivar a Apremios' },
  { id: 'externas', titulo: 'Gestión externa', ayuda: 'En Juzgado de Paz o en Apremios' },
  { id: 'medida_vigente', titulo: 'Con medida vigente', ayuda: 'Causas con medida preventiva sin levantar' },
  { id: 'prescribir', titulo: 'Próximas a prescribir', ayuda: 'Más de 23 meses desde el labrado' },
  { id: 'archivadas', titulo: 'Archivadas', ayuda: 'Causas cerradas' },
] as const;

export type BandejaId = (typeof BANDEJAS)[number]['id'];

const MES = 30 * 24 * 3600 * 1000;

/** Plazo vencido sin presentación: el infractor ignoró el acta (va a fallo en rebeldía). */
export function vencidoSinPresentacion(c: FilaCausa, ahora = Date.now(), conPresentacion = new Set<number>()) {
  return c.estado_faltas === 'Notificado' && Number(c.vence_plazo_at) > 0 && Number(c.vence_plazo_at) < ahora && !conPresentacion.has(c.id);
}

/**
 * `pendientes`: causas con una presentación sin resolver (esas se atienden en «Presentaciones», no en «Para fallo»).
 * `conPresentacion`: causas con alguna presentación vigente (para distinguir el vencimiento sin presentación).
 */
export function enBandeja(c: FilaCausa, b: BandejaId, ahora = Date.now(), cuotasVencidas = new Set<number>(), pendientes = new Set<number>(), conPresentacion = new Set<number>()): boolean {
  const e = c.estado_faltas;
  const fin = estadoFinal(e);
  const medida = Number(c.medida_vigente) === 1;
  switch (b) {
    case 'activas': return !fin;
    case 'medidas': return medida && ['Iniciado', 'Notificado', 'En notificación'].includes(e);
    case 'notificacion': return e === 'Iniciado' || e === 'En notificación';
    case 'para_fallo': return !pendientes.has(c.id) && (e === 'Descargo' || vencidoSinPresentacion(c, ahora, conPresentacion) || (e === 'Cuotas' && cuotasVencidas.has(c.id)));
    case 'pagos': return e === 'Esp. Acreditar Pago' || e === 'Cuotas';
    case 'post_fallo': return e === 'Fallo notificado' && Number(c.vence_plazo_at) > 0 && Number(c.vence_plazo_at) < ahora;
    case 'externas': return infoEstado(e).familia === 'externo';
    case 'medida_vigente': return medida;
    case 'prescribir': return !fin && Number(c.firmada_at) > 0 && ahora - Number(c.firmada_at) > 23 * MES;
    case 'archivadas': return fin;
  }
}

// ---------------------------------------------------------------------------
// Bandejas de trabajo (minuta 20/10/2026 y especificación de Pablo, «APP-WEB-DIRECCION-DE-FALTAS» §4.1): cada causa
// está en UNA sola bandeja, calculada por el sistema según su estado y lo que tiene pendiente (el usuario no filtra).
// Los códigos siguen los de la especificación (`ACTA_NUEVA`, `PENDIENTE_FIRMA`, …) para que el prototipo sirva de
// referencia de la versión definitiva. Las bandejas de arriba (BANDEJAS) quedan como filtros de consulta.
// ---------------------------------------------------------------------------

export const BANDEJAS_TRABAJO = [
  { id: 'nuevas', codigo: 'ACTA_NUEVA', titulo: 'Nuevas', icono: 'fa-solid fa-inbox', ayuda: 'Actas iniciadas: decidir si se espera al infractor o se lo considera notificado', trabajo: true },
  { id: 'notificacion', codigo: 'PENDIENTE_NOTIFICACION', titulo: 'En notificación', icono: 'fa-solid fa-paper-plane', ayuda: 'Esperando que el infractor abra el acta en el portal o se notifique el fallo o la resolución', trabajo: false },
  { id: 'cedula', codigo: 'NOTIFICAR_CEDULA', titulo: 'Para notificar por cédula', icono: 'fa-solid fa-envelope-open-text', ayuda: 'El infractor no entró al portal en el plazo de espera: notificar por cédula (rebeldía)', trabajo: true },
  { id: 'presentaciones', codigo: 'CON_PRESENTACION', titulo: 'Descargos y presentaciones', icono: 'fa-solid fa-scale-balanced', ayuda: 'Descargos, pedidos de pago, cuotas o apelaciones sin resolver', trabajo: true },
  { id: 'pagos', codigo: 'PENDIENTE_CONFIRMACION', titulo: 'Pagos a acreditar', icono: 'fa-solid fa-money-check-dollar', ayuda: 'Pagos informados que esperan la acreditación', trabajo: true },
  { id: 'fallo', codigo: 'DICTAR_FALLO', titulo: 'Para fallo', icono: 'fa-solid fa-gavel', ayuda: 'Descargo analizado, plazo vencido sin pago ni descargo, cuotas vencidas o fallo vencido (derivar)', trabajo: true },
  { id: 'revision', codigo: 'PENDIENTE_REVISION', titulo: 'Para revisión', icono: 'fa-solid fa-file-pen', ayuda: 'Escritos en borrador o devueltos con observación: completar y enviar a firma', trabajo: true },
  { id: 'firma', codigo: 'PENDIENTE_FIRMA', titulo: 'Para firma', icono: 'fa-solid fa-file-signature', ayuda: 'Fallos, resoluciones y disposiciones para firmar (o aprobados y esperando la firma del Intendente)', trabajo: true },
  { id: 'retenciones', codigo: 'MEDIDAS_RETENCIONES', titulo: 'Medidas y retenciones', icono: 'fa-solid fa-warehouse', ayuda: 'Medidas preventivas a resolver y vehículos retenidos sin liberar', trabajo: true },
  { id: 'espera', codigo: 'EN_PLAZO', titulo: 'En plazo', icono: 'fa-solid fa-hourglass-half', ayuda: 'Sin tareas pendientes: corren los plazos del infractor (pago, descargo, cuotas, apelación)', trabajo: false },
  { id: 'externas', codigo: 'GESTION_EXTERNA', titulo: 'Gestión externa', icono: 'fa-solid fa-landmark', ayuda: 'En Juzgado de Paz o en Apremios', trabajo: false },
  { id: 'archivo', codigo: 'ARCHIVO', titulo: 'Archivo', icono: 'fa-solid fa-box-archive', ayuda: 'Causas cerradas', trabajo: false },
] as const;

export type BandejaTrabajoId = (typeof BANDEJAS_TRABAJO)[number]['id'];

export function infoBandeja(id: string | null | undefined) {
  return BANDEJAS_TRABAJO.find((b) => b.id === id) ?? null;
}

/** Lo pendiente de una causa que decide su bandeja (lo calcula el servidor). */
export type PendientesCausa = {
  presentacionPendiente: boolean;
  conPresentacion: boolean;
  escritoEnRedaccion: boolean;
  escritoParaFirma: boolean;
  pagoAVerificar: boolean;
  cuotaVencida: boolean;
};

export const DIAS_ESPERA_PORTAL = 10;
const DIA = 24 * 3600 * 1000;

/**
 * Bandeja de trabajo de la causa. El orden importa: lo que necesita una acción de Faltas va primero (firmar,
 * resolver presentaciones, acreditar pagos, completar escritos, medidas a resolver, fallo), después la espera.
 */
export function bandejaTrabajo(c: FilaCausa & { retencion_de_vehiculo?: number | null; vehiculo_liberado_at?: number | null }, p: PendientesCausa, ahora = Date.now(), diasEspera = DIAS_ESPERA_PORTAL): BandejaTrabajoId {
  const e = c.estado_faltas;
  if (estadoFinal(e)) return 'archivo';
  if (infoEstado(e).familia === 'externo') return 'externas';
  if (p.escritoParaFirma) return 'firma';
  if (p.presentacionPendiente) return 'presentaciones';
  if (p.pagoAVerificar || e === 'Esp. Acreditar Pago') return 'pagos';
  if (p.escritoEnRedaccion) return 'revision';
  const medida = Number(c.medida_vigente) === 1;
  if (medida && ['Iniciado', 'En notificación', 'Notificado'].includes(e)) return 'retenciones';
  const vencido = Number(c.vence_plazo_at) > 0 && Number(c.vence_plazo_at) < ahora;
  if (e === 'Descargo' || (e === 'Notificado' && vencido && !p.conPresentacion) || (e === 'Cuotas' && p.cuotaVencida) || (e === 'Fallo notificado' && vencido)) return 'fallo';
  if (Number(c.retencion_de_vehiculo) === 1 && !c.vehiculo_liberado_at) return 'retenciones';
  if (e === 'Iniciado') return 'nuevas';
  if (e === 'En notificación') return Number(c.firmada_at) > 0 && ahora - Number(c.firmada_at) > diasEspera * DIA ? 'cedula' : 'notificacion';
  if (e.startsWith('En notificación')) return 'notificacion';
  return 'espera';
}
