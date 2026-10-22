import { NextRequest } from 'next/server';
import { causaPorId, handle, must } from '@/lib/srv';
import { firmaDelIntendente } from '@/lib/firma-srv';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { uuid } = await ctx.params;
  return handle(req, async ({ db }) => {
    const { data } = await db.from('documento').select('*, plantilla(id, titulo, categoria, codigo, estado_resultante, requiere_revision, numerable)').eq('uuid', uuid).maybeSingle();
    const doc = must(data as Record<string, unknown> | null, 404, 'Documento inexistente');
    const c = await causaPorId(db, Number(doc.infraccion_id));
    const firmaIntendente = await firmaDelIntendente(db, (doc.plantilla as { categoria?: string } | null)?.categoria);
    return { firmaIntendente, documento: doc, causa: { uuid: c.uuid, legajo_numero_acta: c.legajo_numero_acta, estado_faltas: c.estado_faltas, infractor_nombre: c.infractor_nombre ?? c.infractor_razon_social, infraccion_tipo_nombre: c.infraccion_tipo_nombre } };
  }, 'verCausas');
}
