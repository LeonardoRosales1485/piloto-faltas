import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';
import { tipoVisible } from '@/lib/dominio';

/** Bandeja única de presentaciones del portal y de mesa (SF-26). */
export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') || 'pendiente';
  return handle(req, async ({ db, user }) => {
    let q = db.from('presentacion').select('*, ciudadano(nombre, apellido, razon_social, email), infraccion(infraccion_tipo_id, uuid, legajo_numero_acta, infraccion_tipo_nombre, estado_faltas, infractor_nombre, infractor_razon_social, vence_plazo_at)').order('id', { ascending: true }).limit(500);
    if (estado !== 'todas') q = q.eq('estado', estado);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const vis = (r: { infraccion?: { infraccion_tipo_id?: number } | null }) => tipoVisible(user.rol, r.infraccion?.infraccion_tipo_id);
    const filas = ((data ?? []) as { id: number; infraccion?: { infraccion_tipo_id?: number } | null }[]).filter(vis);
    const ids = filas.map((p) => p.id);
    const adj: Record<number, { uuid: string; titulo: string }[]> = {};
    if (ids.length) {
      const { data: docs } = await db.from('documento').select('uuid, titulo, presentacion_id').in('presentacion_id', ids);
      for (const d of (docs ?? []) as { uuid: string; titulo: string; presentacion_id: number }[]) (adj[d.presentacion_id] ??= []).push({ uuid: d.uuid, titulo: d.titulo });
    }
    return filas.map((p) => ({ ...p, adjuntos: adj[p.id] ?? [] }));
  }, 'verPresentaciones');
}
