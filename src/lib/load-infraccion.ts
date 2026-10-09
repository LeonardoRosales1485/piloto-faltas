import { resolverLeyes } from './dominio';
import { infraccionFromRow } from './mappers';
import { createServerClient } from './supabase-server';
import type { Infraccion, InfraccionRow } from './types';

export async function loadInfraccionByUuid(uuid: string): Promise<Infraccion | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('infraccion').select('*').eq('uuid', uuid).maybeSingle();
  if (error || !data) return null;
  const row = data as InfraccionRow;
  const { data: leyes } = await supabase.from('infraccion_ley').select('ley_nombre').eq('infraccion_id', row.id);
  const { data: deps } = await supabase
    .from('infraccion_dependencia')
    .select('dependencia_nombre')
    .eq('infraccion_id', row.id);
  const claves = (leyes ?? []).map((l) => l.ley_nombre);
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
