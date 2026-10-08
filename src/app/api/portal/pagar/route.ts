import { NextRequest } from 'next/server';
import { handlePortal, nombreCiudadano } from '@/lib/portal-srv';
import { check, historial } from '@/lib/srv';

/** Pago simulado de la boleta (Malvinas 2000): queda «a verificar» hasta que Faltas lo confirma (SF-56). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as { boletaUuid: string };
  return handlePortal(req, async ({ ciu, db }) => {
    const { data } = await db.from('boleta').select('id, infraccion_id, estado, numero').eq('uuid', b.boletaUuid).maybeSingle();
    const bol = data as { id: number; infraccion_id: number; estado: string; numero: string } | null;
    check(bol && bol.estado === 'emitida', 'La boleta no está disponible para pagar');
    await db.from('boleta').update({ estado: 'a_verificar', pagado_at: Date.now() }).eq('id', bol!.id);
    await historial(db, bol!.infraccion_id, `${nombreCiudadano(ciu)} (portal)`, 'Pago informado', `Boleta ${bol!.numero}: queda a verificar hasta la acreditación.`);
    return { ok: true };
  });
}
