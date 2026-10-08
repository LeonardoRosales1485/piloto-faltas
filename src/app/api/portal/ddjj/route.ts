import { NextRequest } from 'next/server';
import { handlePortal, perfilPublico } from '@/lib/portal-srv';
import { check, enviarCorreo } from '@/lib/srv';

/** Constitución de domicilio electrónico por declaración jurada (PI-05, P-05). */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as { acepto: boolean };
  return handlePortal(req, async ({ ciu, db }) => {
    check(b.acepto === true, 'Debe aceptar la declaración jurada');
    const ahora = Date.now();
    await db.from('ciudadano').update({ domicilio_electronico: 1, ddjj_at: ahora }).eq('id', ciu.id);
    await enviarCorreo(db, ciu.email, 'Domicilio electrónico constituido', 'Desde ahora las notificaciones de la Dirección de Faltas se le enviarán a esta casilla y se tendrán por válidas.');
    return perfilPublico({ ...ciu, domicilio_electronico: 1, ddjj_at: ahora });
  });
}
