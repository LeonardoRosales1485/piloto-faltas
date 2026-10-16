import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { jsonFail, jsonOk } from '@/lib/http-data';
import { createServerClient } from '@/lib/supabase-server';
import { puede, tipoVisible } from '@/lib/dominio';

type Ctx = { params: Promise<{ uuid: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!puede(user.rol, 'ordenanzas')) return jsonFail(403, 'No tiene permiso para modificar ordenanzas');
    const { uuid } = await ctx.params;
    const supabase = createServerClient();
    const { data } = await supabase.from('ley').select('id, infraccion_tipo_id, nombre, articulo').eq('uuid', uuid).maybeSingle();
    if (!data) return jsonFail(404, 'Ley no encontrada');
    if (!tipoVisible(user, Number(data.infraccion_tipo_id))) return jsonFail(403, 'No puede modificar ordenanzas de este tipo de acta');
    console.info(`[ordenanzas] ${user.username} eliminó ${data.nombre} ${data.articulo}`);
    const { error } = await supabase.from('ley').delete().eq('uuid', uuid);
    if (error) return jsonFail(500, error.message);
    return jsonOk(null);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    const msg = e instanceof Error ? e.message : 'Error';
    return jsonFail(status, msg);
  }
}
