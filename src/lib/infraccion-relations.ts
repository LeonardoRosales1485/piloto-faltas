import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadRelationsForInfracciones(
  supabase: SupabaseClient,
  infraccionIds: number[],
): Promise<{ leyes: Map<number, string[]>; dependencias: Map<number, string[]> }> {
  const leyes = new Map<number, string[]>();
  const dependencias = new Map<number, string[]>();
  if (!infraccionIds.length) {
    return { leyes, dependencias };
  }

  const { data: leyRows } = await supabase
    .from('infraccion_ley')
    .select('infraccion_id, ley_nombre')
    .in('infraccion_id', infraccionIds);
  for (const row of leyRows ?? []) {
    const list = leyes.get(row.infraccion_id) ?? [];
    list.push(row.ley_nombre);
    leyes.set(row.infraccion_id, list);
  }

  const { data: depRows } = await supabase
    .from('infraccion_dependencia')
    .select('infraccion_id, dependencia_nombre')
    .in('infraccion_id', infraccionIds);
  for (const row of depRows ?? []) {
    const list = dependencias.get(row.infraccion_id) ?? [];
    list.push(row.dependencia_nombre);
    dependencias.set(row.infraccion_id, list);
  }

  return { leyes, dependencias };
}

export async function syncInfraccionRelations(
  supabase: SupabaseClient,
  infraccionId: number,
  leyesNombre?: string[] | null,
  dependenciasNombre?: string[] | null,
): Promise<void> {
  await supabase.from('infraccion_ley').delete().eq('infraccion_id', infraccionId);
  await supabase.from('infraccion_dependencia').delete().eq('infraccion_id', infraccionId);

  const leyes = (leyesNombre ?? []).filter((n) => n != null && String(n).trim() !== '');
  if (leyes.length) {
    await supabase.from('infraccion_ley').insert(
      leyes.map((ley_nombre) => ({ infraccion_id: infraccionId, ley_nombre })),
    );
  }

  const deps = (dependenciasNombre ?? []).filter((n) => n != null && String(n).trim() !== '');
  if (deps.length) {
    await supabase.from('infraccion_dependencia').insert(
      deps.map((dependencia_nombre) => ({ infraccion_id: infraccionId, dependencia_nombre })),
    );
  }
}
