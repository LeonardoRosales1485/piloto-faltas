import { modulosDe, puede } from '@/lib/dominio';
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
    // Anuladas: «abandonadas» (motivo «Acta abandonada…») o «descartadas» (el resto).
    const anulacion = (body as { anulacion?: string }).anulacion;
    if (anulacion === 'abandonadas') query = query.ilike('anulada_motivo', 'Acta abandonada%');
    if (anulacion === 'descartadas') query = query.or('anulada_motivo.is.null,anulada_motivo.not.ilike."Acta abandonada*"');
    // Inspector: solo sus borradores, nunca las actas ya firmadas (minuta 20/10: sin listado ni historial de lo labrado,
    // para evitar revisiones indebidas, filtraciones o presiones en la vía pública).
    // Excepción: «debugTodas» (7 toques en la lista, «easter egg» para pruebas) solo si el admin activó
    // «Depuración en el POS» en Configuración › Funciones opcionales (permiso depuracionPos).
    const depuracion = Boolean((body as { debugTodas?: boolean }).debugTodas) && puede(user, 'depuracionPos');
    if (user.rol === 'Inspector' && !depuracion) query = query.eq('inspector_username', user.username).eq('estado_faltas', 'Borrador');
    // Inspector: solo los tipos de acta habilitados (tipo de inspector + permisos «Actas de …»).
    if (user.rol === 'Inspector') query = query.in('infraccion_tipo_nombre', modulosDe(user));
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
