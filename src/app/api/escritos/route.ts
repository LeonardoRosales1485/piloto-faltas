import { NextRequest } from 'next/server';
import { handle } from '@/lib/srv';

/** Bandeja de escritos por estado (en revisión para la Directora, borradores, devueltos, firmados). */
export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado') || 'en_revision';
  const texto = (req.nextUrl.searchParams.get('texto') || '').trim();
  return handle(req, async ({ db }) => {
    let q = db.from('documento').select('uuid, titulo, estado, numero, creado_por, firmado_por, firmado_at, date_created, date_updated, observacion, plantilla(categoria), infraccion(uuid, legajo_numero_acta, infractor_nombre, infractor_razon_social, estado_faltas)').eq('tipo', 'escrito').order('id', { ascending: false }).limit(300);
    if (estado !== 'todos') q = q.eq('estado', estado);
    if (texto) q = q.ilike('titulo', `%${texto}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const { data: cnt } = await db.from('documento').select('estado').eq('tipo', 'escrito');
    const conteos: Record<string, number> = {};
    for (const r of (cnt ?? []) as { estado: string }[]) conteos[r.estado] = (conteos[r.estado] ?? 0) + 1;
    return { items: data ?? [], conteos };
  }, 'verCausas');
}
