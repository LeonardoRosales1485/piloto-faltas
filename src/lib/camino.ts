import { ESTADOS_PRE_FALLO } from './dominio';

/**
 * Camino que eligió el infractor una vez notificado (excluyentes en tránsito):
 * pago voluntario (renuncia a defenderse), descargo (se defiende) o ignorar (vence el plazo y va a fallo).
 */
export type Camino = { id: 'pago' | 'descargo' | 'ignorado' | 'pendiente' | 'sin_notificar'; titulo: string; fecha?: number; detalle?: string };

type Pres = { tipo: string; estado: string; date_created?: number | string | null };
type Causa = { estado_faltas?: string | null; notificada_at?: number | string | null; vence_plazo_at?: number | string | null };

export const HIST_VENCIDO = 'Plazo vencido sin presentación';

export function caminoInfractor(c: Causa, pres: Pres[], ahora = Date.now()): Camino {
  if (!c.notificada_at) return { id: 'sin_notificar', titulo: 'Todavía no fue notificado' };
  const vigentes = pres.filter((p) => p.estado !== 'rechazada').sort((a, b) => Number(a.date_created) - Number(b.date_created));
  const pago = vigentes.find((p) => ['pago_voluntario', 'cuotas'].includes(p.tipo));
  const desc = vigentes.find((p) => p.tipo === 'descargo');
  const primero = [pago, desc].filter(Boolean).sort((a, b) => Number(a!.date_created) - Number(b!.date_created))[0];
  if (primero && primero === pago) return { id: 'pago', titulo: primero.tipo === 'cuotas' ? 'Pago en cuotas' : 'Pago voluntario', fecha: Number(primero.date_created), detalle: 'Renunció a presentar descargo.' };
  if (primero) return { id: 'descargo', titulo: 'Descargo', fecha: Number(primero.date_created), detalle: 'Se defiende: ya no puede hacer el pago voluntario.' };
  const vence = Number(c.vence_plazo_at);
  if (vence && vence < ahora && ESTADOS_PRE_FALLO.includes(String(c.estado_faltas))) return { id: 'ignorado', titulo: 'Sin presentación (vencido el plazo)', fecha: vence, detalle: 'No pagó ni presentó descargo: pasa a fallo.' };
  return { id: 'pendiente', titulo: 'Todavía no eligió', fecha: vence || undefined, detalle: 'Puede pagar con beneficio o presentar descargo hasta el vencimiento.' };
}

/** Hay un descargo sin resolver (pendiente). Mientras tanto no se puede dictar el fallo. */
export function descargoPendiente(pres: Pres[]) {
  return pres.some((p) => p.tipo === 'descargo' && p.estado === 'pendiente');
}
