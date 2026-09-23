import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { imagenFromRow } from '@/lib/mappers';
import { createServerClient } from '@/lib/supabase-server';
import type { ImagenRow } from '@/lib/types';

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { uuid } = await ctx.params;
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('infraccion_imagen')
      .select('*')
      .eq('uuid', uuid)
      .maybeSingle();
    if (error || !data) return jsonFail(404, 'Imagen no encontrada');
    const img = data as ImagenRow;
    const { data: inf } = await supabase
      .from('infraccion')
      .select('uuid')
      .eq('id', img.infraccion_id)
      .maybeSingle();
    return jsonOk(imagenFromRow(img, inf?.uuid ?? ''));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
