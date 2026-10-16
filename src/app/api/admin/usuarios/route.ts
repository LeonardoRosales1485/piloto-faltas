import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { ROL_ETIQUETA } from '@/lib/dominio';
import { check, handle } from '@/lib/srv';

const CAMPOS = 'uuid, username, nombre, apellido, email, sector, legajo, modulos_acta, rol, activo, date_created, date_updated';

/** Listado de usuarios del back office (sin hashes). */
export async function GET(req: NextRequest) {
  return handle(req, async ({ db }) => {
    const { data, error } = await db.from('usuario').select(CAMPOS).order('username');
    if (error) throw new Error(error.message);
    return data ?? [];
  }, 'parametrizar');
}

type Body = {
  uuid?: string;
  username?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  sector?: string;
  legajo?: string;
  modulos_acta?: string;
  rol?: string;
  password?: string;
  activo?: boolean;
};

/** Alta (sin uuid) o modificación / baja lógica (con uuid). Las bajas no borran: el usuario queda inactivo. */
export async function POST(req: NextRequest) {
  const b = (await req.json()) as Body;
  return handle(req, async ({ db, user }) => {
    const ahora = Date.now();
    const username = (b.username ?? '').trim().toLowerCase();
    const datos = {
      nombre: (b.nombre ?? '').trim(),
      apellido: (b.apellido ?? '').trim(),
      email: (b.email ?? '').trim() || null,
      sector: (b.sector ?? '').trim() || null,
      legajo: (b.legajo ?? '').trim() || null,
      // Inspector: tipos que puede labrar (al menos uno). Directora, Responsable y Agente: tipos que gestiona (vacío = rol por defecto).
      modulos_acta: ['Inspector', 'Directora', 'Responsable', 'Usuario'].includes(String(b.rol))
        ? (String(b.modulos_acta ?? '').split(',').map((x) => x.trim()).filter((x) => ['multas', 'contravenciones', 'sustancias'].includes(x)).join(',') || (b.rol === 'Inspector' ? 'multas' : null))
        : null,
      rol: b.rol ?? '',
    };
    check(datos.nombre && datos.apellido, 'Nombre y apellido son obligatorios');
    check(Object.keys(ROL_ETIQUETA).includes(datos.rol), 'Rol inválido');
    check(!datos.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email), 'Correo inválido');
    const pass = b.password ?? '';
    check(!pass || pass.length >= 6, 'La contraseña debe tener al menos 6 caracteres');

    if (!b.uuid) {
      check(/^[a-z0-9._-]{3,40}$/.test(username), 'Usuario inválido: 3 a 40 caracteres (letras, números, punto, guion)');
      check(pass, 'La contraseña es obligatoria para el alta');
      const { data: existe } = await db.from('usuario').select('id').eq('username', username).maybeSingle();
      check(!existe, 'Ya existe un usuario con ese nombre', 409);
      const { error } = await db.from('usuario').insert({ uuid: crypto.randomUUID(), username, password_hash: bcrypt.hashSync(pass, 10), ...datos, activo: true, date_created: ahora });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { data: actual } = await db.from('usuario').select('username, rol').eq('uuid', b.uuid).maybeSingle();
    check(actual, 'Usuario no encontrado', 404);
    const propio = actual!.username === user.username;
    check(!(propio && b.activo === false), 'No puede darse de baja a sí mismo');
    check(!(propio && datos.rol !== actual!.rol), 'No puede cambiar su propio rol');
    const cambios: Record<string, unknown> = { ...datos, date_updated: ahora };
    if (typeof b.activo === 'boolean') cambios.activo = b.activo;
    if (pass) cambios.password_hash = bcrypt.hashSync(pass, 10);
    const { error } = await db.from('usuario').update(cambios).eq('uuid', b.uuid);
    if (error) throw new Error(error.message);
    return { ok: true };
  }, 'parametrizar');
}
