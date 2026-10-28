import { NextRequest } from 'next/server';
import { loadInfraccionByUuid } from '@/lib/load-infraccion';
import { check, handle } from '@/lib/srv';

/**
 * Portal de inspectores: datos del acta firmada para reimprimir sus tickets (el del infractor y, si hubo retención,
 * el del inspector). El inspector solo puede pedir las actas que labró él. Es el acta tal como se firmó (sin subsanar).
 */
export async function GET(req: NextRequest) {
  const uuid = req.nextUrl.searchParams.get('uuid') || '';
  return handle(req, async ({ user }) => {
    const acta = await loadInfraccionByUuid(uuid);
    check(acta && acta.estadoFaltas !== 'Borrador' && acta.estadoFaltas !== 'Anulada', 'Acta no disponible', 404);
    check(user.rol !== 'Inspector' || acta!.inspectorUsername === user.username, 'Acta no disponible', 404);
    // Solo lo que lleva el ticket: sin firma del infractor ni estado de la causa.
    const a = acta as unknown as Record<string, unknown>;
    delete a.firmaInfractor;
    delete a.estadoFaltas;
    return a;
  }, 'portalInspectores');
}
