import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { infraccionFromRow, infraccionToRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { Infraccion, InfraccionRow } from '@/lib/types';

async function syncRelations(
  supabase: ReturnType<typeof createServerClient>,
  infraccionId: number,
  leyesNombre: string[] | undefined,
  dependenciasNombre: string[] | undefined,
) {
  await supabase.from('infraccion_ley').delete().eq('infraccion_id', infraccionId);
  await supabase.from('infraccion_dependencia').delete().eq('infraccion_id', infraccionId);
  if (leyesNombre?.length) {
    await supabase.from('infraccion_ley').insert(
      leyesNombre.map((ley_nombre) => ({ infraccion_id: infraccionId, ley_nombre })),
    );
  }
  if (dependenciasNombre?.length) {
    await supabase.from('infraccion_dependencia').insert(
      dependenciasNombre.map((dependencia_nombre) => ({
        infraccion_id: infraccionId,
        dependencia_nombre,
      })),
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const dto = (await req.json()) as Infraccion;
    const supabase = createServerClient();

    let existing: InfraccionRow | null = null;
    if (dto.uuid) {
      const { data } = await supabase.from('infraccion').select('*').eq('uuid', dto.uuid).maybeSingle();
      existing = (data as InfraccionRow) ?? null;
    }

    const uuid = dto.uuid && dto.uuid.trim() ? dto.uuid : randomUUID();
    const row = infraccionToRow(
      { ...dto, uuid },
      existing
        ? { id: existing.id, date_created: existing.date_created, uuid: existing.uuid }
        : { date_created: Date.now(), uuid },
    );

    if (existing) {
      const { data, error } = await supabase
        .from('infraccion')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
      const saved = data as InfraccionRow;
      await syncRelations(supabase, saved.id, dto.leyesNombre, dto.dependenciasNombre);
      return jsonOk(
        infraccionFromRow(saved, dto.leyesNombre ?? [], dto.dependenciasNombre ?? []),
      );
    }

    const { data, error } = await supabase.from('infraccion').insert(row).select('*').single();
    if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
    const saved = data as InfraccionRow;
    await syncRelations(supabase, saved.id, dto.leyesNombre, dto.dependenciasNombre);
    return jsonOk(infraccionFromRow(saved, dto.leyesNombre ?? [], dto.dependenciasNombre ?? []));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
