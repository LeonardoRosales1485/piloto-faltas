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
  return infraccionFromRow(
    row,
    (leyes ?? []).map((l) => l.ley_nombre),
    (deps ?? []).map((d) => d.dependencia_nombre),
  );
}
