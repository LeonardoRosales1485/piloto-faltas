import { resolverLeyes } from './dominio';
import { infraccionFromRow } from './mappers';
import { createServerClient } from './supabase-server';
import { aplicarSubsanacion, leyesVigentes, subsanacionDe } from './subsanacion';
import type { Infraccion, InfraccionRow } from './types';

/** Con `vigente`, devuelve el acta con los datos subsanados aplicados (si hubo subsanación). */
export async function loadInfraccionByUuid(uuid: string, opts: { vigente?: boolean } = {}): Promise<Infraccion | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('infraccion').select('*').eq('uuid', uuid).maybeSingle();
  if (error || !data) return null;
  const sub = opts.vigente ? await subsanacionDe(supabase, (data as InfraccionRow).id) : null;
  const row = aplicarSubsanacion(data as InfraccionRow & Record<string, unknown>, sub) as InfraccionRow;
  const { data: leyes } = await supabase.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', row.id);
  const { data: deps } = await supabase
    .from('infraccion_dependencia')
    .select('dependencia_nombre')
    .eq('infraccion_id', row.id);
  const claves = leyesVigentes((leyes ?? []).map((l) => l.ley_nombre), sub);
  const inf = infraccionFromRow(
    row,
    claves,
    (deps ?? []).map((d) => d.dependencia_nombre),
  );
  if (claves.length) {
    const { data: cat } = await supabase.from('ley').select('nombre, articulo, descripcion').eq('infraccion_tipo_id', row.infraccion_tipo_id);
    inf.leyesDetalle = resolverLeyes(claves, (cat ?? []) as { nombre: string; articulo: string; descripcion?: string }[]);
  }
  return inf;
}
