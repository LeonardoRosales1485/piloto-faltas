import { AsyncLocalStorage } from 'node:async_hooks';
import { permisosEfectivos, registrarResolverPermisos, type Overrides, type Permiso } from './dominio';
import type { createServerClient } from './supabase-server';

type Db = ReturnType<typeof createServerClient>;

/** Permisos efectivos del usuario de la request en curso (servidor). */
export const permisosActuales = new AsyncLocalStorage<{ rol: string; permisos: string[] }>();
registrarResolverPermisos(() => permisosActuales.getStore() ?? null);

const aOverrides = (filas: { permiso: string; permitido: boolean }[] | null) =>
  Object.fromEntries((filas ?? []).map((f) => [f.permiso, Boolean(f.permitido)])) as Overrides;

/** Calcula los permisos efectivos (usuario > tipo de usuario > por defecto). Si las tablas no existen, usa los por defecto. */
export async function cargarPermisos(db: Db, username: string, rol: string): Promise<Permiso[]> {
  const [r, u] = await Promise.all([
    db.from('permiso_rol').select('permiso, permitido').eq('rol', rol),
    db.from('permiso_usuario').select('permiso, permitido').eq('username', username),
  ]);
  return permisosEfectivos(rol, r.error ? {} : aOverrides(r.data as never), u.error ? {} : aOverrides(u.data as never));
}
