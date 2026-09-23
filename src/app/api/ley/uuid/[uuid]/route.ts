import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { leyFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { LeyRow } from '@/lib/types';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const supabase = createServerClient();
    const { data, error } = await supabase.from('ley').select('*').eq('uuid', uuid).maybeSingle();
    if (error || !data) return jsonFail(404, 'Ley no encontrada');
    return jsonOk(leyFromRow(data as LeyRow));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
