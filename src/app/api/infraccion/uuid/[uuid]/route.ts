import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { infraccionFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { InfraccionRow } from '@/lib/types';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const supabase = createServerClient();
    const { data, error } = await supabase.from('infraccion').select('*').eq('uuid', uuid).maybeSingle();
    if (error || !data) return jsonFail(404, 'Infracción no encontrada');
    const row = data as InfraccionRow;
    const { data: leyes } = await supabase
      .from('infraccion_ley')
      .select('ley_nombre')
      .eq('infraccion_id', row.id);
    const { data: deps } = await supabase
      .from('infraccion_dependencia')
      .select('dependencia_nombre')
      .eq('infraccion_id', row.id);
    return jsonOk(
      infraccionFromRow(
        row,
        (leyes ?? []).map((l) => l.ley_nombre),
        (deps ?? []).map((d) => d.dependencia_nombre),
      ),
    );
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
