import { esBoletaLiberacion } from './dominio';
import { validezLiberacionMs } from './tarifas';
import type { Db } from './srv';

/**
 * Situación de la liberación de un vehículo retenido, para el control en el corralón por QR (minuta 20/10):
 * - retenido: todavía no se emitió la boleta de acarreo y estadía.
 * - pendiente_pago: hay una boleta de liberación (o complementaria) sin acreditar.
 * - autorizar: boleta paga, falta registrar la liberación presencial en Faltas (requisitos y disposición).
 * - vigente: liberación registrada y dentro de la validez de la boleta: el corralón puede entregar.
 * - vencida: pasó la validez sin retirar: no se entrega; Faltas emite la boleta complementaria por la estadía adicional.
 * - entregado: el corralón ya entregó el vehículo.
 */
export type EstadoLiberacion = 'sin_retencion' | 'retenido' | 'pendiente_pago' | 'autorizar' | 'vigente' | 'vencida' | 'entregado';

export type BoletaLib = { estado: string; detalle_json: string | null; vencimiento: number | null; monto: number | string };

export type CausaLib = {
  id: number; retencion_de_vehiculo: number | string | null; vehiculo_liberado_at: number | string | null;
  vehiculo_liberacion_json: string | null;
};

export function datosLiberacion(c: Pick<CausaLib, 'vehiculo_liberacion_json'>): Record<string, unknown> {
  try { return JSON.parse(c.vehiculo_liberacion_json || '{}') as Record<string, unknown>; } catch { return {}; }
}

/** Boletas de liberación que cuentan: sin anuladas ni las que vencieron sin pagarse (reemplazadas por la complementaria). */
export function boletasLiberacionActivas(boletas: BoletaLib[]): BoletaLib[] {
  return boletas.filter((b) => esBoletaLiberacion(b) && !['anulada', 'vencida'].includes(b.estado));
}

export function calcularEstadoLiberacion(c: CausaLib, boletas: BoletaLib[], validezMs: number, ahora = Date.now()) {
  const json = datosLiberacion(c);
  const liberadoAt = Number(c.vehiculo_liberado_at) || null;
  const entregadoAt = Number(json.entregadoAt) || null;
  const libs = boletasLiberacionActivas(boletas);
  const pagas = libs.filter((b) => b.estado === 'definitiva');
  const candidatos = [...pagas.map((b) => Number(b.vencimiento) || 0), Number(json.vigenteHasta) || 0];
  if (!libs.length && liberadoAt) candidatos.push(liberadoAt + validezMs);
  const vigenteHasta = Math.max(0, ...candidatos) || null;
  const pagado = pagas.reduce((s, b) => s + Number(b.monto), 0);
  let estado: EstadoLiberacion;
  if (Number(c.retencion_de_vehiculo) !== 1) estado = 'sin_retencion';
  else if (entregadoAt) estado = 'entregado';
  else if (libs.some((b) => b.estado !== 'definitiva')) estado = 'pendiente_pago';
  else if (!libs.length && !liberadoAt && !json.vigenteHasta) estado = 'retenido';
  else if (vigenteHasta && ahora > vigenteHasta) estado = 'vencida';
  else estado = liberadoAt ? 'vigente' : 'autorizar';
  return { estado, vigenteHasta, liberadoAt, entregadoAt, pagado };
}

export async function estadoLiberacion(db: Db, c: CausaLib) {
  const { data } = await db.from('boleta').select('estado, detalle_json, vencimiento, monto').eq('infraccion_id', c.id);
  return calcularEstadoLiberacion(c, (data ?? []) as BoletaLib[], await validezLiberacionMs(db));
}

export const TEXTO_LIBERACION: Record<EstadoLiberacion, { titulo: string; detalle: string; color: 'ok' | 'alerta' | 'error' | 'neutro' }> = {
  sin_retencion: { titulo: 'Sin retención de vehículo', detalle: 'El acta no registra un vehículo retenido.', color: 'neutro' },
  retenido: { titulo: 'No entregar', detalle: 'El vehículo sigue retenido: la liberación todavía no se tramitó en la Dirección de Faltas.', color: 'error' },
  pendiente_pago: { titulo: 'No entregar', detalle: 'La boleta de acarreo y estadía todavía no está acreditada.', color: 'error' },
  autorizar: { titulo: 'No entregar', detalle: 'La boleta está paga, pero la liberación se registra en forma presencial en la Dirección de Faltas (requisitos y disposición de levantamiento).', color: 'alerta' },
  vigente: { titulo: 'Liberación vigente', detalle: 'Puede entregarse el vehículo. Verifique la identidad de quien retira.', color: 'ok' },
  vencida: { titulo: 'Liberación vencida', detalle: 'No entregar. Pasó la validez de la boleta sin retirar el vehículo: debe volver a la Dirección de Faltas, que emite la boleta complementaria por la estadía adicional.', color: 'error' },
  entregado: { titulo: 'Vehículo ya entregado', detalle: 'El corralón registró la entrega.', color: 'neutro' },
};
