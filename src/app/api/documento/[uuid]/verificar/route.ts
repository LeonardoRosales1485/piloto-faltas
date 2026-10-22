import { NextRequest } from 'next/server';
import { verificarHashDocumento } from '@/lib/causa-srv';
import { handle, must } from '@/lib/srv';

type Ctx = { params: Promise<{ uuid: string }> };

/** Verifica la integridad de un escrito firmado o definitivo (minuta 20/10, hash y trazabilidad de la firma). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handle(req, async ({ db }) => {
    const { data } = await db.from('documento').select('*').eq('uuid', uuid).maybeSingle();
    const doc = must(data as Record<string, unknown> | null, 404, 'Documento inexistente');
    return verificarHashDocumento(doc);
  }, 'verCausas');
}
