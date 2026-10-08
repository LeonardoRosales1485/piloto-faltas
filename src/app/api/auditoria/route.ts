import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/** Auditoría: historial de acciones por usuario y período (SF-78). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(req, async ({ db }) => {
    let q = db.from('causa_historial').select('*, infraccion(uuid, legajo_numero_acta)').order('id', { ascending: false }).limit(500);
    if (p.get('usuario')) q = q.ilike('usuario', `%${p.get('usuario')}%`);
    if (p.get('desde')) q = q.gte('fecha', new Date(`${p.get('desde')}T00:00`).getTime());
    if (p.get('hasta')) q = q.lte('fecha', new Date(`${p.get('hasta')}T23:59`).getTime());
    const { data } = await q;
    return data ?? [];
  }, 'auditoria');
}
