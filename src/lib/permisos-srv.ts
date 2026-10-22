import { AsyncLocalStorage } from 'node:async_hooks';
import { FUNCIONES_OPCIONALES, modulosConPermisos, SOLO_TRANSITO, permisosEfectivos, registrarResolverPermisos, tiposPermitidos, type Overrides, type Permiso } from './dominio';
import type { UsuarioRow } from './types';
import type { createServerClient } from './supabase-server';

type Db = ReturnType<typeof createServerClient>;

/** Permisos efectivos del usuario de la request en curso (servidor). */
export const permisosActuales = new AsyncLocalStorage<{ rol: string; permisos: string[] }>();
registrarResolverPermisos(() => permisosActuales.getStore() ?? null);

const aOverrides = (filas: { permiso: string; permitido: boolean }[] | null) =>
  Object.fromEntries((filas ?? []).map((f) => [f.permiso, Boolean(f.permitido)])) as Overrides;

/** Permisos efectivos (usuario > tipo de usuario > por defecto) y las excepciones propias del usuario. */
export async function cargarAcceso(db: Db, username: string, rol: string): Promise<{ permisos: Permiso[]; delUsuario: Overrides; soloTransito: boolean }> {
  const [r, u, f] = await Promise.all([
    db.from('permiso_rol').select('permiso, permitido').eq('rol', rol),
    db.from('permiso_usuario').select('permiso, permitido').eq('username', username),
    db.from('configuracion').select('llave, valor').in('llave', [...FUNCIONES_OPCIONALES.map((x) => x.llave), SOLO_TRANSITO]),
  ]);
  const delUsuario = u.error ? {} : aOverrides(u.data as never);
  // Funciones opcionales apagadas (por defecto): nadie tiene su permiso, así se ocultan menú, pantalla y API.
  const activas = new Set(((f.data ?? []) as { llave: string; valor: string }[]).filter((x) => String(x.valor) === '1').map((x) => x.llave));
  const apagados = new Set<string>(FUNCIONES_OPCIONALES.filter((x) => !activas.has(x.llave)).map((x) => x.permiso));
  const permisos = permisosEfectivos(rol, r.error ? {} : aOverrides(r.data as never), delUsuario).filter((p) => !apagados.has(p));
  return { permisos, delUsuario, soloTransito: activas.has(SOLO_TRANSITO) };
}

/**
 * Completa el usuario con sus permisos efectivos y los tipos de acta que labra y gestiona. Con «Solo Tránsito»
 * activo, nadie labra ni ve actas de contravención o sustancias (sin borrar nada: se apaga y vuelve todo).
 */
export function aplicarAcceso(user: UsuarioRow, acceso: Awaited<ReturnType<typeof cargarAcceso>>) {
  user.permisos = acceso.permisos;
  user.modulosEfectivos = modulosConPermisos(user, acceso.permisos, acceso.delUsuario);
  if (!acceso.soloTransito) return;
  user.modulosEfectivos = user.modulosEfectivos.filter((m) => m === 'multas');
  const alcance = tiposPermitidos(user);
  // [0]: ningún tipo (un usuario solo de contravenciones o sustancias queda sin causas a la vista).
  (user as UsuarioRow & { tiposActa?: number[] }).tiposActa = !alcance || alcance.includes(1) ? [1] : [0];
}

/** Calcula los permisos efectivos (usuario > tipo de usuario > por defecto). Si las tablas no existen, usa los por defecto. */
export async function cargarPermisos(db: Db, username: string, rol: string): Promise<Permiso[]> {
  return (await cargarAcceso(db, username, rol)).permisos;
}
