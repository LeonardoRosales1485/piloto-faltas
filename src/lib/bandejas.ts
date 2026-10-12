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
