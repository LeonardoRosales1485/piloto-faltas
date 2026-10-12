import { NextRequest } from 'next/server';
import { firmarActa } from '@/lib/acta-srv';
import { notificarElectronicaSiCorresponde } from '@/lib/causa-srv';
import { causaPorUuid, handle } from '@/lib/srv';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { uuid: string; firmaInfractor?: string | null };
  return handle(req, async ({ user, db }) => {
    const r = await firmarActa(db, user, body.uuid, body.firmaInfractor ?? null);
    // Si el infractor ya constituyó domicilio electrónico (DD.JJ.), el acta se notifica sola por correo.
    const notificada = await notificarElectronicaSiCorresponde(db, await causaPorUuid(db, body.uuid));
    // Devuelve el acta final para la pantalla de confirmación del inspector (después ya no puede abrirla).
    const acta = await loadInfraccionByUuid(body.uuid);
    return { ...r, notificada, acta };
  }, 'labrar');
}
