import { NextRequest } from 'next/server';
import { CAMPOS_BANDEJA, conBandejas } from '@/lib/bandejas-srv';
import { tipoVisible } from '@/lib/dominio';
import { handle } from '@/lib/srv';
import type { FilaCausa } from '@/lib/bandejas';

/** Contadores de las bandejas de trabajo (menú lateral y resumen al entrar), según el alcance del usuario. */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db, user }) => {
    const { data, error } = await db.from('infraccion').select(CAMPOS_BANDEJA).not('estado_faltas', 'in', '("Borrador","Anulada")').order('id', { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as unknown as (FilaCausa & { infraccion_tipo_id: number })[]).filter((f) => tipoVisible(user, f.infraccion_tipo_id));
    const { conteos } = await conBandejas(db, filas);
    return { conteos };
  }, 'verCausas');
}
