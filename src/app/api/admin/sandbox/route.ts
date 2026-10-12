import { NextRequest } from 'next/server';
import { check, handle, nombreUsuario } from '@/lib/srv';

/** Estado de los snapshots de datos dummy (BOD y la «foto» guardada). */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const { data, error } = await db.rpc('sandbox_info');
    if (error) throw new Error(error.message);
    return data ?? {};
  }, 'sandbox');
}

type Body = { accion: 'borrar' | 'usuarios' | 'cargar' | 'guardar_foto'; origen?: 'default' | 'foto'; confirmacion?: string };

const PALABRA: Record<Body['accion'], string> = { borrar: 'BORRAR', usuarios: 'USUARIOS', cargar: 'CARGAR', guardar_foto: 'GUARDAR' };

/** Acciones sandbox. Cada una corre en la base como una única transacción. */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    check(PALABRA[b.accion], 'Acción inválida');
    check((b.confirmacion ?? '').trim().toUpperCase() === PALABRA[b.accion], `Escriba ${PALABRA[b.accion]} para confirmar`);
    const llamada =
      b.accion === 'borrar' ? db.rpc('sandbox_borrar')
        : b.accion === 'usuarios' ? db.rpc('sandbox_resetear_usuarios')
          : b.accion === 'guardar_foto' ? db.rpc('sandbox_capturar', { p_nombre: 'foto', p_usuario: nombreUsuario(user) })
            : db.rpc('sandbox_cargar', { p_nombre: b.origen === 'foto' ? 'foto' : 'default' });
    const { data, error } = await llamada;
    if (error) throw new Error(error.message);
    console.info(`[sandbox] ${user.username} ejecutó ${b.accion}${b.origen ? ` (${b.origen})` : ''}`);
    return { resultado: data };
  }, 'sandbox');
}
