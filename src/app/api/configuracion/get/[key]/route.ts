import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';
import type { ConfiguracionRow } from '@/lib/types';

type Ctx = { params: Promise<{ key: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { key } = await ctx.params;
    const supabase = createServerClient();
    const { data, error } = await supabase.from('configuracion').select('*').eq('llave', key).maybeSingle();
    if (error || !data) return jsonFail(404, 'Configuración no encontrada');
    const c = data as ConfiguracionRow;
    return jsonOk({ id: c.id, llave: c.llave, valor: c.valor, publico: c.publico });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
