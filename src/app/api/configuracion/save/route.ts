import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';
import type { ConfiguracionItem, ConfiguracionRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const item = (await req.json()) as ConfiguracionItem;
    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from('configuracion')
      .select('*')
      .eq('llave', item.llave)
      .maybeSingle();

    const payload = {
      llave: item.llave,
      valor: item.valor,
      publico: item.publico ?? '1',
    };

    if (existing) {
      const { data, error } = await supabase
        .from('configuracion')
        .update(payload)
        .eq('llave', item.llave)
        .select('*')
        .single();
      if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
      const c = data as ConfiguracionRow;
      return jsonOk({ id: c.id, llave: c.llave, valor: c.valor, publico: c.publico });
    }

    const { data, error } = await supabase.from('configuracion').insert(payload).select('*').single();
    if (error || !data) return jsonFail(500, error?.message ?? 'No se pudo guardar');
    const c = data as ConfiguracionRow;
    return jsonOk({ id: c.id, llave: c.llave, valor: c.valor, publico: c.publico });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
