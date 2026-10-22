import { bandejaTrabajo, BANDEJAS_TRABAJO, DIAS_ESPERA_PORTAL, type BandejaTrabajoId, type FilaCausa, type PendientesCausa } from './bandejas';
import { configNum, type Db } from './srv';

type Fila = FilaCausa & { retencion_de_vehiculo?: number | null; vehiculo_liberado_at?: number | null };

/** Lo pendiente de varias causas (presentaciones, escritos, boletas), con una consulta por tabla. */
export async function pendientesDe(db: Db, ids: number[]) {
  const ahora = Date.now();
  const vacio = (): PendientesCausa => ({ presentacionPendiente: false, conPresentacion: false, escritoEnRedaccion: false, escritoParaFirma: false, pagoAVerificar: false, cuotaVencida: false });
  const out = new Map<number, PendientesCausa>();
  const de = (id: number) => { let x = out.get(id); if (!x) { x = vacio(); out.set(id, x); } return x; };
  if (!ids.length) return { de, ahora };
  // En lotes: el filtro «in» va en la URL de PostgREST.
  for (let i = 0; i < ids.length; i += 300) {
    const lote = ids.slice(i, i + 300);
    const [pres, docs, bol] = await Promise.all([
      db.from('presentacion').select('infraccion_id, estado').in('infraccion_id', lote).neq('estado', 'rechazada'),
      db.from('documento').select('infraccion_id, estado').in('infraccion_id', lote).eq('tipo', 'escrito').in('estado', ['borrador', 'devuelto', 'en_revision', 'para_firma']),
      db.from('boleta').select('infraccion_id, estado, vencimiento').in('infraccion_id', lote).in('estado', ['a_verificar', 'emitida']),
    ]);
    for (const r of (pres.data ?? []) as { infraccion_id: number; estado: string }[]) {
      de(r.infraccion_id).conPresentacion = true;
      if (r.estado === 'pendiente') de(r.infraccion_id).presentacionPendiente = true;
    }
    for (const r of (docs.data ?? []) as { infraccion_id: number; estado: string }[]) {
      // En revisión de la Dirección o aprobado y esperando la firma del Intendente: bandeja «Para firma».
      if (r.estado === 'en_revision' || r.estado === 'para_firma') de(r.infraccion_id).escritoParaFirma = true;
      else de(r.infraccion_id).escritoEnRedaccion = true;
    }
    for (const r of (bol.data ?? []) as { infraccion_id: number; estado: string; vencimiento: number | null }[]) {
      if (r.estado === 'a_verificar') de(r.infraccion_id).pagoAVerificar = true;
      else if (Number(r.vencimiento) > 0 && Number(r.vencimiento) < ahora) de(r.infraccion_id).cuotaVencida = true;
    }
  }
  return { de, ahora };
}

/** Bandeja de trabajo de cada causa y los contadores por bandeja (minuta 20/10, bandejas con agregación). */
export async function conBandejas<T extends Fila>(db: Db, filas: T[]) {
  const { de, ahora } = await pendientesDe(db, filas.map((f) => f.id));
  const dias = await configNum(db, 'dias_espera_portal', DIAS_ESPERA_PORTAL);
  const conteos = Object.fromEntries(BANDEJAS_TRABAJO.map((b) => [b.id, 0])) as Record<BandejaTrabajoId, number>;
  const lista = filas.map((f) => {
    const p = de(f.id);
    const bandeja = bandejaTrabajo(f, p, ahora, dias);
    conteos[bandeja] += 1;
    return { ...f, bandeja, pendientes: p };
  });
  return { lista, conteos };
}

/** Columnas de la causa que necesita el cálculo de la bandeja. */
export const CAMPOS_BANDEJA = 'id, uuid, estado_faltas, medida_vigente, vence_plazo_at, firmada_at, retencion_de_vehiculo, vehiculo_liberado_at, infraccion_tipo_id';
