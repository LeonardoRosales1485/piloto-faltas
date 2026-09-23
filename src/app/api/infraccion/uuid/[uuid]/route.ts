import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const infraccion = await loadInfraccionByUuid(uuid);
    if (!infraccion) return jsonFail(404, 'Infracción no encontrada');
    return jsonOk(infraccion);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
