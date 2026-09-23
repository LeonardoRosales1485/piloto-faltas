import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';

type Ctx = { params: Promise<{ pantalla: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { pantalla } = await ctx.params;
    const tipo = pantalla === '2' ? 'contravenciones' : 'multas';
    const supabase = createServerClient();
    const { count, error } = await supabase
      .from('infraccion')
      .select('*', { count: 'exact', head: true })
      .eq('infraccion_tipo_nombre', tipo);
    if (error) return jsonFail(500, error.message);
    return jsonOk({ total: count ?? 0, pantalla: tipo });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
