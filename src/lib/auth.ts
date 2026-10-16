import { modulosConPermisos, modulosDe, tiposPermitidos } from './dominio';
import { NextRequest } from 'next/server';
import { subjectFromToken } from './jwt';
import { cargarAcceso, permisosActuales } from './permisos-srv';
import { createServerClient } from './supabase-server';
import type { Usuario, UsuarioRow } from './types';

export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireUser(req: NextRequest): Promise<UsuarioRow> {
  const token = bearerToken(req);
  if (!token) {
    throw Object.assign(new Error('Sin sesión'), { status: 401 });
  }
  let username: string;
  try {
    username = await subjectFromToken(token);
  } catch {
    throw Object.assign(new Error('Token inválido'), { status: 401 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error || !data || (data as UsuarioRow).activo === false) {
    throw Object.assign(new Error('Sin sesión'), { status: 401 });
  }
  const user = data as UsuarioRow;
  const acceso = await cargarAcceso(supabase, user.username, user.rol);
  user.permisos = acceso.permisos;
  user.modulosEfectivos = modulosConPermisos(user, acceso.permisos, acceso.delUsuario);
  // El resto de la request (puede(), handle()) usa estos permisos efectivos.
  permisosActuales.enterWith({ rol: user.rol, permisos: user.permisos });
  return user;
}

export function toUsuarioDto(row: UsuarioRow, token?: string | null): Usuario {
  return {
    username: row.username,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email ?? '',
    sector: row.sector ?? '',
    modulosActa: modulosDe(row),
    modulosEfectivos: modulosDe(row),
    tiposActa: tiposPermitidos(row),
    rol: row.rol,
    permisos: row.permisos ?? [],
    ...(token ? { token } : {}),
  };
}
