import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/** Boletas por estado: a verificar (pago informado), emitidas, vencidas, definitivas. */
export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') || 'a_verificar';
  return handle(req, async ({ db }) => {
    let q = db.from('boleta').select('*, infraccion(uuid, legajo_numero_acta, infractor_nombre, infractor_razon_social, estado_faltas, medida_vigente)').order('id', { ascending: false }).limit(500);
    if (estado === 'vencidas') q = q.eq('estado', 'emitida').lt('vencimiento', Date.now());
    else if (estado !== 'todas') q = q.eq('estado', estado);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }, 'verCausas');
}
