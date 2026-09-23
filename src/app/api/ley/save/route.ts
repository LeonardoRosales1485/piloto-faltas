import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { leyFromRow, leyToRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { Ley, LeyRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const dto = (await req.json()) as Ley;
    const supabase = createServerClient();

    let existing: LeyRow | null = null;
    if (dto.uuid) {
      const { data } = await supabase.from('ley').select('*').eq('uuid', dto.uuid).maybeSingle();
      existing = (data as LeyRow) ?? null;
    }

    const uuid = dto.uuid && dto.uuid.trim() ? dto.uuid : randomUUID();
    const row = leyToRow({ ...dto, uuid }, existing ? { id: existing.id, uuid: existing.uuid } : { uuid });

    if (existing) {
      const { data, error } = await supabase
        .from('ley')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
      return jsonOk(leyFromRow(data as LeyRow));
    }

    const { data, error } = await supabase.from('ley').insert(row).select('*').single();
    if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
    return jsonOk(leyFromRow(data as LeyRow));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
