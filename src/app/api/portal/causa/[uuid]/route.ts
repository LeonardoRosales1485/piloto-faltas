import { NextRequest } from 'next/server';
import { notificarActa } from '@/lib/causa-srv';
import { infoEstado, TIPOS_ACTA, tipoActa } from '@/lib/dominio';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';
import { accionesDisponibles, handlePortal, nombreCiudadano, type Presentacion } from '@/lib/portal-srv';
import { causaPorUuid, check } from '@/lib/srv';
import { causaVigente, subsanacionDe } from '@/lib/subsanacion';

type Ctx = { params: Promise<{ uuid: string }> };

const CATEGORIAS_VISIBLES = ['Fallo', 'Resolución', 'Disposición', 'Pago'];

/** Detalle de la causa para el infractor. Con ?abrir=1 abre el acta y queda notificado (PI-10). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  const abrir = req.nextUrl.searchParams.get('abrir') === '1';
  return handlePortal(req, async ({ ciu, db }) => {
    const c = await causaPorUuid(db, uuid);
    check(!['Borrador', 'Anulada'].includes(c.estado_faltas) && Number(c.visible_portal) === 1, 'Causa no disponible', 404);
    if (abrir && !c.notificada_at) await notificarActa(db, c, 'portal', nombreCiudadano(ciu));
    const cv = await causaVigente(db, c);
    const resumen = {
      uuid: c.uuid, numero: c.legajo_numero_acta, legajo: `${c.legajo_number}/${c.legajo_anio}`, fecha: c.legajo_fecha,
      tipo: tipoActa(c.infraccion_tipo_nombre), tipoTitulo: TIPOS_ACTA[tipoActa(c.infraccion_tipo_nombre)].titulo,
      lugar: [cv.domicilio_infraccion_calle, cv.domicilio_infraccion_numero].filter(Boolean).join(' '),
      estadoVisible: infoEstado(c.estado_faltas).portal, estado: c.estado_faltas, medidaVigente: Number(c.medida_vigente) === 1,
      notificadaAt: c.notificada_at, venceAt: c.vence_plazo_at, dominio: cv.vehiculo_numero_dominio,
    };
    if (!c.notificada_at) return { resumen, requiereAviso: true };
    const sub = await subsanacionDe(db, c.id);
    const [acta, pres, bol, docs, notif, imgs] = await Promise.all([
      loadInfraccionByUuid(uuid, { vigente: true }),
      db.from('presentacion').select('id, uuid, tipo, texto, estado, respuesta, reenvio_de, cuotas_solicitadas, cuotas_otorgadas, date_created, resuelta_at').eq('infraccion_id', c.id).order('id', { ascending: false }),
      db.from('boleta').select('uuid, numero, concepto, monto, vencimiento, estado, cuota_nro, total_cuotas, a_nombre_de, pagado_at').eq('infraccion_id', c.id).neq('estado', 'anulada').order('id'),
      db.from('documento').select('id, uuid, titulo, numero, firmado_at, date_created, estado, plantilla(categoria)').eq('infraccion_id', c.id).eq('tipo', 'escrito').in('estado', ['firmado', 'definitivo']).order('id', { ascending: false }),
      db.from('notificacion').select('documento_id, estado, via, fecha_resultado, objeto').eq('infraccion_id', c.id),
      db.from('infraccion_imagen').select('uuid, preview_raw').eq('infraccion_id', c.id),
    ]);
    const presentaciones = (pres.data ?? []) as unknown as Presentacion[];
    const boletas = (bol.data ?? []) as { estado: string }[];
    const activas = boletas.filter((b) => ['emitida', 'a_verificar', 'definitiva'].includes(b.estado)).length;
    const notifs = (notif.data ?? []) as { documento_id: number | null; estado: string }[];
    const documentos = ((docs.data ?? []) as unknown as { id: number; plantilla: { categoria: string } | null }[])
      .filter((d) => CATEGORIAS_VISIBLES.includes(d.plantilla?.categoria ?? '') || notifs.some((n) => n.documento_id === d.id) || d.id === sub?.documento_id)
      .map((d) => ({ ...d, pendienteNotificacion: notifs.some((n) => n.documento_id === d.id && n.estado === 'pendiente') }));
    if (acta) {
      delete (acta as Record<string, unknown>).firmaInfractor;
    }
    return {
      resumen, acta, imagenes: imgs.data ?? [], presentaciones, subsanacion: sub ? { motivo: sub.motivo, fecha: sub.date_created } : null, boletas, documentos, notificaciones: notif.data ?? [],
      acciones: accionesDisponibles(c, presentaciones, activas),
    };
  });
}
