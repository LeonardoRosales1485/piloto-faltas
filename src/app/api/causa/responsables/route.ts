import { NextRequest } from 'next/server';
import { handle, nombreUsuario } from '@/lib/srv';

/** Usuarios del back office que pueden quedar como responsables de una causa (sin inspectores ni Intendente). */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const { data } = await db.from('usuario').select('nombre, apellido, username, rol, activo').order('apellido');
    return ((data ?? []) as { nombre: string; apellido: string; username: string; rol: string; activo: boolean }[])
      .filter((u) => u.activo !== false && !['Inspector', 'Intendente'].includes(u.rol))
      .map((u) => ({ nombre: nombreUsuario(u), rol: u.rol }));
  }, 'verCausas');
}
