import { NextRequest } from 'next/server';
import { notificarPendientesAlVer } from '@/lib/causa-srv';
import { esTitular, handlePortal, nombreCiudadano } from '@/lib/portal-srv';
import { causaVigente } from '@/lib/subsanacion';
import { causaPorId, check } from '@/lib/srv';

type Ctx = { params: Promise<{ uuid: string }> };

/** El infractor abre un escrito: si estaba pendiente de notificación, queda notificado. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handlePortal(req, async ({ ciu, db }) => {
    const { data } = await db.from('documento').select('id, uuid, titulo, numero, contenido_html, estado, firmado_por, firmado_at, hash, infraccion_id, tipo').eq('uuid', uuid).maybeSingle();
    const doc = data as Record<string, unknown> | null;
    check(doc && doc.tipo === 'escrito' && ['firmado', 'definitivo'].includes(String(doc.estado)), 'Documento no disponible', 404);
    const c = await causaPorId(db, Number(doc!.infraccion_id));
    check(esTitular(ciu, await causaVigente(db, c)), 'Documento no disponible', 404);
    await notificarPendientesAlVer(db, c, Number(doc!.id), `${nombreCiudadano(ciu)} (portal)`);
    return doc;
  });
}
