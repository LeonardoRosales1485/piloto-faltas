import { NextRequest } from 'next/server';
import { check, handle } from '@/lib/srv';

/**
 * PIN del inspector (reunión 27/10): para salir de la pantalla de firma cuando el equipo lo tiene el infractor.
 * Prototipo: por defecto 1234 (sql/034); se cambia en «Inspectores». Sin la columna, vale 1234.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { pin?: string };
  return handle(req, async ({ user, db }) => {
    const { data, error } = await db.from('usuario').select('pin').eq('username', user.username).maybeSingle();
    const pin = !error && data && (data as { pin?: string | null }).pin ? String((data as { pin: string }).pin) : '1234';
    check(String(body.pin ?? '').trim() === pin, 'PIN incorrecto', 400);
    return { ok: true };
  });
}
