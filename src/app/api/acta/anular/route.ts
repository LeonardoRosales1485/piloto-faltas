import { NextRequest } from 'next/server';
import { causaPorUuid, check, handle, historial, nombreUsuario } from '@/lib/srv';

/** Descarta un borrador: el número queda anulado con motivo y nunca se reutiliza (AD-06). */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { uuid: string; motivo: string };
  return handle(req, async ({ user, db }) => {
    const c = await causaPorUuid(db, body.uuid);
    check(c.estado_faltas === 'Borrador', 'Solo se puede descartar un acta sin firmar', 409);
    check(body.motivo?.trim(), 'Indique el motivo');
    await db.from('infraccion').update({ estado_faltas: 'Anulada', anulada_motivo: body.motivo.trim() }).eq('id', c.id);
    await historial(db, c.id, nombreUsuario(user), 'Número anulado', body.motivo.trim(), { anterior: 'Borrador', nuevo: 'Anulada' });
    return { ok: true };
  }, 'labrar');
}
