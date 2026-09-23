import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';
import type { ImagenRow } from '@/lib/types';

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { key: parts } = await ctx.params;
    const key = parts.join('/');
    const supabase = createServerClient();
    const { data: byPreview } = await supabase
      .from('infraccion_imagen')
      .select('*')
      .eq('preview_key', key)
      .maybeSingle();
    if (byPreview) {
      const img = byPreview as ImagenRow;
      return jsonOk(img.preview_raw);
    }
    const { data: byFull } = await supabase
      .from('infraccion_imagen')
      .select('*')
      .eq('full_key', key)
      .maybeSingle();
    if (byFull) {
      const img = byFull as ImagenRow;
      return jsonOk(img.full_raw);
    }
    return jsonFail(404, 'Imagen no encontrada');
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
