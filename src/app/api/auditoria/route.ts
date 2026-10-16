import { NextRequest } from 'next/server';
import { tiposPermitidos } from '@/lib/dominio';
import { handle } from '@/lib/srv';

/**
 * Auditoría: historial de acciones por usuario y período (SF-78). Cada usuario ve solo el historial de las causas de
 * los tipos de acta que gestiona (igual que en la bandeja de causas), para no listar causas que no puede abrir.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(req, async ({ user, db }) => {
    const tipos = tiposPermitidos(user);
    const causa = tipos ? 'infraccion!inner(uuid, legajo_numero_acta, infraccion_tipo_id)' : 'infraccion(uuid, legajo_numero_acta)';
    let q = db.from('causa_historial').select(`*, ${causa}`).order('id', { ascending: false }).limit(500);
    if (tipos) q = q.in('infraccion.infraccion_tipo_id', tipos);
    if (p.get('usuario')) q = q.ilike('usuario', `%${p.get('usuario')}%`);
    if (p.get('desde')) q = q.gte('fecha', new Date(`${p.get('desde')}T00:00`).getTime());
    if (p.get('hasta')) q = q.lte('fecha', new Date(`${p.get('hasta')}T23:59`).getTime());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }, 'auditoria');
}
