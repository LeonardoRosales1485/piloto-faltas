import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { infraccionFromRow } from '@/lib/mappers';
import { applyInfraccionFiltros, applyOrdenes, pageRange } from '@/lib/paginate';
import { createServerClient } from '@/lib/supabase-server';
import type { InfraccionRow, PaginateListModel } from '@/lib/types';

async function loadRelations(
  supabase: ReturnType<typeof createServerClient>,
  ids: number[],
): Promise<{ leyes: Map<number, string[]>; deps: Map<number, string[]> }> {
  const leyes = new Map<number, string[]>();
  const deps = new Map<number, string[]>();
  if (!ids.length) return { leyes, deps };

  const { data: leyRows } = await supabase
    .from('infraccion_ley')
    .select('infraccion_id, ley_nombre')
    .in('infraccion_id', ids);
  for (const r of leyRows ?? []) {
    const list = leyes.get(r.infraccion_id) ?? [];
    list.push(r.ley_nombre);
    leyes.set(r.infraccion_id, list);
  }

  const { data: depRows } = await supabase
    .from('infraccion_dependencia')
    .select('infraccion_id, dependencia_nombre')
    .in('infraccion_id', ids);
  for (const r of depRows ?? []) {
    const list = deps.get(r.infraccion_id) ?? [];
    list.push(r.dependencia_nombre);
    deps.set(r.infraccion_id, list);
  }
  return { leyes, deps };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as PaginateListModel;
    const { from, to, page, size } = pageRange(body);
    const supabase = createServerClient();

    let query = supabase.from('infraccion').select('*', { count: 'exact' });
    query = applyInfraccionFiltros(query as never, body) as typeof query;
    // Inspector: solo sus borradores. «debugTodas» (7 toques en la lista) lo levanta temporalmente para depurar en el piloto.
    if (user.rol === 'Inspector' && !(body as { debugTodas?: boolean }).debugTodas) query = query.eq('inspector_username', user.username).eq('estado_faltas', 'Borrador');
    query = applyOrdenes(query as never, body.ordenes) as typeof query;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) return jsonFail(500, error.message);

    const rows = (data ?? []) as InfraccionRow[];
    const { leyes, deps } = await loadRelations(
      supabase,
      rows.map((r) => r.id),
    );
    const content = rows.map((r) =>
      infraccionFromRow(r, leyes.get(r.id) ?? [], deps.get(r.id) ?? []),
    );
    const totalElements = count ?? content.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    return jsonOk({ content, page, size, totalElements, totalPages });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
