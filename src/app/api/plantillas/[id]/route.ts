import { NextRequest } from 'next/server';
import { puede } from '@/lib/dominio';
import { check, handle, must } from '@/lib/srv';

type Ctx = { params: Promise<{ id: string }> };

/** Plantilla con su borrador, historial de versiones publicadas y uso. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(req, async ({ db, user }) => {
    check(puede(user, 'verPlantillas') || puede(user, 'plantillas'), 'Sin permiso', 403);
    const { data } = await db.from('plantilla').select('*').eq('id', Number(id)).maybeSingle();
    const plantilla = must(data as Record<string, unknown> | null, 404, 'Plantilla inexistente');
    const [{ data: versiones }, { data: uso }] = await Promise.all([
      db.from('plantilla_version').select('id, version, datos_json, nota, publicada_por, publicada_at').eq('plantilla_id', Number(id)).order('version', { ascending: false }).limit(100),
      db.from('plantilla_uso').select('usos, ultimo_uso').eq('plantilla_id', Number(id)).maybeSingle(),
    ]);
    return { plantilla, versiones: versiones ?? [], uso: uso ?? { usos: 0, ultimo_uso: null } };
  }, 'verCausas');
}
