import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { leyFromRow } from '@/lib/mappers';
import { applyLeyFiltros, applyOrdenes, pageRange } from '@/lib/paginate';
import { createServerClient } from '@/lib/supabase-server';
import type { Ley, LeyRow, PaginateListModel } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    // Los inspectores no ven la valorización (unidades) de los artículos: la calcula Faltas.
    const sinValor = (l: Ley) => (user.rol === 'Inspector' ? { ...l, multiplicador: 0 } : l);
    const body = (await req.json()) as PaginateListModel;
    const { from, to, page, size } = pageRange(body);
    const supabase = createServerClient();

    let query = supabase.from('ley').select('*', { count: 'exact' });
    query = applyLeyFiltros(query as never, body) as typeof query;
    query = applyOrdenes(query as never, body.ordenes) as typeof query;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) return jsonFail(500, error.message);
    const content = ((data ?? []) as LeyRow[]).map(leyFromRow).map(sinValor);
    const totalElements = count ?? content.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    return jsonOk({ content, page, size, totalElements, totalPages });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
