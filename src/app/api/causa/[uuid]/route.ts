import { NextRequest } from 'next/server';
import { valorizacion } from '@/lib/causa-srv';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';
import { causaPorUuid, handle } from '@/lib/srv';

type Ctx = { params: Promise<{ uuid: string }> };

/** Causa digital: todo el legajo en una respuesta (SF-05). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handle(req, async ({ db }) => {
    const c = await causaPorUuid(db, uuid);
    const [acta, hist, docs, pres, bol, notif, imgs, v] = await Promise.all([
      loadInfraccionByUuid(uuid),
      db.from('causa_historial').select('*').eq('infraccion_id', c.id).order('id', { ascending: false }),
      db.from('documento').select('id, uuid, tipo, titulo, estado, numero, fecha_numero, firmado_por, firmado_at, creado_por, date_created, observacion, archivo_nombre, presentacion_id, plantilla(categoria, codigo)').eq('infraccion_id', c.id).order('id', { ascending: false }),
      db.from('presentacion').select('*, ciudadano(nombre, apellido, razon_social, email)').eq('infraccion_id', c.id).order('id', { ascending: false }),
      db.from('boleta').select('*').eq('infraccion_id', c.id).order('id', { ascending: true }),
      db.from('notificacion').select('*').eq('infraccion_id', c.id).order('id', { ascending: false }),
      db.from('infraccion_imagen').select('uuid, preview_raw').eq('infraccion_id', c.id),
      valorizacion(db, c),
    ]);
    return {
      acta,
      historial: hist.data ?? [],
      documentos: docs.data ?? [],
      presentaciones: pres.data ?? [],
      boletas: bol.data ?? [],
      notificaciones: notif.data ?? [],
      imagenes: imgs.data ?? [],
      valorizacion: { uf: v.uf, unidades: v.unidades, multa: v.multa, leyes: v.leyes, ajustado: c.monto_ajustado, motivoAjuste: c.monto_ajuste_motivo },
    };
  }, 'verCausas');
}
