import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { imagenFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { ImagenRow, ImgModel } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const dto = (await req.json()) as ImgModel;
    const supabase = createServerClient();
    const { data: inf } = await supabase
      .from('infraccion')
      .select('id, uuid')
      .eq('uuid', dto.infraccionUuid)
      .maybeSingle();
    if (!inf) return jsonFail(404, 'Infracción no encontrada');

    let existing: ImagenRow | null = null;
    if (dto.uuid) {
      const { data } = await supabase.from('infraccion_imagen').select('*').eq('uuid', dto.uuid).maybeSingle();
      existing = (data as ImagenRow) ?? null;
    }

    const uuid = existing?.uuid ?? randomUUID();
    const previewKey =
      dto.previewKey && dto.previewKey.trim()
        ? dto.previewKey
        : `preview/${inf.uuid}/${uuid}`;
    const fullKey =
      dto.fullKey && dto.fullKey.trim() ? dto.fullKey : `full/${inf.uuid}/${uuid}`;

    const payload = {
      uuid,
      status: dto.status ?? 1,
      date_created: existing?.date_created ?? Date.now(),
      infraccion_id: inf.id,
      preview_key: previewKey,
      full_key: fullKey,
      preview_raw: dto.previewRaw ?? null,
      full_raw: dto.fullRaw ?? null,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('infraccion_imagen')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
      return jsonOk(imagenFromRow(data as ImagenRow, inf.uuid));
    }

    const { data, error } = await supabase.from('infraccion_imagen').insert(payload).select('*').single();
    if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
    return jsonOk(imagenFromRow(data as ImagenRow, inf.uuid));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
