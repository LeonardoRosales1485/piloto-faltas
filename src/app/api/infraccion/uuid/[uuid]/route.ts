import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { uuid } = await ctx.params;
    const infraccion = await loadInfraccionByUuid(uuid);
    if (!infraccion) return jsonFail(404, 'Infracción no encontrada');
    // Los inspectores sólo pueden abrir sus propios borradores.
    if (user.rol === 'Inspector' && (infraccion.estadoFaltas !== 'Borrador' || infraccion.inspectorUsername !== user.username)) {
      return jsonFail(403, 'Sólo puede abrir sus propios borradores');
    }
    return jsonOk(infraccion);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
