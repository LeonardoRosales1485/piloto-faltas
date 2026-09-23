import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';
import type { ConfiguracionRow } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const supabase = createServerClient();
    const { data, error } = await supabase.from('configuracion').select('*').order('id', { ascending: true });
    if (error) return jsonFail(500, error.message);
    return jsonOk(
      ((data ?? []) as ConfiguracionRow[]).map((c) => ({
        id: c.id,
        llave: c.llave,
        valor: c.valor,
        publico: c.publico,
      })),
    );
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
