import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { leyFromRow, leyToRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { Ley, LeyRow } from '@/lib/types';
import { puede, tipoIdDe, tipoVisible } from '@/lib/dominio';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!puede(user.rol, 'ordenanzas')) return jsonFail(403, 'No tiene permiso para modificar ordenanzas');
    const dto = (await req.json()) as Ley;
    const supabase = createServerClient();
    // La Directora administra las de tránsito; la Abogada, contravenciones y sustancias.
    if (!tipoVisible(user.rol, tipoIdDe(dto.infraccionTipoNombre))) return jsonFail(403, 'No puede modificar ordenanzas de este tipo de acta');

    let existing: LeyRow | null = null;
    if (dto.uuid) {
      const { data } = await supabase.from('ley').select('*').eq('uuid', dto.uuid).maybeSingle();
      existing = (data as LeyRow) ?? null;
      if (existing && !tipoVisible(user.rol, Number(existing.infraccion_tipo_id))) return jsonFail(403, 'No puede modificar ordenanzas de este tipo de acta');
    }

    const uuid = dto.uuid && dto.uuid.trim() ? dto.uuid : randomUUID();
    const row = leyToRow({ ...dto, uuid }, existing ? { id: existing.id, uuid: existing.uuid } : { uuid });

    console.info(`[ordenanzas] ${user.username} ${existing ? 'modificó' : 'creó'} ${dto.nombre} ${dto.articulo}`);
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
