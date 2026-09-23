import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';

type Ctx = { params: Promise<{ uuid: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const supabase = createServerClient();
    const { data } = await supabase.from('infraccion').select('id').eq('uuid', uuid).maybeSingle();
    if (!data) return jsonFail(404, 'Infracción no encontrada');
    const { error } = await supabase.from('infraccion').delete().eq('uuid', uuid);
    if (error) return jsonFail(500, error.message);
    return jsonOk(null);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
