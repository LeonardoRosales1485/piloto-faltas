import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { imagenFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { ImagenRow, PaginateListModel } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = (await req.json()) as PaginateListModel;
    let infraccionUuid = '';
    for (const f of body.filtros ?? []) {
      if (f.columna === 'uuid' || f.columna === 'infraccionUuid') {
        infraccionUuid = String(f.value);
      }
    }
    const size = !body.size || body.size <= 0 ? 50 : body.size;
    const page = body.page ?? 0;
    const supabase = createServerClient();

    const { data: inf } = await supabase
      .from('infraccion')
      .select('id, uuid')
      .eq('uuid', infraccionUuid)
      .maybeSingle();
    if (!inf) {
      return jsonOk({ content: [], page, size, totalElements: 0, totalPages: 1 });
    }

    const { data, error } = await supabase
      .from('infraccion_imagen')
      .select('*')
      .eq('infraccion_id', inf.id)
      .order('date_created', { ascending: false });
    if (error) return jsonFail(500, error.message);

    const all = ((data ?? []) as ImagenRow[]).map((img) => imagenFromRow(img, inf.uuid));
    const from = Math.min(page * size, all.length);
    const to = Math.min(from + size, all.length);
    const totalPages = Math.max(1, Math.ceil(all.length / size) || 1);
    return jsonOk({
      content: all.slice(from, to),
      page,
      size,
      totalElements: all.length,
      totalPages,
    });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
