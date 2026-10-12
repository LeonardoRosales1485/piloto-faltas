import { NextRequest } from 'next/server';
import { PERMISOS, ROL_ETIQUETA, type Permiso } from '@/lib/dominio';
import { check, handle } from '@/lib/srv';

/** Matriz de permisos: valores por defecto, excepciones por tipo de usuario y por usuario. */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const [r, u] = await Promise.all([db.from('permiso_rol').select('rol, permiso, permitido'), db.from('permiso_usuario').select('username, permiso, permitido')]);
    return { defaults: PERMISOS, roles: r.data ?? [], usuarios: u.data ?? [] };
  }, 'parametrizar');
}

type Body = { tipo: 'rol' | 'usuario'; clave: string; permiso: Permiso; valor: boolean | null };

/** Fija (true/false) o quita (null = vuelve a heredar) un permiso de un tipo de usuario o de un usuario. */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    check(Object.keys(PERMISOS).includes(b.permiso), 'Permiso inválido');
    check(b.valor === null || typeof b.valor === 'boolean', 'Valor inválido');
    if (b.tipo === 'rol') {
      check(Object.keys(ROL_ETIQUETA).includes(b.clave), 'Tipo de usuario inválido');
      check(!(b.clave === 'Administrador' && b.permiso === 'parametrizar' && b.valor === false), 'El Administrador no puede perder Configuración');
      if (b.valor === null) await db.from('permiso_rol').delete().eq('rol', b.clave).eq('permiso', b.permiso);
      else await db.from('permiso_rol').upsert({ rol: b.clave, permiso: b.permiso, permitido: b.valor }, { onConflict: 'rol,permiso' });
    } else {
      const { data: u } = await db.from('usuario').select('username, rol').eq('username', b.clave).maybeSingle();
      check(u, 'Usuario inexistente', 404);
      check(!(b.clave === user.username && b.permiso === 'parametrizar' && b.valor === false), 'No puede quitarse a sí mismo el acceso a Configuración');
      if (b.valor === null) await db.from('permiso_usuario').delete().eq('username', b.clave).eq('permiso', b.permiso);
      else await db.from('permiso_usuario').upsert({ username: b.clave, permiso: b.permiso, permitido: b.valor }, { onConflict: 'username,permiso' });
    }
    return { ok: true };
  }, 'parametrizar');
}
